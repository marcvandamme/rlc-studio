import {
  formatAngle,
  formatFixed,
  formatPF,
  formatSI,
} from './format';
import type {
  CircuitAnalysis,
  CompensationResult,
  ValidationIssue,
} from './types';

export interface ReportContext {
  analysis: CircuitAnalysis;
  issues: ValidationIssue[];
  compensation: CompensationResult;
  targetPf: number | null;
  decimals: number;
  timestamp?: Date;
}

function line(label: string, value: string): string {
  return `${label.padEnd(34, ' ')}${value}`;
}

function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function stateLabel(analysis: CircuitAnalysis): string {
  if (analysis.atResonance) return 'At resonance';
  if (analysis.state === 'resistive') return 'Resistive';
  return titleCase(analysis.state);
}

/** Plain-text report suitable for the clipboard, e-mail or an issue. */
export function buildReportText(context: ReportContext): string {
  const { analysis, issues, compensation, targetPf, decimals } = context;
  const date = context.timestamp ?? new Date();
  const { components, impedance, source, powers, resonance, branchCurrents, componentVoltages } =
    analysis;
  const unit = (value: number | null | undefined, suffix: string) =>
    formatSI(value, suffix, decimals);

  const rows: string[] = [];

  rows.push('RLC STUDIO — AC CIRCUIT ANALYSIS REPORT');
  rows.push('='.repeat(52));
  rows.push(line('Generated', date.toISOString()));
  rows.push(line('Circuit', titleCase(analysis.topology)));
  rows.push(line('Operating state', stateLabel(analysis)));
  rows.push('');
  rows.push('INPUTS & COMPONENTS');
  rows.push('-'.repeat(52));
  rows.push(line('Frequency, f', unit(analysis.frequency, 'Hz')));
  rows.push(line('Angular frequency, omega', `${formatFixed(analysis.angularFrequency, decimals)} rad/s`));
  rows.push(line('Resistance, R', components.resistance === null ? 'not fitted' : unit(components.resistance, 'Ω')));
  rows.push(line('Inductance, L', components.inductance === null ? 'not fitted' : `${unit(components.inductance, 'H')}${components.inductanceFromReactance ? ' (derived from X_L)' : ''}`));
  rows.push(line('Capacitance, C', components.capacitance === null ? 'not fitted' : `${unit(components.capacitance, 'F')}${components.capacitanceFromReactance ? ' (derived from X_C)' : ''}`));
  rows.push(line('Source drive', source.drive));
  rows.push(line('Voltage, U', unit(source.voltage, 'V')));
  rows.push(line('Current, I', unit(source.current, 'A')));
  rows.push('');

  rows.push('STEP 1 — REACTANCES');
  rows.push('-'.repeat(52));
  rows.push(line('Inductive reactance, X_L', components.inductiveReactance === null ? 'not fitted' : unit(components.inductiveReactance, 'Ω')));
  rows.push(line('Capacitive reactance, X_C', components.capacitiveReactance === null ? 'not fitted' : unit(components.capacitiveReactance, 'Ω')));
  rows.push('');

  rows.push(
    analysis.topology === 'series'
      ? 'STEP 2 — SERIES IMPEDANCE'
      : 'STEP 2 — BRANCH VALUES & IMPEDANCE',
  );
  rows.push('-'.repeat(52));
  rows.push(line('Impedance magnitude, |Z|', unit(impedance.magnitude, 'Ω')));
  rows.push(line('Impedance angle', formatAngle(impedance.angleDeg, decimals)));
  if (analysis.topology === 'series') {
    rows.push(line('Resistance, R', components.resistance === null ? '0 Ω' : unit(components.resistance, 'Ω')));
    rows.push(line(
      'Net reactance, X_L - X_C',
      unit((components.inductiveReactance ?? 0) - (components.capacitiveReactance ?? 0), 'Ω'),
    ));
  } else if (branchCurrents) {
    rows.push(line('Branch current I_R', branchCurrents.r === null ? 'not fitted' : unit(branchCurrents.r, 'A')));
    rows.push(line('Branch current I_L', branchCurrents.l === null ? 'not fitted' : unit(branchCurrents.l, 'A')));
    rows.push(line('Branch current I_C', branchCurrents.c === null ? 'not fitted' : unit(branchCurrents.c, 'A')));
    rows.push(line(
      'Total admittance, |Y|',
      Number.isFinite(impedance.magnitude) && impedance.magnitude > 0
        ? unit(1 / impedance.magnitude, 'S')
        : '0 S',
    ));
  }
  rows.push('');

  rows.push('STEP 3 — MAIN QUANTITIES');
  rows.push('-'.repeat(52));
  rows.push(line('Source voltage, U', unit(source.voltage, 'V')));
  rows.push(line('Total current, I', unit(source.current, 'A')));
  rows.push(line('Current angle', formatAngle(source.currentAngleDeg, decimals)));
  rows.push(line('Source drive', source.drive));
  rows.push('');

  rows.push('STEP 4 — COMPONENT VOLTAGES / CURRENTS');
  rows.push('-'.repeat(52));
  if (analysis.topology === 'series' && componentVoltages) {
    rows.push(line('Voltage across R, U_R', componentVoltages.r === null ? 'not fitted' : unit(componentVoltages.r, 'V')));
    rows.push(line('Voltage across L, U_L', componentVoltages.l === null ? 'not fitted' : unit(componentVoltages.l, 'V')));
    rows.push(line('Voltage across C, U_C', componentVoltages.c === null ? 'not fitted' : unit(componentVoltages.c, 'V')));
  } else if (branchCurrents) {
    rows.push(line('Current through R, I_R', branchCurrents.r === null ? 'not fitted' : unit(branchCurrents.r, 'A')));
    rows.push(line('Current through L, I_L', branchCurrents.l === null ? 'not fitted' : unit(branchCurrents.l, 'A')));
    rows.push(line('Current through C, I_C', branchCurrents.c === null ? 'not fitted' : unit(branchCurrents.c, 'A')));
    rows.push(line('Voltage across each branch', unit(source.voltage, 'V')));
  }
  rows.push('');

  rows.push('STEP 5 — POWER, PHASE & RESONANCE');
  rows.push('-'.repeat(52));
  rows.push(line('Active power, P', unit(powers.active, 'W')));
  rows.push(line('Reactive power, Q', unit(powers.reactive, 'var')));
  rows.push(line('Apparent power, S', unit(powers.apparent, 'VA')));
  rows.push(line('Power factor, cos(phi)', formatPF(powers.factor, decimals)));
  rows.push(line('Phase angle, phi', formatAngle(powers.phaseDeg, decimals)));
  rows.push(line('Power factor nature', powers.nature));
  if (resonance) {
    rows.push(line('Resonant frequency, f0', unit(resonance.frequency, 'Hz')));
    rows.push(line('Quality factor, Q', Number.isFinite(resonance.qFactor) ? formatFixed(resonance.qFactor, decimals) : '∞ (ideal)'));
    rows.push(line('Bandwidth, BW', Number.isFinite(resonance.bandwidth) ? unit(resonance.bandwidth, 'Hz') : '0 Hz (ideal)'));
    rows.push(line('Characteristic impedance, Z0', unit(resonance.characteristicImpedance, 'Ω')));
    rows.push(line('Damping ratio, zeta', formatFixed(resonance.dampingRatio, decimals)));
    rows.push(line('Frequency ratio, f/f0', formatFixed(resonance.frequencyRatio, decimals)));
  } else {
    rows.push(line('Resonance', 'requires both L and C'));
  }
  rows.push('');

  rows.push('POWER-FACTOR CORRECTION');
  rows.push('-'.repeat(52));
  if (compensation.available) {
    rows.push(line('Target power factor', formatPF(targetPf, decimals)));
    rows.push(line('Target phase angle', formatAngle(compensation.targetPhaseDeg, decimals)));
    rows.push(line('Reactive power to correct', unit(compensation.reactivePowerToCorrect, 'var')));
    rows.push(line('Parallel capacitor', `${formatFixed(compensation.capacitanceMicro, decimals)} µF`));
    rows.push(line('Current before correction', unit(compensation.currentBefore, 'A')));
    rows.push(line('Current after correction', unit(compensation.currentAfter, 'A')));
    rows.push(line('Current reduction', unit(compensation.currentReduction, 'A')));
  } else {
    rows.push(line('Correction', compensation.reason ?? 'not available'));
  }
  rows.push('');

  if (analysis.notes.length > 0) {
    rows.push('ENGINEERING NOTES');
    rows.push('-'.repeat(52));
    for (const note of analysis.notes) rows.push(`• ${note}`);
    rows.push('');
  }

  const warnings = issues.filter((item) => item.severity !== 'info');
  if (warnings.length > 0) {
    rows.push('VALIDATION NOTES');
    rows.push('-'.repeat(52));
    for (const warning of warnings) rows.push(`• [${warning.severity.toUpperCase()}] ${warning.message}`);
    rows.push('');
  }

  rows.push('— Generated with RLC Studio. Values use SI engineering notation.');
  rows.push('Phasors are referenced to the source voltage at 0°.');

  return rows.join('\n');
}

/** Compact one-line summary for quick sharing. */
export function buildSummaryText(analysis: CircuitAnalysis, decimals: number): string {
  const { impedance, source, powers } = analysis;
  return [
    `RLC ${titleCase(analysis.topology)} @ ${formatSI(analysis.frequency, 'Hz', decimals)}`,
    `|Z| = ${formatSI(impedance.magnitude, 'Ω', decimals)}`,
    `I = ${formatSI(source.current, 'A', decimals)}`,
    `U = ${formatSI(source.voltage, 'V', decimals)}`,
    `phi = ${formatAngle(powers.phaseDeg, decimals)}`,
    `PF = ${formatPF(powers.factor, decimals)}`,
    `state = ${stateLabel(analysis)}`,
  ].join(' · ');
}
