import type { Topology } from '../../domain/types';
import { cn } from '../../lib/cn';

interface TopologySelectorProps {
  value: Topology;
  onChange: (value: Topology) => void;
}

function SeriesIcon() {
  return (
    <svg viewBox="0 0 120 58" className="h-12 w-full" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 44V18h12" strokeLinecap="round" />
      <path d="M20 18l3-5 5 10 5-10 5 10 5-10 5 10 3-5h10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M66 18h8" strokeLinecap="round" />
      <path d="M74 13c0-4 5-4 5 0s5 4 5 0 5-4 5 0 5 4 5 0" strokeLinecap="round" />
      <path d="M94 18h8" strokeLinecap="round" />
      <path d="M102 12v12M108 12v12" strokeLinecap="round" />
      <path d="M108 18h4v26H66" strokeLinecap="round" />
      <circle cx="56" cy="44" r="6" />
      <path d="M8 44h42M62 44h4M108 44" strokeLinecap="round" />
      <path d="M52 44c2-4 4-4 6 0s4 4 6 0" strokeWidth="1" />
      <text x="30" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="monospace">R</text>
      <text x="80" y="8" fontSize="7" fill="currentColor" stroke="none" fontFamily="monospace">L</text>
      <text x="101" y="6" fontSize="7" fill="currentColor" stroke="none" fontFamily="monospace">C</text>
    </svg>
  );
}

function ParallelIcon() {
  return (
    <svg viewBox="0 0 120 58" className="h-12 w-full" aria-hidden fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M22 10v38" strokeLinecap="round" />
      <path d="M22 10h10M22 22h10M22 44h10M96 10h10M96 22h10M96 44h10" strokeLinecap="round" />
      <path d="M32 10h4M36 10l3-5 5 10 5-10 5 10 5-10 3 5h4" strokeLinejoin="round" />
      <path d="M70 10h26" strokeLinecap="round" />
      <path d="M32 22h8M48 22h8" strokeLinecap="round" />
      <path d="M40 17c0-4 4-4 4 0s4 4 4 0" strokeLinecap="round" />
      <path d="M56 17c0-4 4-4 4 0s4 4 4 0" strokeLinecap="round" />
      <path d="M64 22h32" strokeLinecap="round" />
      <path d="M32 44h6M44 38v12M50 38v12M50 44h46" strokeLinecap="round" />
      <path d="M106 10v38" strokeLinecap="round" />
      <circle cx="22" cy="33" r="5" />
      <path d="M18 33c1.5-3 3-3 4.5 0s3 3 4.5 0" strokeWidth="1" />
      <text x="42" y="5" fontSize="7" fill="currentColor" stroke="none" fontFamily="monospace">R</text>
      <text x="51" y="31" fontSize="7" fill="currentColor" stroke="none" fontFamily="monospace">L</text>
      <text x="43" y="56" fontSize="7" fill="currentColor" stroke="none" fontFamily="monospace">C</text>
    </svg>
  );
}

const OPTIONS: Array<{
  value: Topology;
  title: string;
  blurb: string;
  icon: React.ReactNode;
}> = [
  {
    value: 'series',
    title: 'Series',
    blurb: 'One current path',
    icon: <SeriesIcon />,
  },
  {
    value: 'parallel',
    title: 'Parallel',
    blurb: 'Shared voltage',
    icon: <ParallelIcon />,
  },
];

export function TopologySelector({ value, onChange }: TopologySelectorProps) {
  return (
    <div>
      <div role="radiogroup" aria-label="Circuit topology" className="grid grid-cols-2 gap-2">
        {OPTIONS.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                'group rounded-2xl border px-3 pb-2.5 pt-2 text-left transition',
                active
                  ? 'border-accent/50 bg-accent/[0.055] shadow-sm ring-1 ring-accent/15'
                  : 'border-line bg-surface hover:border-faint/50 hover:bg-raised',
              )}
            >
              <div className={cn('transition', active ? 'text-accent' : 'text-muted')}>{option.icon}</div>
              <div className="mt-1 flex items-center justify-between gap-1">
                <span className={cn('text-xs font-semibold', active ? 'text-ink' : 'text-muted')}>
                  {option.title}
                </span>
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full transition',
                    active ? 'bg-accent' : 'bg-line',
                  )}
                  aria-hidden
                />
              </div>
              <p className="text-[9.5px] leading-snug text-faint">{option.blurb}</p>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10.5px] leading-relaxed text-muted">
        {value === 'series'
          ? 'Components share one current; their voltages add as phasors.'
          : 'Branches share one voltage; their currents add as phasors.'}
      </p>
    </div>
  );
}
