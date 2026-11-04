import { describe, expect, it } from 'vitest';
import { computeCompensation, computeSweep, analyzeCircuit } from './rlc';
import type { AnalysisOutcome, CircuitAnalysis, NumericCircuitInput } from './types';

const BASE: NumericCircuitInput = {
  topology: 'series',
  frequency: 50,
  resistance: 100,
  inductance: 0.1,
  capacitance: 1e-5,
  voltage: 230,
  current: null,
  xlOverride: null,
  xcOverride: null,
  zKnown: null,
};

function run(patch: Partial<NumericCircuitInput> = {}): AnalysisOutcome {
  return analyzeCircuit({ ...BASE, ...patch });
}

function analysis(patch: Partial<NumericCircuitInput> = {}): CircuitAnalysis {
  const outcome = run(patch);
  expect(outcome.analysis).not.toBeNull();
  return outcome.analysis as CircuitAnalysis;
}

function errorFields(outcome: AnalysisOutcome): string[] {
  return outcome.issues.filter((issue) => issue.severity === 'error').map((issue) => issue.field);
}

function phasorSum(analysisValue: CircuitAnalysis): { re: number; im: number } {
  return analysisValue.phasors.vectors.reduce(
    (sum, vector) => ({ re: sum.re + vector.re, im: sum.im + vector.im }),
    { re: 0, im: 0 },
  );
}

describe('series RLC analysis', () => {
  it('solves the reference 50 Hz network', () => {
    const result = analysis();

    expect(result.topology).toBe('series');
    expect(result.components.inductiveReactance).toBeCloseTo(31.4159, 4);
    expect(result.components.capacitiveReactance).toBeCloseTo(318.3099, 4);
    expect(result.impedance.magnitude).toBeCloseTo(303.8226, 3);
    expect(result.impedance.angleDeg).toBeCloseTo(-70.7834, 3);
    expect(result.source.current).toBeCloseTo(0.757021, 5);
    expect(result.source.currentAngleDeg).toBeCloseTo(70.7834, 3);
    expect(result.state).toBe('capacitive');
    expect(result.atResonance).toBe(false);

    expect(result.powers.active).toBeCloseTo(57.3081, 3);
    expect(result.powers.reactive).toBeCloseTo(-164.4133, 3);
    expect(result.powers.apparent).toBeCloseTo(174.1148, 3);
    expect(result.powers.factor).toBeCloseTo(0.329, 3);
    expect(result.powers.nature).toBe('leading');
    expect(result.powers.active ** 2 + result.powers.reactive ** 2).toBeCloseTo(
      result.powers.apparent ** 2,
      4,
    );

    expect(result.components.inductance).toBeCloseTo(0.1, 12);
    expect(result.components.capacitance).toBeCloseTo(1e-5, 12);
    expect(result.resonance?.frequency).toBeCloseTo(159.1549, 4);
    expect(result.resonance?.qFactor).toBeCloseTo(1, 6);
    expect(result.resonance?.bandwidth).toBeCloseTo(159.1549, 4);

    expect(result.componentVoltages?.r).toBeCloseTo(75.7021, 3);
    expect(result.componentVoltages?.l).toBeCloseTo(23.7825, 3);
    expect(result.componentVoltages?.c).toBeCloseTo(240.9672, 3);
    const sum = phasorSum(result);
    expect(sum.re).toBeCloseTo(result.source.voltage, 6);
    expect(sum.im).toBeCloseTo(0, 6);
    expect(result.phasors.kind).toBe('voltage');
    expect(result.phasors.total.magnitude).toBeCloseTo(230, 8);
  });

  it('identifies series resonance and its quality factor', () => {
    const result = analysis({
      frequency: 159.15494309189535,
      resistance: 10,
      voltage: 100,
    });

    expect(result.atResonance).toBe(true);
    expect(result.state).toBe('resonant');
    expect(result.impedance.magnitude).toBeCloseTo(10, 4);
    expect(result.impedance.angleDeg).toBeCloseTo(0, 5);
    expect(result.source.current).toBeCloseTo(10, 4);
    expect(result.powers.factor).toBeCloseTo(1, 8);
    expect(result.powers.nature).toBe('unity');
    expect(result.resonance?.qFactor).toBeCloseTo(10, 6);
    expect(result.resonance?.bandwidth).toBeCloseTo(15.9155, 4);
  });

  it('treats near-resonant round-off as a unity power factor', () => {
    const result = analysis({
      frequency: 159.155,
      resistance: 10,
      voltage: 100,
    });

    expect(result.atResonance).toBe(true);
    expect(result.powers.nature).toBe('unity');
    expect(result.powers.phaseDeg).toBeCloseTo(0, 3);
  });

  it('collapses floating-point round-off at exact resonance', () => {
    const result = analysis({
      frequency: 159.15494309189532,
      resistance: 10,
      voltage: 100,
    });

    expect(result.atResonance).toBe(true);
    expect(result.components.inductiveReactance).toBe(result.components.capacitiveReactance);
    expect(result.impedance.im).toBe(0);
    expect(result.powers.reactive).toBe(0);
    expect(result.powers.factor).toBe(1);
  });

  it('derives the voltage when only a current source is provided', () => {
    const result = analysis({ voltage: null, current: 1.2 });

    expect(result.source.drive).toBe('current');
    expect(result.source.current).toBeCloseTo(1.2, 10);
    expect(result.source.voltage).toBeCloseTo(1.2 * result.impedance.magnitude, 8);
    expect(result.notes.some((note) => note.includes('Only a current source'))).toBe(true);
  });

  it('accepts consistent U and I and warns that U defines the operating point', () => {
    const result = analysis({ current: 0.757021 });

    expect(result.source.drive).toBe('voltage+current');
    expect(result.source.current).toBeCloseTo(0.757021, 5);
    expect(result.notes.some((note) => note.includes('Both U and I'))).toBe(true);
  });
});

