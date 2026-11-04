import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Tone = 'neutral' | 'accent' | 'inductive' | 'capacitive' | 'resonant' | 'warning' | 'error' | 'info';

const TONES: Record<Tone, string> = {
  neutral: 'border-line bg-raised text-muted',
  accent: 'border-accent/30 bg-accent/10 text-accent',
  inductive: 'border-inductive/30 bg-inductive/10 text-inductive',
  capacitive: 'border-capacitive/30 bg-capacitive/10 text-capacitive',
  resonant: 'border-resonant/30 bg-resonant/10 text-resonant',
  warning:
    'border-amber-400/40 bg-amber-400/10 text-amber-700 dark:text-amber-300',
  error: 'border-rose-400/40 bg-rose-400/10 text-rose-700 dark:text-rose-300',
  info: 'border-sky-400/40 bg-sky-400/10 text-sky-700 dark:text-sky-300',
};

interface BadgeProps {
  tone?: Tone;
  children: ReactNode;
  className?: string;
  dot?: boolean;
}

export function Badge({ tone = 'neutral', children, className, dot = false }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tracking-wide',
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden /> : null}
      {children}
    </span>
  );
}
