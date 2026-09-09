import React, { useRef } from 'react';
import { cn } from './cn';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /** Contador opcional a la derecha del rótulo. */
  count?: number;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** Rótulo accesible del grupo, p. ej. "Secciones de ajustes". */
  label: string;
  className?: string;
}

/**
 * Navegación en segmentos. Las pestañas son navegación, no contenido: viven
 * fuera del cuadro que gobiernan. Bajo 768px colapsan a un desplegable, que es
 * lo único que cabe sin cortar rótulos.
 *
 * Se anuncian como pestañas —`tablist` y `tab`—, no como una lista de enlaces:
 * cambian el panel de la misma pantalla, no llevan a otra. Con eso, quien usa
 * lector sabe cuántas hay y en cuál está, y las flechas recorren el grupo,
 * que es lo que espera cualquiera que navegue con teclado. Antes eran botones
 * sueltos dentro de un `nav`: el tabulador tenía que pasar por las cuatro para
 * salir del grupo y nada decía que fueran alternativas entre sí.
 */
export const Tabs: React.FC<TabsProps> = ({ items, value, onChange, label, className }) => {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const move = (event: React.KeyboardEvent, index: number) => {
    const last = items.length - 1;
    let next: number | null = null;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = index === last ? 0 : index + 1;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = index === 0 ? last : index - 1;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = last;
    if (next === null) return;

    event.preventDefault();
    const target = items[next];
    onChange(target.id);
    refs.current[target.id]?.focus();
  };

  return (
    <>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        className={cn(
          'hidden sm:flex rounded-md border border-line overflow-hidden shrink-0',
          className,
        )}
      >
        {items.map((t, index) => {
          const active = t.id === value;
          return (
            <button
              key={t.id}
              ref={(el) => {
                refs.current[t.id] = el;
              }}
              role="tab"
              type="button"
              aria-selected={active}
              /* Foco itinerante: el grupo entero es una parada del tabulador y
                 dentro se recorre con las flechas. */
              tabIndex={active ? 0 : -1}
              onKeyDown={(e) => move(e, index)}
              onClick={() => onChange(t.id)}
              className={cn(
                'h-9 px-4 inline-flex items-center gap-2 text-body font-semibold whitespace-nowrap',
                'transition-colors duration-fast ease-ease',
                'border-r border-line last:border-r-0',
                active ? 'bg-accent-soft text-accent-ink' : 'bg-raised text-ink-2 hover:text-ink',
              )}
            >
              {t.icon}
              {t.label}
              {typeof t.count === 'number' && (
                <span className="font-mono tnum text-micro text-ink-3">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bajo 768px un desplegable: seis rótulos en fila no caben sin partirse. */}
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sm:hidden h-9 px-2.5 w-full bg-raised border border-line-strong rounded-md text-body font-semibold text-ink cursor-pointer"
      >
        {items.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
    </>
  );
};
