import {
  abs,
  argDeg,
  complex,
  fromPolar,
  normalizeDeg,
} from './complex';
import type {
  AnalysisOutcome,
  BranchCurrents,
  CircuitAnalysis,
  CircuitState,
  CompensationResult,
  ComponentVoltages,
  ImpedanceInfo,
  NumericCircuitInput,
  Phasor,
  PhasorSet,
  RawCircuitInputs,
  ResonanceInfo,
  SweepPoint,
  ValidationIssue,
} from './types';
import { parseReactance, parseSI } from './units';

const SOURCE_CONSISTENCY_TOLERANCE = 0.02;
const RESONANCE_BAND = 0.005;
const UNITY_PHASE_DEG = 1e-3;

function issue(
  issues: ValidationIssue[],
  field: ValidationIssue['field'],
  severity: ValidationIssue['severity'],
  message: string,
): void {
  issues.push({ field, severity, message });
}

function hasErrors(issues: ValidationIssue[]): boolean {
  return issues.some((item) => item.severity === 'error');
}

function relativeDifference(a: number, b: number): number {
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  if (a === 0 && b === 0) return 0;
  return Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));
}

/**
 * At an analytically exact resonance, X_L and X_C can differ by a few ulps
 * because each is derived with a different floating-point operation. Treat
 * values that agree within round-off as identical so the net reactance,
 * phase, and reactive power are reported as exact zero.
 */
function collapseRoundOffPair(
  a: number | null,
  b: number | null,
): [number | null, number | null] {
  if (a === null || b === null || a === b) return [a, b];
  const scale = Math.max(Math.abs(a), Math.abs(b));
  if (scale > 0 && Math.abs(a - b) <= scale * 1e-12) {
    const common = (a + b) / 2;
    return [common, common];
  }
  return [a, b];
}

function makePhasor(
  key: string,
  label: string,
  symbol: string,
  magnitude: number,
  angleDeg: number,
  color: Phasor['color'],
): Phasor {
  const angleRad = (angleDeg * Math.PI) / 180;
  const vector = fromPolar(magnitude, angleRad);
  return {
    key,
    label,
    symbol,
    re: vector.re,
    im: vector.im,
    magnitude,
    angleDeg: normalizeDeg(angleDeg),
    color,
  };
}

function buildPhasors(
  topology: RawCircuitInputs['topology'],
  values: {
    u: number;
    i: number;
    phiDeg: number;
    r: number | null;
    xl: number | null;
    xc: number | null;
    hasR: boolean;
  },
): PhasorSet {
  const v = values;

  if (topology === 'series') {
    const vectors: Phasor[] = [];
    const currentAngle = -v.phiDeg;

    if (v.hasR) {
      vectors.push(makePhasor('ur', 'Resistor voltage', 'U_R', v.i * (v.r ?? 0), currentAngle, 'resistance'));
    }
    if (v.xl !== null) {
      vectors.push(makePhasor('ul', 'Inductor voltage', 'U_L', v.i * v.xl, currentAngle + 90, 'inductance'));
    }
    if (v.xc !== null) {
      vectors.push(makePhasor('uc', 'Capacitor voltage', 'U_C', v.i * v.xc, currentAngle - 90, 'capacitance'));
    }

    return {
      kind: 'voltage',
      unit: 'V',
      vectors,
      total: makePhasor('u', 'Source voltage', 'U', v.u, 0, 'total'),
    };
  }

  const vectors: Phasor[] = [];
  if (v.hasR && v.r && v.r > 0) {
    vectors.push(makePhasor('ir', 'Resistor current', 'I_R', v.u / v.r, 0, 'resistance'));
  }
  if (v.xl !== null && v.xl > 0) {
    vectors.push(makePhasor('il', 'Inductor current', 'I_L', v.u / v.xl, -90, 'inductance'));
  }
  if (v.xc !== null && v.xc > 0) {
    vectors.push(makePhasor('ic', 'Capacitor current', 'I_C', v.u / v.xc, 90, 'capacitance'));
  }

  const totalRe = v.hasR && v.r ? v.u / v.r : 0;
  const totalIm =
    (v.xc !== null && v.xc > 0 ? v.u / v.xc : 0) - (v.xl !== null && v.xl > 0 ? v.u / v.xl : 0);
  const totalAngle = Math.atan2(totalIm, totalRe) * (180 / Math.PI);

  return {
    kind: 'current',
    unit: 'A',
    vectors,
    total: makePhasor('i', 'Source current', 'I', v.i, totalAngle, 'total'),
  };
}

