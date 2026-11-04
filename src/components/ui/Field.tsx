import { AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useId, type ChangeEvent } from 'react';
import { cn } from '../../lib/cn';

interface FieldProps {
  label: string;
  symbol?: string;
  value: string;
  onChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  warning?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export function Field({
  label,
  symbol,
  value,
  onChange,
  unit,
  placeholder,
  hint,
  error,
  warning,
  disabled,
  className,
  inputClassName,
}: FieldProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const message = error ?? warning ?? hint;
  const tone = error ? 'error' : warning ? 'warning' : 'hint';

  return (
    <div className={cn('min-w-0', className)}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="text-xs font-semibold text-ink">
          {label}
          {symbol ? (
            <span className="ml-1.5 font-mono text-[10px] font-medium text-faint">{symbol}</span>
          ) : null}
        </label>
        {hint && message !== hint ? (
          <span className="truncate text-[10px] text-faint">{hint}</span>
        ) : null}
      </div>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? messageId : undefined}
          className={cn(
            'field-input',
            unit ? 'pr-14' : '',
            error && 'field-input-error',
            disabled && 'cursor-not-allowed opacity-60',
            inputClassName,
          )}
        />
        {unit ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center font-mono text-[11px] font-medium text-muted"
          >
            {unit}
          </span>
        ) : null}
      </div>
      {message ? (
        <p
          id={messageId}
          className={cn(
            'mt-1.5 flex items-start gap-1 text-[10.5px] leading-snug',
            tone === 'error'
              ? 'text-rose-600 dark:text-rose-400'
              : tone === 'warning'
                ? 'text-amber-700 dark:text-amber-300'
                : 'text-faint',
          )}
        >
          {tone === 'error' ? (
            <AlertCircle className="mt-px h-3 w-3 shrink-0" aria-hidden />
          ) : tone === 'warning' ? (
            <AlertTriangle className="mt-px h-3 w-3 shrink-0" aria-hidden />
          ) : (
            <Info className="mt-px h-3 w-3 shrink-0 opacity-60" aria-hidden />
          )}
          <span>{message}</span>
        </p>
      ) : null}
    </div>
  );
}
