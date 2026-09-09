import React from 'react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { cn } from './cn';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const ICON_TONE: Record<Tone, string> = {
  neutral: 'bg-sunken text-ink-2',
  accent: 'bg-accent-soft text-accent-ink',
  success: 'bg-ok-soft text-ok-ink',
  warning: 'bg-warn-soft text-warn-ink',
  danger: 'bg-danger-soft text-danger-ink',
};

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  delta?: number;
  hint?: string;
  icon?: React.ReactNode;
  tone?: Tone;
  className?: string;
}

export const StatTile: React.FC<StatTileProps> = ({
  label,
  value,
  delta,
  hint,
  icon,
  tone = 'neutral',
  className,
}) => (
  <div className={cn('bg-raised border border-line rounded-lg shadow-e1 p-4 space-y-3', className)}>
    <div className="flex items-start justify-between gap-2">
      <span className="text-micro uppercase text-ink-2">{label}</span>
      {icon && (
        <span
          className={cn(
            'w-8 h-8 rounded-md flex items-center justify-center shrink-0',
            ICON_TONE[tone],
          )}
        >
          {icon}
        </span>
      )}
    </div>

    <div className="text-display text-ink font-mono tnum">{value}</div>

    <div className="flex items-center gap-2 min-h-[1.125rem]">
      {typeof delta === 'number' && (
        <span
          className={cn(
            'inline-flex items-center gap-0.5 text-body font-semibold',
            delta >= 0 ? 'text-ok' : 'text-danger',
          )}
        >
          {delta >= 0 ? (
            <ArrowUpRight className="w-3.5 h-3.5" />
          ) : (
            <ArrowDownRight className="w-3.5 h-3.5" />
          )}
          {Math.abs(delta).toFixed(1)}%
        </span>
      )}
      {hint && <span className="text-body text-ink-3 truncate">{hint}</span>}
    </div>
  </div>
);
