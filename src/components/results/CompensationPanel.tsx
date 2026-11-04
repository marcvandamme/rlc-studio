import { BatteryCharging, CheckCircle2, Info } from 'lucide-react';
import type { CompensationResult, CircuitAnalysis } from '../../domain/types';
import { formatFixed, formatPF, formatSI } from '../../domain/format';
import { Formula } from '../ui/Formula';
import { Field } from '../ui/Field';
import { Badge } from '../ui/Badge';

interface CompensationPanelProps {
  analysis: CircuitAnalysis;
  result: CompensationResult;
  targetInput: string;
  onTargetInputChange: (value: string) => void;
  targetError: string | null;
  decimals: number;
}

export function CompensationPanel({
  analysis,
  result,
  targetInput,
  onTargetInputChange,
  targetError,
  decimals,
}: CompensationPanelProps) {
  return (
    <article className="card overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-raised/60 px-5 py-4">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-accent/10 text-accent ring-1 ring-accent/20">
            <BatteryCharging className="h-4 w-4" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-ink">Power-factor correction</h3>
            <p className="mt-0.5 text-xs text-muted">
              Size a parallel capacitor for a target displacement power factor.
            </p>
          </div>
        </div>
        <Badge tone="accent">Parallel C</Badge>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div>
          <div className="card-inset space-y-3 px-4 py-3">
            <Formula
              block
              latex="C = \dfrac{P(\tan\varphi_1 - \tan\varphi_2)}{\omega U^2}"
            />
            <p className="text-[10.5px] leading-relaxed text-faint">
              φ₁ is the present load angle; φ₂ = arccos(target PF). The capacitor supplies the
              reactive power difference and is placed in parallel with the load.
            </p>
          </div>
          <div className="mt-3">
            <Field
              label="Target power factor"
              symbol="cos φ₂"
              value={targetInput}
              onChange={onTargetInputChange}
              unit="PF"
              placeholder="0.95"
              hint="Enter a value between 0 and 1 (e.g. 0.95)."
              error={targetError ?? undefined}
            />
          </div>
          <div className="mt-2 flex items-center gap-2 text-[10.5px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-inductive" aria-hidden />
            Present PF
            <span className="value-mono font-semibold text-ink">
              {formatPF(analysis.powers.factor, decimals)}
            </span>
            <span className="text-faint">({analysis.powers.nature})</span>
          </div>
        </div>

        <div className="min-w-0">
          {result.available ? (
            <>
              <div className="rounded-2xl border border-accent/25 bg-accent/[0.06] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="eyebrow text-accent">Required capacitance</p>
                  <CheckCircle2 className="h-4 w-4 text-accent" aria-hidden />
                </div>
                <p className="value-mono mt-1 text-2xl font-semibold tracking-tight text-ink">
                  {formatFixed(result.capacitanceMicro, decimals)} µF
                </p>
                <p className="mt-1 text-[10.5px] text-muted">
                  {formatSI(result.capacitance, 'F', decimals)} · target PF{' '}
                  {formatPF(result.targetPf, decimals)} · φ₂ ={' '}
                  {formatFixed(result.targetPhaseDeg, decimals)}°
                </p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-line bg-raised/70 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                    Reactive power
                  </p>
                  <p className="value-mono mt-1 text-[14px] font-semibold text-ink">
                    {formatSI(result.reactivePowerToCorrect, 'var', decimals)}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-raised/70 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                    Current reduction
                  </p>
                  <p className="value-mono mt-1 text-[14px] font-semibold text-ink">
                    {formatSI(result.currentReduction, 'A', decimals)}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-raised/70 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                    I before
                  </p>
                  <p className="value-mono mt-1 text-[14px] font-semibold text-muted">
                    {formatSI(result.currentBefore, 'A', decimals)}
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-raised/70 px-3 py-2.5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
                    I after
                  </p>
                  <p className="value-mono mt-1 text-[14px] font-semibold text-ink">
                    {formatSI(result.currentAfter, 'A', decimals)}
                  </p>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[10.5px] leading-relaxed text-faint">
                <Info className="mt-px h-3 w-3 shrink-0" aria-hidden />
                Constant-power approximation: the capacitor is assumed not to alter the load’s
                active power or terminal voltage. Verify the compensated operating point in a full
                network study.
              </p>
            </>
          ) : (
            <div className="flex h-full min-h-40 items-center justify-center rounded-2xl border border-dashed border-line bg-raised/50 p-6 text-center">
              <div>
                <p className="text-xs font-semibold text-ink">No capacitor calculated</p>
                <p className="mx-auto mt-1 max-w-sm text-[11px] leading-relaxed text-muted">
                  {result.reason ?? 'Enter a target power factor to size the correction capacitor.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