describe('parallel RLC analysis', () => {
  it('solves a lagging parallel network with branch currents', () => {
    const result = analysis({ topology: 'parallel' });

    expect(result.topology).toBe('parallel');
    expect(result.impedance.magnitude).toBeCloseTo(32.9136, 3);
    expect(result.impedance.angleDeg).toBeCloseTo(70.783, 3);
    expect(result.source.current).toBeCloseTo(6.988, 3);
    expect(result.state).toBe('inductive');
    expect(result.powers.nature).toBe('lagging');
    expect(result.powers.active).toBeCloseTo(529, 4);
    expect(result.powers.reactive).toBeCloseTo(1517.7, 1);
    expect(result.powers.factor).toBeCloseTo(0.329, 3);

    expect(result.branchCurrents?.r).toBeCloseTo(2.3, 6);
    expect(result.branchCurrents?.l).toBeCloseTo(7.3211, 3);
    expect(result.branchCurrents?.c).toBeCloseTo(0.7226, 4);
    const sum = phasorSum(result);
    expect(sum.re).toBeCloseTo(result.source.current * Math.cos((result.source.currentAngleDeg * Math.PI) / 180), 5);
    expect(sum.im).toBeCloseTo(result.source.current * Math.sin((result.source.currentAngleDeg * Math.PI) / 180), 5);
    expect(result.phasors.kind).toBe('current');
  });

  it('models a parallel tank at resonance', () => {
    const result = analysis({
      topology: 'parallel',
      frequency: 159.15494309189535,
      resistance: 1000,
      voltage: 100,
    });

    expect(result.atResonance).toBe(true);
    expect(result.state).toBe('resonant');
    expect(result.impedance.magnitude).toBeCloseTo(1000, 3);
    expect(result.source.current).toBeCloseTo(0.1, 8);
    expect(result.branchCurrents?.l).toBeCloseTo(1, 5);
    expect(result.branchCurrents?.c).toBeCloseTo(1, 5);
    expect(Math.hypot(result.phasors.total.re, result.phasors.total.im)).toBeCloseTo(0.1, 8);
    expect(result.resonance?.qFactor).toBeCloseTo(10, 6);
    expect(result.powers.active).toBeCloseTo(10, 5);
    expect(Math.abs(result.powers.reactive)).toBeLessThan(1e-6);
  });

  it('allows an ideal parallel tank to draw zero line current with a voltage source', () => {
    const result = analysis({
      topology: 'parallel',
      frequency: 159.15494309189535,
      resistance: null,
      voltage: 100,
    });

    expect(result.atResonance).toBe(true);
    expect(result.source.current).toBeCloseTo(0, 9);
    expect(result.powers.factor).toBeNull();
    expect(result.powers.nature).toBe('undefined');
    expect(result.impedance.magnitude).toBe(Infinity);
  });

  it('rejects a current source driving an ideal parallel resonance', () => {
    const outcome = run({
      topology: 'parallel',
      frequency: 159.15494309189535,
      resistance: null,
      voltage: null,
      current: 1,
    });

    expect(outcome.analysis).toBeNull();
    expect(outcome.issues.some((issue) => issue.message.includes('infinite impedance'))).toBe(true);
  });
});

