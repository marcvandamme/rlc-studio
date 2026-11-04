import { BookOpen, Calculator, Moon, Sun } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { cn } from '../../lib/cn';

export type AppTab = 'calculator' | 'theory';

interface HeaderProps {
  tab: AppTab;
  onTabChange: (tab: AppTab) => void;
  precision: number;
  onPrecisionChange: (value: number) => void;
}

const TABS: Array<{ id: AppTab; label: string; icon: React.ReactNode }> = [
  { id: 'calculator', label: 'Calculator', icon: <Calculator className="h-3.5 w-3.5" /> },
  { id: 'theory', label: 'Theory & formulas', icon: <BookOpen className="h-3.5 w-3.5" /> },
];

export function Header({ tab, onTabChange, precision, onPrecisionChange }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-canvas/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 lg:px-8">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-900 text-accent shadow-sm ring-1 ring-white/10 dark:bg-slate-950">
            <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
              <path
                d="M3 16c3 0 3-8 6.5-8S13 24 16.5 24 20 8 23.5 8 26 16 29 16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <circle cx="16" cy="16" r="1.7" fill="#fbbf24" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <h1 className="truncate text-sm font-semibold tracking-tight text-ink">RLC Studio</h1>
              <span className="hidden rounded border border-line bg-raised px-1 py-px font-mono text-[8px] font-medium text-faint sm:inline">
                1.0
              </span>
            </div>
            <p className="hidden text-[9.5px] font-medium uppercase tracking-[0.16em] text-faint sm:block">
              AC circuit lab
            </p>
          </div>
        </div>

        <nav
          aria-label="Primary navigation"
          className="order-3 flex w-full items-center gap-1 rounded-xl border border-line bg-raised/70 p-1 sm:order-none sm:ml-4 sm:w-auto"
        >
          {TABS.map((item) => {
            const active = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex h-8 flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 text-[11px] font-semibold transition sm:flex-none',
                  active
                    ? 'bg-surface text-ink shadow-sm ring-1 ring-line'
                    : 'text-muted hover:text-ink',
                )}
              >
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <label className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2 py-1.5 shadow-sm">
            <span className="hidden text-[9px] font-semibold uppercase tracking-[0.12em] text-faint md:inline">
              Precision
            </span>
            <select
              value={precision}
              onChange={(event) => onPrecisionChange(Number(event.target.value))}
              aria-label="Decimal places"
              className="cursor-pointer bg-transparent font-mono text-[11px] font-medium text-ink outline-none"
            >
              {Array.from({ length: 7 }, (_, index) => (
                <option key={index} value={index}>
                  {index} dp
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            title={theme === 'dark' ? 'Light theme' : 'Dark theme'}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-surface text-muted shadow-sm transition hover:bg-raised hover:text-ink"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
