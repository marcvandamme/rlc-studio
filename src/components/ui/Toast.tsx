import { CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { cn } from '../../lib/cn';

export interface ToastData {
  id: number;
  message: string;
  tone: 'success' | 'error' | 'info';
}

interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(onDismiss, 4200);
    return () => window.clearTimeout(timer);
  }, [toast, onDismiss]);

  if (!toast) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-fade-up"
    >
      <div
        className={cn(
          'flex items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-lift backdrop-blur-xl',
          toast.tone === 'success' && 'border-accent/30 bg-surface/95 text-ink',
          toast.tone === 'error' && 'border-rose-400/40 bg-surface/95 text-ink',
          toast.tone === 'info' && 'border-line bg-surface/95 text-ink',
        )}
      >
        {toast.tone === 'success' ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        ) : toast.tone === 'error' ? (
          <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" aria-hidden />
        ) : (
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sky-500" aria-hidden />
        )}
        <p className="flex-1 text-xs leading-relaxed text-ink">{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-0.5 rounded p-0.5 text-faint transition hover:text-ink"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
