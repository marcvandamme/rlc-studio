import { Badge } from '../ui/Badge';
import {
  formatAngle,
  formatFixed,
  formatPF,
  formatSI,
} from '../../domain/format';
import type { CircuitAnalysis } from '../../domain/types';
import { ResultRow, ResultTile, StepCard } from './StepCard';

interface CalculationStepsProps {
  analysis: CircuitAnalysis;
  decimals: number;
}

function complexRect(re: number, im: number, unit: string, decimals: number): string {
  const sign = im >= 0 ? '+' : '−';
  return `${formatSI(re, unit, decimals)} ${sign} j${formatSI(Math.abs(im), unit, decimals)}`;
}

function qualityFactor(value: number, decimals: number): string {
  return Number.isFinite(value) ? formatFixed(value, decimals) : '∞ (ideal)';
}

export function CalculationSteps({ analysis, decimals }: CalculationStepsProps) {
  const { components, source, impedance, powers, resonance, branchCurrents, componentVoltages } =
    analysis;
  const isSeries = analysis.topology === 'series';

  const xl = components.inductiveReactance;
  const xc = components.capacitiveReactance;
  const netReactance = xl !== null && xc !== null ? xl - xc : null;
  const netSusceptance =
    xl !== null && xc !== null && xl > 0 && xc > 0 ? 1 / xc - 1 / xl : null;

  const stepOneFormulas = isSeries
    ? [
        { latex: 'X_L = 2\\pi f L', caption: 'Inductive reactance grows with frequency.' },
        { latex: 'X_C = \\dfrac{1}{2\\pi f C}', caption: 'Capacitive reactance falls with frequency.' },
      ]
    : [
        { latex: 'X_L = 2\\pi f L,\\qquad X_C = \\dfrac{1}{2\\pi f C}' },
        { latex: 'B_L = \\dfrac{1}{X_L},\\qquad B_C = \\dfrac{1}{X_C}', caption: 'Branch susceptances are summed as currents.' },
      ];

  const stepTwoFormulas = isSeries
    ? [
        { latex: 'Z = R + j(X_L - X_C)' },
        { latex: '|Z| = \\sqrt{R^2 + (X_L - X_C)^2}' },
        { latex: '\\varphi = \\operatorname{atan2}(X_L - X_C,\\; R)' },
      ]
    : [
        { latex: 'Y = \\dfrac{1}{R} + \\dfrac{1}{jX_L} + j\\dfrac{1}{X_C}' },
        { latex: '|Z| = \\dfrac{1}{|Y|}' },
        { latex: 'I_R = \\dfrac{U}{R},\\quad I_L = \\dfrac{U}{X_L},\\quad I_C = \\dfrac{U}{X_C}' },
      ];

  const stepThreeFormulas = isSeries
    ? [
        { latex: 'I = \\dfrac{U}{|Z|}' },
        { latex: '\\mathbf{I} = I\\,\\angle(-\\varphi)' },
      ]
    : [
        { latex: 'I = \\sqrt{I_R^2 + (I_C - I_L)^2}' },
        { latex: '\\mathbf{I} = \\mathbf{I}_R + \\mathbf{I}_L + \\mathbf{I}_C' },
      ];

  const stepFourFormulas = isSeries
    ? [
        { latex: 'U_R = IR,\\qquad U_L = IX_L,\\qquad U_C = IX_C' },
        { latex: '\\mathbf{U} = \\mathbf{U}_R + \\mathbf{U}_L + \\mathbf{U}_C' },
      ]
    : [
        { latex: 'I_R = \\dfrac{U}{R},\\qquad I_L = \\dfrac{U}{X_L},\\qquad I_C = \\dfrac{U}{X_C}' },
        { latex: '\\mathbf{I} = \\mathbf{I}_R + \\mathbf{I}_L + \\mathbf{I}_C' },
      ];

  const stepFiveFormulas = [
    { latex: 'S = UI,\\qquad P = UI\\cos\\varphi,\\qquad Q = UI\\sin\\varphi' },
    { latex: '\\cos\\varphi = \\dfrac{P}{S}' },
    { latex: 'f_0 = \\dfrac{1}{2\\pi\\sqrt{LC}}' },
    isSeries
      ? { latex: 'Q_f = \\dfrac{1}{R}\\sqrt{\\dfrac{L}{C}},\\qquad BW = \\dfrac{f_0}{Q_f}', caption: 'Series RLC quality factor.' }
      : { latex: 'Q_f = R\\sqrt{\\dfrac{C}{L}},\\qquad BW = \\dfrac{f_0}{Q_f}', caption: 'Parallel RLC quality factor; R is the parallel resistance.' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-ink">Calculation path</h2>
          <p className="mt-0.5 text-xs text-muted">
            Five checks, in the order they are derived. Every value follows the selected precision.
          </p>
        </div>
        <Badge tone="neutral">SI · RMS</Badge>
      </div>

      <StepCard
        index={1}
        title="Reactances"
        subtitle="Convert frequency and component values into reactance."
        formulas={stepOneFormulas}
        footnote={
          components.inductanceFromReactance || components.capacitanceFromReactance
            ? 'A direct reactance override is active. Effective L or C is re-derived at the operating frequency for the resonance calculation.'
            : 'Inputs accept case-sensitive SI prefixes: 1k = 1,000; 1m = 0.001; 1M = 1,000,000.'
        }
      >
        <div className="grid grid-cols-2 gap-2">
          <ResultTile
            label="Inductive reactance"
            symbol="X_L"
            value={xl === null ? 'Not fitted' : formatSI(xl, 'Ω', decimals)}
            sub={xl === null ? 'L is empty' : components.inductanceFromReactance ? 'direct override' : 'from L'}
            tone="inductive"
          />
          <ResultTile
            label="Capacitive reactance"
            symbol="X_C"
            value={xc === null ? 'Not fitted' : formatSI(xc, 'Ω', decimals)}
            sub={xc === null ? 'C is empty' : components.capacitanceFromReactance ? 'direct override' : 'from C'}
            tone="capacitive"
          />
        </div>
        <div className="mt-3">
          {isSeries ? (
            <>
              <ResultRow
                label="Net reactance"
                symbol="X = X_L − X_C"
                value={netReactance === null ? '—' : formatSI(netReactance, 'Ω', decimals)}
                sub={
                  netReactance === null
                    ? 'Fit both L and C to see cancellation.'
                    : netReactance > 0
                      ? 'Inductive net reactance'
                      : netReactance < 0
                        ? 'Capacitive net reactance'
                        : 'Exact cancellation'
                }
              />
              <ResultRow
                label="Reactance ratio"
                symbol="X_L / X_C"
                value={xl !== null && xc !== null && xc > 0 ? formatFixed(xl / xc, decimals) : '—'}
              />
            </>
          ) : (
            <>
              <ResultRow
                label="Net susceptance"
                symbol="B = B_C − B_L"
                value={netSusceptance === null ? '—' : formatSI(netSusceptance, 'S', decimals)}
                sub={
                  netSusceptance === null
                    ? 'Fit both L and C to see cancellation.'
                    : netSusceptance > 0
                      ? 'Capacitive net susceptance'
                      : netSusceptance < 0
                        ? 'Inductive net susceptance'
                        : 'Exact cancellation'
                }
              />
              <ResultRow
                label="Reactance ratio"
                symbol="X_L / X_C"
                value={xl !== null && xc !== null && xc > 0 ? formatFixed(xl / xc, decimals) : '—'}
              />
            </>
          )}
          <ResultRow
            label="State at this frequency"
            symbol="f"
            value={
              <Badge
                tone={
                  analysis.state === 'inductive'
                    ? 'inductive'
                    : analysis.state === 'capacitive'
                      ? 'capacitive'
                      : analysis.state === 'resonant'
                        ? 'resonant'
                        : 'accent'
                }
                dot
              >
                {analysis.atResonance ? 'At resonance' : analysis.state}
              </Badge>
            }
          />
        </div>
      </StepCard>

      <StepCard
        index={2}
        title={isSeries ? 'Series impedance' : 'Branch values & impedance'}
        subtitle={
          isSeries
            ? 'Combine the resistance and the net reactance into one complex impedance.'
            : 'Resolve each parallel branch, then combine admittances into the total impedance.'
        }
        formulas={stepTwoFormulas}
      >
        <div className="grid grid-cols-2 gap-2">
          <ResultTile label="Impedance" symbol="|Z|" value={formatSI(impedance.magnitude, 'Ω', decimals)} tone="accent" />
          <ResultTile label="Phase angle" symbol="φ" value={formatAngle(impedance.angleDeg, decimals)} />
        </div>
        <div className="mt-3">
          {isSeries ? (
            <>
              <ResultRow
                label="Rectangular impedance"
                symbol="Z = R + jX"
                value={
                  Number.isFinite(impedance.magnitude)
                    ? complexRect(impedance.re, impedance.im, 'Ω', decimals)
                    : '∞'
                }
              />
              <ResultRow
                label="Resistance"
                symbol="R"
                value={components.resistance === null ? 'Not fitted (0 Ω)' : formatSI(components.resistance, 'Ω', decimals)}
              />
              <ResultRow
                label="Net reactance"
                symbol="X_L − X_C"
                value={xl === null || xc === null ? '—' : formatSI(xl - xc, 'Ω', decimals)}
              />
              <ResultRow
                label="Current phase relative to voltage"
                symbol="−φ"
                value={formatAngle(source.currentAngleDeg, decimals)}
                sub={powers.nature === 'lagging' ? 'lagging' : powers.nature === 'leading' ? 'leading' : 'in phase'}
              />
            </>
          ) : (
            <>
              <p className="mb-1.5 mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
                Branch currents from the source voltage
              </p>
              <ResultRow
                label="Resistor branch"
                symbol="I_R = U/R"
                value={branchCurrents?.r === null || branchCurrents?.r === undefined ? 'Not fitted' : formatSI(branchCurrents.r, 'A', decimals)}
              />
              <ResultRow
                label="Inductor branch"
                symbol="I_L = U/X_L"
                value={branchCurrents?.l === null || branchCurrents?.l === undefined ? 'Not fitted' : formatSI(branchCurrents.l, 'A', decimals)}
              />
              <ResultRow
                label="Capacitor branch"
                symbol="I_C = U/X_C"
                value={branchCurrents?.c === null || branchCurrents?.c === undefined ? 'Not fitted' : formatSI(branchCurrents.c, 'A', decimals)}
              />
              <ResultRow
                label="Total admittance"
                symbol="|Y| = 1/|Z|"
                value={Number.isFinite(impedance.magnitude) && impedance.magnitude > 0 ? formatSI(1 / impedance.magnitude, 'S', decimals) : '0 S'}
              />
            </>
          )}
        </div>
      </StepCard>

      <StepCard
        index={3}
        title="Main quantities"
        subtitle={
          isSeries
            ? 'Ohm’s law in complex form fixes the total current and its angle.'
            : 'The branch currents add as phasors, not as simple scalars.'
        }
        formulas={stepThreeFormulas}
      >
        <div className="grid grid-cols-2 gap-2">
          <ResultTile label="Source voltage" symbol="U" value={formatSI(source.voltage, 'V', decimals)} />
          <ResultTile label="Total current" symbol="I" value={formatSI(source.current, 'A', decimals)} tone="accent" />
        </div>
        <div className="mt-3">
          <ResultRow
            label="Current angle (U at 0°)"
            symbol="∠I"
            value={formatAngle(source.currentAngleDeg, decimals)}
            sub="Negative angle = lagging (inductive)"
          />
          {isSeries ? (
            <ResultRow
              label="Complex current"
              symbol="I = U/Z"
              value={`${formatSI(source.current, 'A', decimals)} ∠ ${formatAngle(source.currentAngleDeg, decimals)}`}
            />
          ) : (
            <>
              <ResultRow
                label="In-phase current"
                symbol="I_R"
                value={branchCurrents?.r === null || branchCurrents?.r === undefined ? 'Not fitted' : formatSI(branchCurrents.r, 'A', decimals)}
              />
              <ResultRow
                label="Net reactive current"
                symbol="I_C − I_L"
                value={
                  branchCurrents?.l === null || branchCurrents?.l === undefined || branchCurrents?.c === null || branchCurrents?.c === undefined
                    ? '—'
                    : formatSI((branchCurrents.c ?? 0) - (branchCurrents.l ?? 0), 'A', decimals)
                }
                sub="Positive means capacitive, negative means inductive"
              />
            </>
          )}
          <ResultRow
            label="Source drive"
            symbol="U / I"
            value={
              source.drive === 'current'
                ? 'Current source'
                : source.drive === 'voltage+current'
                  ? 'U drives · I checked'
                  : 'Voltage source'
            }
          />
        </div>
      </StepCard>

      <StepCard
        index={4}
        title={isSeries ? 'Component voltages' : 'Component currents'}
        subtitle={
          isSeries
            ? 'Each component voltage is a phasor; their vector sum reconstructs the source voltage.'
            : 'All branches share the same voltage; their currents combine into the line current.'
        }
        formulas={stepFourFormulas}
      >
        {isSeries ? (
          <>
            <div className="grid grid-cols-3 gap-2">
              <ResultTile
                label="Resistor"
                symbol="U_R"
                value={componentVoltages?.r === null || componentVoltages?.r === undefined ? '—' : formatSI(componentVoltages.r, 'V', decimals)}
                sub="in phase with I"
                tone="default"
              />
              <ResultTile
                label="Inductor"
                symbol="U_L"
                value={componentVoltages?.l === null || componentVoltages?.l === undefined ? '—' : formatSI(componentVoltages.l, 'V', decimals)}
                sub="leads I by 90°"
                tone="inductive"
              />
              <ResultTile
                label="Capacitor"
                symbol="U_C"
                value={componentVoltages?.c === null || componentVoltages?.c === undefined ? '—' : formatSI(componentVoltages.c, 'V', decimals)}
                sub="lags I by 90°"
                tone="capacitive"
              />
            </div>
            <div className="mt-3">
              <ResultRow
                label="Phasor sum"
                symbol="U_R + U_L + U_C"
                value={`≈ ${formatSI(source.voltage, 'V', decimals)}`}
                tone="accent"
                sub="Reconstructed source voltage"
              />
              <ResultRow
                label="Voltage triangle"
                symbol="√(U_R² + (U_L−U_C)²)"
                value={formatSI(source.voltage, 'V', decimals)}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <ResultTile
                label="Resistor"
                symbol="I_R"
                value={branchCurrents?.r === null || branchCurrents?.r === undefined ? '—' : formatSI(branchCurrents.r, 'A', decimals)}
                sub="0° · in phase"
                tone="default"
              />
              <ResultTile
                label="Inductor"
                symbol="I_L"
                value={branchCurrents?.l === null || branchCurrents?.l === undefined ? '—' : formatSI(branchCurrents.l, 'A', decimals)}
                sub="−90° · lags"
                tone="inductive"
              />
              <ResultTile
                label="Capacitor"
                symbol="I_C"
                value={branchCurrents?.c === null || branchCurrents?.c === undefined ? '—' : formatSI(branchCurrents.c, 'A', decimals)}
                sub="+90° · leads"
                tone="capacitive"
              />
            </div>
            <div className="mt-3">
              <ResultRow
                label="Line current"
                symbol="Σ I"
                value={`${formatSI(source.current, 'A', decimals)} ∠ ${formatAngle(source.currentAngleDeg, decimals)}`}
                tone="accent"
              />
              <ResultRow
                label="Voltage across every branch"
                symbol="U"
                value={formatSI(source.voltage, 'V', decimals)}
              />
            </div>
          </>
        )}
      </StepCard>

      <StepCard
        index={5}
        title="Power, phase & resonance"
        subtitle="Separate real transfer from reactive exchange, then locate the natural frequency."
        formulas={stepFiveFormulas}
      >
        <div className="grid grid-cols-3 gap-2">
          <ResultTile label="Active" symbol="P" value={formatSI(powers.active, 'W', decimals)} tone="accent" />
          <ResultTile label="Reactive" symbol="Q" value={formatSI(powers.reactive, 'var', decimals)} />
          <ResultTile label="Apparent" symbol="S" value={formatSI(powers.apparent, 'VA', decimals)} />
        </div>
        <div className="mt-3">
          <ResultRow
            label="Power factor"
            symbol="cos φ"
            value={formatPF(powers.factor, decimals)}
            sub={powers.factor === null ? 'undefined at zero current' : powers.nature}
          />
          <ResultRow
            label="Phase displacement"
            symbol="φ"
            value={formatAngle(powers.phaseDeg, decimals)}
            sub="+ lagging · − leading"
          />
        </div>

        <div className="mt-4 border-t border-line pt-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-faint">
              Resonance analysis
            </p>
            {analysis.atResonance ? <Badge tone="resonant" dot>Resonant</Badge> : null}
          </div>
          {resonance ? (
            <>
              <ResultRow label="Resonant frequency" symbol="f₀" value={formatSI(resonance.frequency, 'Hz', decimals)} />
              <ResultRow label="Quality factor" symbol="Q_f" value={qualityFactor(resonance.qFactor, decimals)} sub="Q_f — not reactive power Q" />
              <ResultRow label="Bandwidth" symbol="BW = f₀/Q_f" value={Number.isFinite(resonance.bandwidth) ? formatSI(resonance.bandwidth, 'Hz', decimals) : '0 Hz (ideal)'} />
              <ResultRow label="Characteristic impedance" symbol="Z₀ = √(L/C)" value={formatSI(resonance.characteristicImpedance, 'Ω', decimals)} />
              <ResultRow label="Frequency ratio" symbol="f / f₀" value={formatFixed(resonance.frequencyRatio, decimals)} />
              <ResultRow label="Damping ratio" symbol="ζ = 1/(2Q_f)" value={formatFixed(resonance.dampingRatio, decimals)} />
            </>
          ) : (
            <p className="rounded-xl border border-dashed border-line bg-raised/60 px-3 py-4 text-center text-[11px] leading-relaxed text-muted">
              Resonance requires both L and C. Add the missing reactive component to calculate f₀, Q and bandwidth.
            </p>
          )}
        </div>
      </StepCard>
    </div>
  );
}
