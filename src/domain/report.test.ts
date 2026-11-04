import { describe, expect, it } from 'vitest';
import { analyzeCircuit, computeCompensation } from './rlc';
import { buildReportText, buildSummaryText } from './report';
import type { CircuitAnalysis, ValidationIssue } from './types';

function parallelAnalysis(): CircuitAnalysis {
  const outcome = analyzeCircuit({
    topology: 'parallel',
    frequency: 50,
    resistance: 100,
    inductance: 0.1,
    capacitance: 1e-5,
    voltage: 230,
    current: null,
    xlOverride: null,
    xcOverride: null,
    zKnown: null,
  });
  expect(outcome.analysis).not.toBeNull();
  return outcome.analysis as CircuitAnalysis;
}

const timestamp = new Date('2026-11-03T12:34:56.000Z');

describe('clipboard report', () => {
  it('contains all five steps, values and compensation details', () => {
    const analysis = parallelAnalysis();
    const compensation = computeCompensation(analysis, 0.95);
    const warning: ValidationIssue = {
      field: 'zKnown',
      severity: 'warning',
      message: 'Known |Z| differs from the calculated value.',
    };

    const text = buildReportText({
      analysis,
      issues: [warning],
      compensation,
      targetPf: 0.95,
      decimals: 3,
      timestamp,
    });

    expect(text).toContain('RLC STUDIO — AC CIRCUIT ANALYSIS REPORT');
    expect(text).toContain('2026-11-03T12:34:56.000Z');
    expect(text).toContain('Parallel');
    expect(text).toContain('STEP 1 — REACTANCES');
    expect(text).toContain('STEP 2 — BRANCH VALUES & IMPEDANCE');
    expect(text).toContain('STEP 3 — MAIN QUANTITIES');
    expect(text).toContain('STEP 4 — COMPONENT VOLTAGES / CURRENTS');
    expect(text).toContain('STEP 5 — POWER, PHASE & RESONANCE');
    expect(text).toContain('Inductive reactance, X_L');
    expect(text).toContain('31.416 Ω');
    expect(text).toContain('Branch current I_L');
    expect(text).toContain('7.321 A');
    expect(text).toContain('Reactive power, Q');
    expect(text).toContain('1.518 kvar');
    expect(text).toContain('Power factor, cos(phi)');
    expect(text).toContain('0.329');
    expect(text).toContain('Resonant frequency, f0');
    expect(text).toContain('Parallel capacitor');
    expect(text).toContain('80.859 µF');
    expect(text).toContain('WARNING');
    expect(text).toContain('Known |Z| differs');
    expect(text).toContain('Values use SI engineering notation');
    expect(text).toContain('source voltage at 0°');
  });

  it('explains why compensation is unavailable', () => {
    const analysis = parallelAnalysis();
    const compensation = computeCompensation(analysis, 0.3);
    const text = buildReportText({
      analysis,
      issues: [],
      compensation,
      targetPf: 0.3,
      decimals: 2,
      timestamp,
    });

    expect(text).toContain('POWER-FACTOR CORRECTION');
    expect(text).toContain('already meets or exceeds the target');
  });

  it('reports precision consistently', () => {
    const analysis = parallelAnalysis();
    const decimalsOne = buildReportText({
      analysis,
      issues: [],
      compensation: computeCompensation(analysis, 0.95),
      targetPf: 0.95,
      decimals: 1,
      timestamp,
    });
    const decimalsFour = buildReportText({
      analysis,
      issues: [],
      compensation: computeCompensation(analysis, 0.95),
      targetPf: 0.95,
      decimals: 4,
      timestamp,
    });

    expect(decimalsOne).toContain('32.9 Ω');
    expect(decimalsFour).toContain('32.9139 Ω');
    expect(decimalsFour).toContain('6.9879 A');
  });

  it('builds a compact summary', () => {
    const summary = buildSummaryText(parallelAnalysis(), 2);
    expect(summary).toContain('RLC Parallel @ 50.00 Hz');
    expect(summary).toContain('|Z| = 32.91 Ω');
    expect(summary).toContain('I = 6.99 A');
    expect(summary).toContain('U = 230.00 V');
    expect(summary).toContain('phi = 70.78°');
    expect(summary).toContain('PF = 0.33');
    expect(summary).toContain('state = Inductive');
  });
});
