import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
type Size = 'sm' | 'md' | 'lg' | 'pos';

const VARIANT: Record<Variant, string> = {
  primary:   'bg-accent text-white hover:bg-accent-hover shadow-e1',
  secondary: 'bg-raised text-ink border border-line-strong hover:bg-sunken',
  ghost:     'text-ink-2 hover:bg-sunken hover:text-ink',
  danger:    'bg-danger text-white hover:opacity-90 shadow-e1',
  success:   'bg-ok text-white hover:opacity-90 shadow-e1',
};

/* Objetivo táctil: 44px mínimo en POS, 36px en administración. */
const SIZE: Record<Size, string> = {
  sm:  'h-8 px-3 text-body gap-1.5 rounded-sm',
  md:  'h-9 px-4 text-body gap-2 rounded-md',
  lg:  'h-11 px-5 text-base gap-2 rounded-md',
  pos: 'h-16 px-6 text-title gap-3 rounded-lg',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
  block?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary', size = 'md', loading = false, icon,
  block = false, className, children, disabled, ...rest
}) => (
  <button
    {...rest}
    disabled={disabled || loading}
    className={cn(
      'inline-flex items-center justify-center font-semibold select-none',
      'transition-colors duration-fast ease-ease',
      'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
      VARIANT[variant], SIZE[size], block && 'w-full', className,
    )}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
    {children}
  </button>
);
