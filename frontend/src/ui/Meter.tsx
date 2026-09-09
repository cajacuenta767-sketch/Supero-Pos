import React from 'react';
import { cn } from './cn';

type Tone = 'accent' | 'success' | 'warning' | 'danger' | 'neutral';

const FILL: Record<Tone, string> = {
  accent: 'bg-accent',
  success: 'bg-ok',
  warning: 'bg-warn',
  danger: 'bg-danger',
  neutral: 'bg-ink-3',
};

export interface MeterProps {
  value: number;
  max?: number;
  /** Rótulo accesible; también se muestra si se pasa `showLabel`. */
  label: string;
  showLabel?: boolean;
  /** Texto a la derecha del rótulo: la cifra, el porcentaje, lo que aplique. */
  hint?: React.ReactNode;
  tone?: Tone;
  className?: string;
}

/**
 * Barra de proporción. Una cifra dice cuánto; la barra dice cuánto *comparado
 * con qué*, que es la pregunta real en un desglose por categoría o en una
 * jornada contra su horario pactado.
 */
export const Meter: React.FC<MeterProps> = ({
  value,
  max = 100,
  label,
  showLabel = false,
  hint,
  tone = 'accent',
  className,
}) => {
  const safeMax = max > 0 ? max : 1;
  const pct = Math.max(0, Math.min(100, (value / safeMax) * 100));

  return (
    <div className={cn('space-y-1.5', className)}>
      {(showLabel || hint) && (
        <div className="flex items-baseline justify-between gap-3">
          {showLabel && <span className="text-body text-ink-2 truncate">{label}</span>}
          {hint && <span className="text-body font-semibold text-ink shrink-0">{hint}</span>}
        </div>
      )}
      <div
        role="meter"
        aria-label={label}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        className="h-2 w-full rounded-full bg-sunken overflow-hidden"
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-base ease-ease',
            FILL[tone],
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
