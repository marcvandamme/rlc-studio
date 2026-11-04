import { cn } from '../../lib/cn';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}

export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-50',
        checked ? 'border-accent bg-accent' : 'border-line bg-raised',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block h-3.5 w-3.5 transform rounded-full shadow-sm transition',
          checked ? 'translate-x-[18px] bg-accentInk' : 'translate-x-[3px] bg-muted',
        )}
      />
    </button>
  );
}
