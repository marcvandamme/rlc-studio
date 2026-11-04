import { AlertOctagon, AlertTriangle, CircleHelp, Sparkles } from 'lucide-react';
import type { AnalysisOutcome } from '../../domain/types';

interface ValidationPanelProps {
  outcome: AnalysisOutcome;
}

export function ValidationPanel({ outcome }: ValidationPanelProps) {
  const errors = dedupe(outcome.issues.filter((item) => item.severity === 'error'));
  const warnings = dedupe(outcome.issues.filter((item) => item.severity === 'warning'));
  const infos = dedupe(outcome.issues.filter((item) => item.severity === 'info'));

  if (errors.length === 0 && warnings.length === 0 && infos.length === 0) return null;

  return (
    <div className="space-y-2">
      {errors.length > 0 ? (
        <div className="rounded-2xl border border-rose-400/30 bg-rose-400/[0.06] p-4">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
            <AlertOctagon className="h-4 w-4 shrink-0" aria-hidden />
            <p className="text-xs font-semibold">
              {errors.length === 1 ? 'One input needs attention' : `${errors.length} inputs need attention`}
            </p>
          </div>
          <ul className="mt-2 space-y-1.5 pl-6">
            {errors.map((item) => (
              <li key={item.message} className="list-disc text-[11.5px] leading-relaxed text-rose-700/90 dark:text-rose-200/90">
                {item.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.06] p-4">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            <p className="text-xs font-semibold">Model check</p>
          </div>
          <ul className="mt-2 space-y-1.5 pl-6">
            {warnings.map((item) => (
              <li key={item.message} className="list-disc text-[11.5px] leading-relaxed text-amber-700/90 dark:text-amber-200/90">
                {item.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {infos.length > 0 ? (
        <div className="rounded-2xl border border-sky-400/30 bg-sky-400/[0.05] p-4">
          <div className="flex items-center gap-2 text-sky-700 dark:text-sky-300">
            <CircleHelp className="h-4 w-4 shrink-0" aria-hidden />
            <p className="text-xs font-semibold">Calculation note</p>
          </div>
          <ul className="mt-2 space-y-1.5 pl-6">
            {infos.map((item) => (
              <li key={item.message} className="list-disc text-[11.5px] leading-relaxed text-sky-700/90 dark:text-sky-200/90">
                {item.message}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function NotesPanel({ notes }: { notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div className="rounded-2xl border border-line bg-raised/60 p-4">
      <div className="flex items-center gap-2 text-muted">
        <Sparkles className="h-4 w-4" aria-hidden />
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em]">Engineering notes</p>
      </div>
      <ul className="mt-2 space-y-1.5">
        {notes.map((note) => (
          <li key={note} className="text-[11.5px] leading-relaxed text-muted">
            {note}
          </li>
        ))}
      </ul>
    </div>
  );
}

function dedupe<T extends { message: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.message)) return false;
    seen.add(item.message);
    return true;
  });
}
