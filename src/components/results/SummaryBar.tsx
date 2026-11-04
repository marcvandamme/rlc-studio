import { Activity, Gauge, RadioTower, Zap, BatteryCharging } from 'lucide-react';
import type { CircuitAnalysis, CircuitState } from '../../domain/types';
import {
  formatAngle,
  formatFixed,
  formatPF,
  formatSI,
} from '../../domain/format';
import { cn } from '../../lib/cn';

const STATE_TONE: Record<CircuitState, 'inductive' | 'capacitive' | 'resonant' | 'accent'> = {
  inductive: 'inductive',
  capacitive: 'capacitive',
  resonant: 'resonant',
  resistive: 'accent',
};

const STATE_BG: Record<CircuitState, string> = {
  inductive: 'from-inductive/10',
  capacitive: 'from-capacitive/10',
  resonant: 'from-resonant/10',
  resistive: 'from-accent/10',
};

function stateTitle(analysis: CircuitAnalysis): string {
  if (analysis.atResonance) return 'At resonance';
  switch (analysis.state) {
    case 'inductive':
      return 'Inductive';
    case 'capacitive':
      return 'Capacitive';
    case 'resistive':
      return 'Resistive';
    default:
      return 'Reactive';
  }
}

function stateDescription(analysis: CircuitAnalysis, decimals: number): string {
  const { topology, powers, atResonance } = analysis;
  const phase = formatAngle(Math.abs(powers.phaseDeg), decimals);
  const branch = topology === 'series' ? 'series' : 'parallel';

  if (atResonance) {
    return topology === 'series'
      ? 'X_L ≈ X_C — the reactances cancel, so the series impedance is at its minimum and the current peaks.'
      : 'X_L ≈ X_C — the tank susceptances cancel, so the parallel impedance peaks and the line current dips.';
  }
  if (analysis.state === 'resistive') {
    return 'Voltage and current are in phase. There is no net reactive component in this circuit.';
  }
  if (powers.nature === 'undefined') {
    return 'The line current is zero, so the power factor is undefined at this ideal operating point.';
  }
  if (analysis.state === 'inductive') {
    return topology === 'series'
      ? `Current lags the voltage by ${phase} (${branch}). X_L dominates X_C.`
      : `The inductive branch draws more current, so the line current lags by ${phase} (${branch}).`;
  }
  return topology === 'series'
    ? `Current leads the voltage by ${phase} (${branch}). X_C dominates X_L.`
    : `The capacitive branch draws more current, so the line current leads by ${phase} (${branch}).`;
}

interface SummaryBarProps {
  analysis: CircuitAnalysis;
  decimals: number;
}

export function SummaryBar({ analysis, decimals }: SummaryBarProps) {
  const tone = STATE_TONE[analysis.state];
  const pf = formatPF(analysis.powers.factor, decimals);
  const phase = formatAngle(analysis.powers.phaseDeg, decimals);
  const q = formatFixed(analysis.resonance?.qFactor ?? null, decimals);
  const f0 = analysis.resonance ? formatSI(analysis.resonance.frequency, 'Hz', decimals) : '—';

  return (
    <section className="space-y-3">
      <div
        className={cn(
          'card relative overflow-hidden bg-gradient-to-br to-transparent p-5',
          STATE_BG[analysis.state],
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full border border-line/70 opacity-50"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full border border-line/60 opacity-60"
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <span
              className={cn(
                'mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border',
                tone === 'inductive' && 'border-inductive/30 bg-inductive/10 text-inductive',
                tone === 'capacitive' && 'border-capacitive/30 bg-capacitive/10 text-capacitive',
                tone === 'resonant' && 'border-resonant/30 bg-resonant/10 text-resonant',
                tone === 'accent' && 'border-accent/30 bg-accent/10 text-accent',
              )}
            >
              <Activity className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="eyebrow">Operating point</p>
              <h2 className="mt-0.5 text-xl font-semibold tracking-tight text-ink">
                {stateTitle(analysis)}
              </h2>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-muted">
                {stateDescription(analysis, decimals)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-full border border-line bg-surface/80 px-2.5 py-1 font-mono text-[10px] font-medium text-muted">
              f = {formatSI(analysis.frequency, 'Hz', decimals)}
            </span>
            <span className="rounded-full border border-line bg-surface/80 px-2.5 py-1 font-mono text-[10px] font-medium text-muted">
              {analysis.topology}
            </span>
            <span className="rounded-full border border-line bg-surface/80 px-2.5 py-1 font-mono text-[10px] font-medium text-muted">
              φ = {phase}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          icon={<Gauge className="h-4 w-4" />}
          label="Impedance"
          symbol="|Z|"
          value={formatSI(analysis.impedance.magnitude, 'Ω', decimals)}
          sub={`∠ ${formatAngle(analysis.impedance.angleDeg, decimals)}`}
        />
        <StatCard
          icon={<Zap className="h-4 w-4" />}
          label="Current"
          symbol="I"
          value={formatSI(analysis.source.current, 'A', decimals)}
          sub={`∠ ${formatAngle(analysis.source.currentAngleDeg, decimals)} vs. U`}
        />
        <StatCard
          icon={<BatteryCharging className="h-4 w-4" />}
          label="Voltage"
          symbol="U"
          value={formatSI(analysis.source.voltage, 'V', decimals)}
          sub={
            analysis.source.drive === 'current'
              ? 'derived from current source'
              : analysis.source.drive === 'voltage+current'
                ? 'voltage drive (I checked)'
                : 'voltage drive'
          }
        />
        <StatCard
          icon={<Activity className="h-4 w-4" />}
          label="Power factor"
          symbol="cos φ"
          value={pf}
          sub={`φ = ${phase} · ${analysis.powers.nature}`}
        />
        <StatCard
          icon={<RadioTower className="h-4 w-4" />}
          label="Resonance"
          symbol="f₀"
          value={f0}
          sub={
            analysis.resonance
              ? `Q = ${q} · BW = ${formatSI(analysis.resonance.bandwidth, 'Hz', decimals)}`
              : 'requires both L and C'
          }
        />
      </div>
    </section>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  symbol: string;
  value: string;
  sub: string;
}

function StatCard({ icon, label, symbol, value, sub }: StatCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-raised text-muted">
          {icon}
        </span>
      </div>
      <div className="mt-2 flex items-baseline gap-1.5">
        <p className="value-mono text-[21px] font-semibold leading-none tracking-tight text-ink">
          {value}
        </p>
        <span className="font-mono text-[10px] font-medium text-faint">{symbol}</span>
      </div>
      <p className="mt-2 truncate text-[10.5px] text-muted" title={sub}>
        {sub}
      </p>
    </div>
  );
}
