import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
}

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-accent text-accentInk shadow-sm hover:brightness-105 active:brightness-95 disabled:opacity-50',
  secondary:
    'border border-line bg-surface text-ink shadow-sm hover:border-faint/50 hover:bg-raised disabled:opacity-50',
  ghost: 'text-muted hover:bg-raised hover:text-ink disabled:opacity-50',
  danger: 'bg-rose-500 text-white shadow-sm hover:bg-rose-600 disabled:opacity-50',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 gap-1.5 rounded-lg px-2.5 text-xs font-semibold',
  md: 'h-10 gap-2 rounded-xl px-3.5 text-sm font-semibold',
};

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex select-none items-center justify-center whitespace-nowrap transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