function computeResonance(
  topology: RawCircuitInputs['topology'],
  frequency: number,
  inductance: number | null,
  capacitance: number | null,
  resistance: number | null,
): ResonanceInfo | null {
  if (inductance === null || capacitance === null || inductance <= 0 || capacitance <= 0) {
    return null;
  }

  const resonantFrequency = 1 / (2 * Math.PI * Math.sqrt(inductance * capacitance));
  const characteristicImpedance = Math.sqrt(inductance / capacitance);

  let qFactor: number;
  if (topology === 'series') {
    qFactor = resistance !== null && resistance > 0 ? characteristicImpedance / resistance : Infinity;
  } else {
    qFactor = resistance !== null && resistance > 0
      ? resistance / characteristicImpedance
      : Infinity;
  }

  const bandwidth = Number.isFinite(qFactor) && qFactor > 0 ? resonantFrequency / qFactor : 0;

  return {
    frequency: resonantFrequency,
    qFactor,
    bandwidth,
    characteristicImpedance,
    frequencyRatio: frequency / resonantFrequency,
    dampingRatio: Number.isFinite(qFactor) && qFactor > 0 ? 1 / (2 * qFactor) : 0,
  };
}

function determineState(
  topology: RawCircuitInputs['topology'],
  phiDeg: number,
  xl: number | null,
  xc: number | null,
): CircuitState {
  if (xl !== null && xc !== null) {
    const largest = Math.max(xl, xc);
    if (largest > 0 && Math.abs(xl - xc) / largest <= RESONANCE_BAND) {
      return 'resonant';
    }
  }

  if (xl === null && xc === null) return 'resistive';

  // The impedance phase is positive for an inductive network in both
  // topologies, including a parallel network where X_L < X_C.
  if (Math.abs(phiDeg) < 1e-9) {
    return topology === 'parallel' ? 'resistive' : 'resistive';
  }
  return phiDeg > 0 ? 'inductive' : 'capacitive';
}

