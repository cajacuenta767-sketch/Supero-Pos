import React from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'accent' | 'danger';

const TONE: Record<Tone, string> = {
  neutral: 'text-ink-2 hover:text-ink hover:bg-sunken',
  accent:  'text-accent hover:bg-accent-soft',
  danger:  'text-danger hover:bg-danger-soft',
};

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Obligatorio: sin rótulo accesible el control no existe para un lector de pantalla. */
  label: string;
  tone?: Tone;
  size?: 'sm' | 'md' | 'touch';
}

export const IconButton: React.FC<IconButtonProps> = ({
  label, tone = 'neutral', size = 'md', className, children, ...rest
}) => (
  <button
    {...rest}
    aria-label={label}
    title={label}
    className={cn(
      'inline-flex items-center justify-center rounded-md shrink-0',
      'transition-colors duration-fast ease-ease disabled:opacity-40 disabled:cursor-not-allowed',
      size === 'sm' ? 'w-7 h-7' : size === 'touch' ? 'w-touch h-touch' : 'w-9 h-9',
      TONE[tone], className,
    )}
  >
    {children}
  </button>
);
