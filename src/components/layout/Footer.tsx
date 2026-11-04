import { Scale } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-10 border-t border-line bg-surface/40">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[10.5px] text-faint lg:px-8">
        <p>
          <span className="font-semibold text-muted">RLC Studio</span> · sinusoidal steady-state
          analysis with RMS phasors and ideal components.
        </p>
        <div className="flex items-center gap-4">
          <span className="font-mono">v1.0.0</span>
          <span className="inline-flex items-center gap-1">
            <Scale className="h-3 w-3" aria-hidden />
            MIT licensed
          </span>
        </div>
      </div>
    </footer>
  );
}