/** Pure numeric analysis, useful for unit tests and programmatic use. */
export function analyzeCircuit(input: NumericCircuitInput): AnalysisOutcome {
  const issues: ValidationIssue[] = [];
  const { topology, frequency, resistance, inductance, capacitance, voltage, current } = input;

  if (frequency === null) {
    issue(issues, 'frequency', 'error', 'Enter the AC frequency.');
  } else if (frequency <= 0) {
    issue(issues, 'frequency', 'error', 'Frequency must be greater than 0 Hz for AC analysis.');
  }

  if (resistance !== null && resistance < 0) {
    issue(issues, 'resistance', 'error', 'Resistance cannot be negative.');
  }
  if (inductance !== null && inductance <= 0) {
    issue(issues, 'inductance', 'error', 'Inductance must be greater than zero.');
  }
  if (capacitance !== null && capacitance <= 0) {
    issue(issues, 'capacitance', 'error', 'Capacitance must be greater than zero.');
  }
  if (voltage !== null && voltage <= 0) {
    issue(issues, 'voltage', 'error', 'Source voltage must be greater than zero.');
  }
  if (current !== null && current <= 0) {
    issue(issues, 'current', 'error', 'Source current must be greater than zero.');
  }
  if (topology === 'parallel' && resistance === 0) {
    issue(issues, 'resistance', 'error', 'In a parallel circuit R = 0 Ω would short the source. Enter a positive resistance or leave R empty.');
  }

  const hasAnyComponent =
    resistance !== null ||
    inductance !== null ||
    capacitance !== null ||
    input.xlOverride !== null ||
    input.xcOverride !== null;

  if (!hasAnyComponent) {
    if (voltage !== null && current !== null && input.zKnown === null) {
      issue(
        issues,
        'circuit',
        'error',
        'Both U and I are supplied, but the impedance is unknown. Add R, L or C, or provide a known |Z|.',
      );
    } else {
      issue(issues, 'circuit', 'error', 'Add at least one component (R, L or C).');
    }
  }

  if (voltage === null && current === null) {
    issue(issues, 'circuit', 'error', 'Enter a source voltage U or a source current I.');
  }

  if (frequency === null || frequency <= 0) {
    return { analysis: null, issues };
  }

  const omega = 2 * Math.PI * frequency;

  const xlFromInductance = inductance !== null ? omega * inductance : null;
  const xcFromCapacitance = capacitance !== null ? 1 / (omega * capacitance) : null;
  const [xl, xc] = collapseRoundOffPair(
    input.xlOverride ?? xlFromInductance,
    input.xcOverride ?? xcFromCapacitance,
  );

  if (input.xlOverride !== null && xlFromInductance !== null) {
    const difference = relativeDifference(input.xlOverride, xlFromInductance);
    if (difference > SOURCE_CONSISTENCY_TOLERANCE) {
      issue(
        issues,
        'xlOverride',
        'warning',
        `The L value implies X_L = ${xlFromInductance.toPrecision(6)} Ω, but the direct X_L override is ${input.xlOverride.toPrecision(6)} Ω. The override is used and L is re-derived for resonance.`,
      );
    }
  }

  if (input.xcOverride !== null && xcFromCapacitance !== null) {
    const difference = relativeDifference(input.xcOverride, xcFromCapacitance);
    if (difference > SOURCE_CONSISTENCY_TOLERANCE) {
      issue(
        issues,
        'xcOverride',
        'warning',
        `The C value implies X_C = ${xcFromCapacitance.toPrecision(6)} Ω, but the direct X_C override is ${input.xcOverride.toPrecision(6)} Ω. The override is used and C is re-derived for resonance.`,
      );
    }
  }

  if (xl === null && xc === null && resistance === null) {
    issue(issues, 'circuit', 'error', 'The selected components do not define a complete circuit.');
    return { analysis: null, issues };
  }

  const hasR = resistance !== null;
  const rSeries = resistance ?? 0;

  let z: ImpedanceInfo;

  if (topology === 'series') {
    const zRe = rSeries;
    const zIm = (xl ?? 0) - (xc ?? 0);
    const zMag = Math.hypot(zRe, zIm);

    if (zMag === 0) {
      issue(
        issues,
        'circuit',
        'error',
        'The series impedance is 0 Ω. This ideal LC resonance would draw infinite current — add a resistance or change the frequency.',
      );
      return { analysis: null, issues };
    }

    z = {
      re: zRe,
      im: zIm,
      magnitude: zMag,
      angleDeg: (Math.atan2(zIm, zRe) * 180) / Math.PI,
    };
  } else {
    const conductance = resistance !== null && resistance > 0 ? 1 / resistance : 0;
    const susceptanceL = xl !== null && xl > 0 ? 1 / xl : 0;
    const susceptanceC = xc !== null && xc > 0 ? 1 / xc : 0;
    const susceptance = susceptanceC - susceptanceL;
    const admittanceMagnitude = Math.hypot(conductance, susceptance);
    const phase = admittanceMagnitude > 0 ? Math.atan2(susceptanceL - susceptanceC, conductance) : 0;

    if (admittanceMagnitude === 0) {
      z = { re: Infinity, im: 0, magnitude: Infinity, angleDeg: 0 };
    } else {
      const zMag = 1 / admittanceMagnitude;
      z = {
        re: conductance / (admittanceMagnitude * admittanceMagnitude),
        im: -susceptance / (admittanceMagnitude * admittanceMagnitude),
        magnitude: zMag,
        angleDeg: (phase * 180) / Math.PI,
      };
    }
  }

  // U and I may both be entered, but only if they describe the same circuit.
  if (voltage !== null && current !== null) {
    if (!Number.isFinite(z.magnitude)) {
      issue(
        issues,
        'current',
        'error',
        'Both U and I are supplied, but this ideal parallel circuit has infinite impedance at resonance. Clear one source value.',
      );
    } else {
      const impliedImpedance = voltage / current;
      const difference = relativeDifference(impliedImpedance, z.magnitude);
      if (difference > SOURCE_CONSISTENCY_TOLERANCE) {
        issue(
          issues,
          'current',
          'error',
          `U and I contradict the circuit impedance: U/I = ${impliedImpedance.toPrecision(6)} Ω, but |Z| = ${z.magnitude.toPrecision(6)} Ω. Clear either U or I, or adjust the components.`,
        );
      }
    }
  }

  if (input.zKnown !== null && Number.isFinite(z.magnitude)) {
    const difference = relativeDifference(input.zKnown, z.magnitude);
    if (difference > SOURCE_CONSISTENCY_TOLERANCE) {
      issue(
        issues,
        'zKnown',
        'warning',
        `Known |Z| = ${input.zKnown.toPrecision(6)} Ω differs from the calculated |Z| = ${z.magnitude.toPrecision(6)} Ω by ${(difference * 100).toFixed(1)}%.`,
      );
    }
  }

  if (hasErrors(issues)) {
    return { analysis: null, issues };
  }

  let sourceVoltage: number;
  let sourceCurrent: number;
  let drive: 'voltage' | 'current' | 'voltage+current';

  if (voltage !== null) {
    sourceVoltage = voltage;
    sourceCurrent = Number.isFinite(z.magnitude) ? voltage / z.magnitude : 0;
    drive = current !== null ? 'voltage+current' : 'voltage';
  } else {
    sourceCurrent = current as number;
    if (!Number.isFinite(z.magnitude)) {
      issue(
        issues,
        'current',
        'error',
        'An ideal parallel resonant tank has infinite impedance. A current source would require infinite voltage — use a voltage source or add R.',
      );
      return { analysis: null, issues };
    }
    sourceVoltage = sourceCurrent * z.magnitude;
    drive = 'current';
  }

  if (!Number.isFinite(sourceVoltage) || !Number.isFinite(sourceCurrent)) {
    issue(issues, 'circuit', 'error', 'The source values produce a non-finite result. Check the component values.');
    return { analysis: null, issues };
  }

  const phiDeg = z.angleDeg;

  const notes: string[] = [];
  if (drive === 'voltage+current') {
    notes.push('Both U and I were supplied and agree. The voltage source defines the operating point; I is recomputed from |Z|.');
  }
  if (drive === 'current') {
    notes.push('Only a current source was supplied, so U is derived as I × |Z|.');
  }
  if (input.xlOverride !== null) {
    notes.push('X_L is a direct reactance override; the effective L for resonance is derived from X_L.');
  }
  if (input.xcOverride !== null) {
    notes.push('X_C is a direct reactance override; the effective C for resonance is derived from X_C.');
  }

  const effectiveInductance = xl !== null && xl > 0 ? xl / omega : null;
  const effectiveCapacitance = xc !== null && xc > 0 ? 1 / (omega * xc) : null;
  const atResonance =
    xl !== null && xc !== null
      ? Math.abs(xl - xc) / Math.max(xl, xc) <= RESONANCE_BAND
      : false;

  const state = determineState(topology, phiDeg, xl, xc);

  let branchCurrents: BranchCurrents | null = null;
  let componentVoltages: ComponentVoltages | null = null;
  let activePower: number;
  let reactivePower: number;
  let apparentPower: number;

  if (topology === 'series') {
    componentVoltages = {
      r: hasR ? sourceCurrent * rSeries : null,
      l: xl !== null ? sourceCurrent * xl : null,
      c: xc !== null ? sourceCurrent * xc : null,
    };
    activePower = sourceCurrent * sourceCurrent * rSeries;
    reactivePower = sourceCurrent * sourceCurrent * ((xl ?? 0) - (xc ?? 0));
    apparentPower = sourceVoltage * sourceCurrent;

    if (!hasR) {
      notes.push('Series resistance is zero. Add R to represent conductor and inductor losses.');
    }
  } else {
    branchCurrents = {
      r: hasR && resistance! > 0 ? sourceVoltage / resistance! : null,
      l: xl !== null && xl > 0 ? sourceVoltage / xl : null,
      c: xc !== null && xc > 0 ? sourceVoltage / xc : null,
    };
    componentVoltages = {
      r: hasR ? sourceVoltage : null,
      l: xl !== null ? sourceVoltage : null,
      c: xc !== null ? sourceVoltage : null,
    };
    activePower = hasR && resistance! > 0 ? (sourceVoltage * sourceVoltage) / resistance! : 0;
    reactivePower =
      (sourceVoltage * sourceVoltage) *
      ((xl !== null && xl > 0 ? 1 / xl : 0) - (xc !== null && xc > 0 ? 1 / xc : 0));
    apparentPower = sourceVoltage * sourceCurrent;

    if (!hasR) {
      notes.push('No parallel resistance is present. At resonance this ideal tank has infinite impedance and draws no current.');
    }
  }

  if (activePower < 0) activePower = 0;
  if (apparentPower < 0) apparentPower = Math.abs(apparentPower);

  const factor =
    apparentPower > 0
      ? Math.min(1, Math.max(0, activePower / apparentPower))
      : null;
  const nature: CircuitAnalysis['powers']['nature'] =
    factor === null
      ? 'undefined'
      : Math.abs(phiDeg) < UNITY_PHASE_DEG
        ? 'unity'
        : phiDeg > 0
          ? 'lagging'
          : 'leading';

  if (Math.abs(activePower) < 1e-12 && Math.abs(reactivePower) > 1e-12) {
    notes.push('The network is purely reactive: active power P = 0 and the power factor is 0.');
  }

  if (atResonance && topology === 'parallel' && !hasR) {
    notes.push('Ideal parallel resonance: |Z| is theoretically infinite and the line current is zero.');
  }

  const resonance = computeResonance(
    topology,
    frequency,
    effectiveInductance,
    effectiveCapacitance,
    topology === 'series' ? (hasR ? rSeries : null) : resistance,
  );

  const phasors = buildPhasors(topology === 'series' ? 'series' : 'parallel', {
    u: sourceVoltage,
    i: sourceCurrent,
    phiDeg,
    r: topology === 'series' ? (hasR ? rSeries : null) : resistance,
    xl,
    xc,
    hasR,
  });

  const analysis: CircuitAnalysis = {
    topology,
    frequency,
    angularFrequency: omega,
    components: {
      resistance,
      inductance: effectiveInductance,
      capacitance: effectiveCapacitance,
      inductiveReactance: xl,
      capacitiveReactance: xc,
      inductanceFromReactance: input.xlOverride !== null,
      capacitanceFromReactance: input.xcOverride !== null,
    },
    impedance: z,
    source: {
      voltage: sourceVoltage,
      current: sourceCurrent,
      drive,
      currentAngleDeg: normalizeDeg(-phiDeg),
    },
    branchCurrents,
    componentVoltages,
    powers: {
      active: activePower,
      reactive: reactivePower,
      apparent: apparentPower,
      factor,
      phaseDeg: phiDeg,
      nature,
    },
    resonance,
    state,
    atResonance,
    phasors,
    notes,
  };

  return { analysis, issues };
}

