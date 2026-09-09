import React from 'react';
import { cn } from './cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONE: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-2 border-line-strong',
  accent: 'bg-accent-soft text-accent-ink border-accent/25',
  success: 'bg-ok-soft text-ok-ink border-ok/25',
  warning: 'bg-warn-soft text-warn-ink border-warn/30',
  danger: 'bg-danger-soft text-danger-ink border-danger/25',
};

export interface BadgeProps {
  tone?: Tone;
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  size = 'sm',
  icon,
  className,
  children,
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 border rounded-sm font-semibold whitespace-nowrap',
      size === 'sm' ? 'text-micro px-1.5 h-5' : 'text-body px-2.5 h-7',
      TONE[tone],
      className,
    )}
  >
    {icon}
    {children}
  </span>
);
