import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Formula } from '../ui/Formula';

interface StepCardProps {
  index: number;
  title: string;
  subtitle: string;
  formulas: Array<{ latex: string; caption?: string }>;
  children: ReactNode;
  className?: string;
  footnote?: ReactNode;
}

export function StepCard({
  index,
  title,
  subtitle,
  formulas,
  children,
  className,
  footnote,
}: StepCardProps) {
  return (
    <article className={cn('card overflow-hidden', className)}>
      <header className="flex items-start gap-3 border-b border-line bg-raised/60 px-5 py-4">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-accent/10 font-mono text-xs font-bold text-accent ring-1 ring-accent/20">
          {String(index).padStart(2, '0')}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-ink">{title}</h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">{subtitle}</p>
        </div>
      </header>
      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)]">
        <div className="min-w-0">
          <div className="card-inset space-y-3 px-4 py-3">
            {formulas.map((formula) => (
              <div key={formula.latex}>
                <Formula latex={formula.latex} block className="text-[13px]" />
                {formula.caption ? (
                  <p className="mt-1 text-[10.5px] leading-snug text-faint">{formula.caption}</p>
                ) : null}
              </div>
            ))}
          </div>
          {footnote ? <div className="mt-3 text-[11px] leading-relaxed text-muted">{footnote}</div> : null}
        </div>
        <div className="min-w-0">{children}</div>
      </div>
    </article>
  );
}

interface ResultRowProps {
  label: string;
  symbol?: string;
  value: ReactNode;
  tone?: 'default' | 'muted' | 'accent' | 'warning';
  sub?: ReactNode;
}

export function ResultRow({ label, symbol, value, tone = 'default', sub }: ResultRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-line py-2 first:pt-0 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">
          {label}
          {symbol ? <span className="ml-1.5 font-mono text-[10px] text-faint">{symbol}</span> : null}
        </p>
        {sub ? <p className="mt-0.5 text-[10.5px] leading-snug text-faint">{sub}</p> : null}
      </div>
      <p
        className={cn(
          'value-mono shrink-0 text-right text-[13px] font-semibold',
          tone === 'muted' && 'text-muted',
          tone === 'accent' && 'text-accent',
          tone === 'warning' && 'text-amber-600 dark:text-amber-300',
          tone === 'default' && 'text-ink',
        )}
      >
        {value}
      </p>
    </div>
  );
}

interface ResultTileProps {
  label: string;
  symbol?: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: 'default' | 'inductive' | 'capacitive' | 'resonant' | 'accent';
}

const TILE_TONES: Record<NonNullable<ResultTileProps['tone']>, string> = {
  default: 'text-ink',
  inductive: 'text-inductive',
  capacitive: 'text-capacitive',
  resonant: 'text-resonant',
  accent: 'text-accent',
};

export function ResultTile({ label, symbol, value, sub, tone = 'default' }: ResultTileProps) {
  return (
    <div className="rounded-xl border border-line bg-raised/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-faint">
        {label}
        {symbol ? <span className="ml-1 font-mono text-[9px] tracking-normal">{symbol}</span> : null}
      </p>
      <p className={cn('value-mono mt-1 text-[15px] font-semibold', TILE_TONES[tone])}>{value}</p>
      {sub ? <p className="mt-0.5 text-[10px] leading-snug text-muted">{sub}</p> : null}
    </div>
  );
}