/** Parse UI strings and run the validation + calculation pipeline. */
export function parseAndAnalyze(raw: RawCircuitInputs): AnalysisOutcome {
  const issues: ValidationIssue[] = [];
  const parseErrorFields = new Set<ValidationIssue['field']>();

  const read = (
    field: ValidationIssue['field'],
    value: string,
    quantity: Parameters<typeof parseSI>[1],
  ): number | null => {
    const result = parseSI(value, quantity);
    if (!result.ok) {
      issue(issues, field, 'error', result.error);
      parseErrorFields.add(field);
      return null;
    }
    return result.value;
  };

  const readReactance = (
    field: ValidationIssue['field'],
    value: string,
    symbol: 'L' | 'C' | 'Z',
  ): number | null => {
    const result = parseReactance(value, symbol);
    if (!result.ok) {
      issue(issues, field, 'error', result.error);
      parseErrorFields.add(field);
      return null;
    }
    return result.value;
  };

  const frequency = read('frequency', raw.frequency, 'frequency');
  const resistance = read('resistance', raw.resistance, 'resistance');
  const inductance = read('inductance', raw.inductance, 'inductance');
  const capacitance = read('capacitance', raw.capacitance, 'capacitance');
  const voltage = read('voltage', raw.voltage, 'voltage');
  const current = read('current', raw.current, 'current');
  const xlOverride = readReactance('xlOverride', raw.xlOverride, 'L');
  const xcOverride = readReactance('xcOverride', raw.xcOverride, 'C');
  const zKnown = readReactance('zKnown', raw.zKnown, 'Z');

  if (parseErrorFields.size > 0) {
    return { analysis: null, issues };
  }

  const outcome = analyzeCircuit({
    topology: raw.topology,
    frequency,
    resistance,
    inductance,
    capacitance,
    voltage,
    current,
    xlOverride,
    xcOverride,
    zKnown,
  });

  return {
    analysis: outcome.analysis,
    issues: [...issues, ...outcome.issues],
  };
}