describe('validation', () => {
  it('requires a positive frequency for AC analysis', () => {
    const zero = run({ frequency: 0 });
    expect(zero.analysis).toBeNull();
    expect(errorFields(zero)).toContain('frequency');

    const missing = run({ frequency: null });
    expect(missing.analysis).toBeNull();
    expect(errorFields(missing)).toContain('frequency');
  });

  it('rejects negative resistance and non-positive reactive components', () => {
    expect(errorFields(run({ resistance: -1 }))).toContain('resistance');
    expect(errorFields(run({ inductance: 0 }))).toContain('inductance');
    expect(errorFields(run({ capacitance: -1e-6 }))).toContain('capacitance');
  });

  it('rejects a zero or negative source', () => {
    expect(errorFields(run({ voltage: 0 }))).toContain('voltage');
    expect(errorFields(run({ voltage: null, current: -1 }))).toContain('current');
  });

  it('requires at least one component', () => {
    const outcome = run({
      resistance: null,
      inductance: null,
      capacitance: null,
    });
    expect(outcome.analysis).toBeNull();
    expect(errorFields(outcome)).toContain('circuit');
  });

  it('rejects U and I when they contradict the computed impedance', () => {
    const outcome = run({ current: 1 });
    expect(outcome.analysis).toBeNull();
    expect(outcome.issues.some((issue) => issue.message.includes('contradict'))).toBe(true);
  });

  it('rejects U and I when the circuit impedance is unknown', () => {
    const outcome = run({
      resistance: null,
      inductance: null,
      capacitance: null,
      current: 1,
    });
    expect(outcome.analysis).toBeNull();
    expect(outcome.issues.some((issue) => issue.message.includes('impedance is unknown'))).toBe(true);
    expect(outcome.issues.some((issue) => issue.message.includes('Add at least one component'))).toBe(false);
  });

  it('rejects R = 0 in a parallel network because it shorts the source', () => {
    const outcome = run({ topology: 'parallel', resistance: 0 });
    expect(outcome.analysis).toBeNull();
    expect(outcome.issues.some((issue) => issue.message.includes('short'))).toBe(true);
  });
});

