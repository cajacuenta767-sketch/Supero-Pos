import React, { useId } from 'react';
import { cn } from './cn';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Obligatorio: sin nombre accesible el control no existe para un lector. */
  label: string;
  /** Muestra el rótulo junto al conmutador en lugar de solo anunciarlo. */
  showLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  showLabel = false,
  disabled = false,
  className,
}) => {
  /* Un `<label>` no nombra a un `<button>`: la asociación implícita solo vale
     para controles de formulario. Con el rótulo visible, el conmutador se
     quedaba literalmente sin nombre accesible —ni `aria-label` ni nada— y para
     un lector de pantalla era «botón, activado» y ya. Se apunta al texto
     visible, que además es lo que se dice en voz alta si alguien lo dicta. */
  const labelId = useId();

  const control = (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={showLabel ? undefined : label}
      aria-labelledby={showLabel ? labelId : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
        'transition-colors duration-fast ease-ease',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        checked ? 'bg-ok' : 'bg-line-strong',
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 rounded-full bg-white',
          'transition-transform duration-fast ease-ease',
          checked ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );

  if (!showLabel) return <span className={className}>{control}</span>;

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {control}
      <span
        id={labelId}
        onClick={() => !disabled && onChange(!checked)}
        className={cn('text-base text-ink', disabled ? 'opacity-40' : 'cursor-pointer')}
      >
        {label}
      </span>
    </span>
  );
};