/** Frequency sweep for the Bode-style impedance / current chart. */
export function computeSweep(
  analysis: CircuitAnalysis,
  startFrequency: number,
  endFrequency: number,
  points = 360,
): SweepPoint[] {
  if (
    !Number.isFinite(startFrequency) ||
    !Number.isFinite(endFrequency) ||
    startFrequency <= 0 ||
    endFrequency <= 0
  ) {
    return [];
  }

  const low = Math.min(startFrequency, endFrequency);
  const high = Math.max(startFrequency, endFrequency);
  if (low === high) return [];

  const { resistance, inductance, capacitance } = analysis.components;
  const r = resistance ?? 0;
  const l = inductance;
  const c = capacitance;
  const u = analysis.source.voltage;

  const result: SweepPoint[] = [];
  const logLow = Math.log10(low);
  const logHigh = Math.log10(high);
  const count = Math.max(32, Math.min(1200, Math.round(points)));

  for (let index = 0; index < count; index += 1) {
    const fraction = index / (count - 1);
    const f = 10 ** (logLow + fraction * (logHigh - logLow));
    const omega = 2 * Math.PI * f;
    const xl = l !== null && l > 0 ? omega * l : null;
    const xc = c !== null && c > 0 ? 1 / (omega * c) : null;

    let impedance: number;
    if (analysis.topology === 'series') {
      impedance = Math.hypot(r, (xl ?? 0) - (xc ?? 0));
    } else {
      const conductance = resistance !== null && resistance > 0 ? 1 / resistance : 0;
      const susceptance =
        (xc !== null && xc > 0 ? 1 / xc : 0) - (xl !== null && xl > 0 ? 1 / xl : 0);
      const admittance = Math.hypot(conductance, susceptance);
      impedance = admittance > 0 ? 1 / admittance : Infinity;
    }

    result.push({
      frequency: f,
      impedance,
      current: impedance > 0 && Number.isFinite(impedance) ? u / impedance : 0,
      inductiveReactance: xl ?? 0,
      capacitiveReactance: xc ?? 0,
    });
  }

  return result;
}