describe('direct reactance overrides', () => {
  it('uses direct X_L and X_C values without L or C', () => {
    const result = analysis({
      resistance: 50,
      inductance: null,
      capacitance: null,
      voltage: 100,
      xlOverride: 80,
      xcOverride: 120,
    });

    expect(result.components.inductiveReactance).toBe(80);
    expect(result.components.capacitiveReactance).toBe(120);
    expect(result.impedance.magnitude).toBeCloseTo(Math.hypot(50, -40), 8);
    expect(result.impedance.angleDeg).toBeCloseTo(-38.6598, 3);
    expect(result.source.current).toBeCloseTo(1.5617, 3);
    expect(result.components.inductanceFromReactance).toBe(true);
    expect(result.components.capacitanceFromReactance).toBe(true);
    expect(result.components.inductance).toBeCloseTo(80 / (2 * Math.PI * 50), 10);
    expect(result.components.capacitance).toBeCloseTo(1 / (2 * Math.PI * 50 * 120), 12);
    expect(result.resonance?.frequency).toBeCloseTo(61.237, 2);
    expect(result.notes.some((note) => note.includes('X_L is a direct reactance override'))).toBe(true);
  });

  it('warns when a direct override disagrees with the component value', () => {
    const outcome = run({ xlOverride: 80 });
    expect(outcome.analysis).not.toBeNull();
    expect(outcome.issues.some((issue) => issue.field === 'xlOverride' && issue.severity === 'warning')).toBe(true);
  });

  it('warns when the known |Z| cross-check disagrees', () => {
    const outcome = run({ zKnown: 100 });
    expect(outcome.analysis).not.toBeNull();
    expect(outcome.issues.some((issue) => issue.field === 'zKnown' && issue.severity === 'warning')).toBe(true);
  });
});

describe('frequency sweep', () => {
  it('creates a logarithmic sweep and uses the circuit impedance', () => {
    const result = analysis();
    const points = computeSweep(result, 10, 1000, 100);

    expect(points).toHaveLength(100);
    expect(points[0].frequency).toBeCloseTo(10, 9);
    expect(points.at(-1)?.frequency).toBeCloseTo(1000, 6);
    expect(points[0].frequency).toBeLessThan(points[1].frequency);
    for (const point of points) {
      expect(Number.isFinite(point.impedance)).toBe(true);
      expect(point.current).toBeCloseTo(result.source.voltage / point.impedance, 8);
    }
  });

  it('returns no points for an invalid range', () => {
    const result = analysis();
    expect(computeSweep(result, 0, 100, 50)).toEqual([]);
    expect(computeSweep(result, 100, 100, 50)).toEqual([]);
    expect(computeSweep(result, Number.NaN, 100, 50)).toEqual([]);
  });
});

describe('power-factor correction', () => {
  it('sizes a parallel capacitor for an inductive load', () => {
    const result = analysis({ topology: 'parallel' });
    const compensation = computeCompensation(result, 0.95);

    expect(compensation.available).toBe(true);
    expect(compensation.targetPhaseDeg).toBeCloseTo(18.1949, 3);
    expect(compensation.reactivePowerToCorrect).toBeCloseTo(1343.8, 0);
    expect(compensation.capacitanceMicro).toBeCloseTo(80.87, 1);
    expect(compensation.currentBefore).toBeCloseTo(6.988, 3);
    expect(compensation.currentAfter).toBeCloseTo(2.421, 3);
    expect(compensation.currentReduction).toBeCloseTo(4.567, 3);
    expect(compensation.capacitance).toBeCloseTo(compensation.capacitanceMicro * 1e-6, 12);
  });

  it('declines correction when the load is capacitive or the target is already met', () => {
    const capacitive = computeCompensation(analysis(), 0.95);
    expect(capacitive.available).toBe(false);
    expect(capacitive.reason).toContain('not inductive');

    const alreadyCorrected = computeCompensation(analysis({ topology: 'parallel' }), 0.3);
    expect(alreadyCorrected.available).toBe(false);
    expect(alreadyCorrected.reason).toContain('already meets');
  });

  it('validates its inputs', () => {
    expect(computeCompensation(null, 0.95).reason).toContain('Complete');
    expect(computeCompensation(analysis({ topology: 'parallel' }), 0).reason).toContain('greater than 0');
    expect(computeCompensation(analysis({ topology: 'parallel' }), null).reason).toContain('greater than 0');
  });
});