/** Parallel-capacitor power-factor correction for an inductive load. */
export function computeCompensation(
  analysis: CircuitAnalysis | null,
  targetPf: number | null,
): CompensationResult {
  const base: CompensationResult = {
    available: false,
    reason: null,
    targetPf: targetPf ?? 0,
    targetPhaseDeg: 0,
    reactivePowerToCorrect: 0,
    capacitance: 0,
    capacitanceMicro: 0,
    currentBefore: analysis?.source.current ?? 0,
    currentAfter: analysis?.source.current ?? 0,
    currentReduction: 0,
  };

  if (!analysis) {
    return { ...base, reason: 'Complete the circuit inputs to calculate compensation.' };
  }
  if (targetPf === null || targetPf <= 0 || targetPf > 1) {
    return { ...base, reason: 'Enter a target power factor greater than 0 and up to 1.00.' };
  }
  if (analysis.powers.phaseDeg <= 0) {
    return {
      ...base,
      reason: 'The load is not inductive (or is already leading), so a power-factor correction capacitor is not required.',
    };
  }
  if (analysis.powers.active < 1e-12) {
    return { ...base, reason: 'Active power is zero, so the correction capacitance is undefined.' };
  }
  if (analysis.powers.factor !== null && analysis.powers.factor >= targetPf - 1e-9) {
    return {
      ...base,
      reason: 'The present power factor already meets or exceeds the target.',
    };
  }
  if (!Number.isFinite(analysis.source.voltage) || analysis.source.voltage <= 0) {
    return { ...base, reason: 'A valid source voltage is required.' };
  }

  const phi1 = (analysis.powers.phaseDeg * Math.PI) / 180;
  const phi2 = Math.acos(targetPf);
  const targetPhaseDeg = (phi2 * 180) / Math.PI;
  const qCorrection = analysis.powers.active * (Math.tan(phi1) - Math.tan(phi2));
  const capacitance =
    qCorrection / (analysis.angularFrequency * analysis.source.voltage ** 2);
  const currentAfter =
    targetPf > 0 ? analysis.powers.active / (analysis.source.voltage * targetPf) : 0;

  return {
    available: true,
    reason: null,
    targetPf,
    targetPhaseDeg,
    reactivePowerToCorrect: qCorrection,
    capacitance,
    capacitanceMicro: capacitance * 1e6,
    currentBefore: analysis.source.current,
    currentAfter,
    currentReduction: Math.max(0, analysis.source.current - currentAfter),
  };
}

export { abs, argDeg, complex };
