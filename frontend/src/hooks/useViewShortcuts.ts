import { useEffect } from 'react';

export interface ViewShortcuts {
  /** F2 lleva el foco al buscador del apartado. Sin pasarlo, se busca el campo
   *  marcado por `Toolbar`, que es el caso de casi todas las vistas. */
  onFocusSearch?: () => void;
  /** «N» abre el alta del apartado. */
  onNew?: () => void;
}

/**
 * Atajos comunes a todos los apartados.
 *
 * El plan los prometía y solo llegaron a existir dentro del punto de venta:
 * en los otros trece apartados no había ninguno. Se limitan a dos, que son los
 * que se usan de verdad al trabajar con listas.
 */
export function useViewShortcuts({ onFocusSearch, onNew }: ViewShortcuts) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        target?.isContentEditable;

      if (e.key === 'F2') {
        const field = document.querySelector<HTMLInputElement>('[data-view-search]');
        if (onFocusSearch || field) {
          e.preventDefault();
          if (onFocusSearch) onFocusSearch();
          else field?.select();
        }
        return;
      }

      /* «N» sin modificadores solo cuando no se está escribiendo: si no, no se
         podría teclear una ene en ningún campo. Tampoco con un modal abierto,
         donde la tecla pertenece al formulario. */
      if (
        onNew &&
        (e.key === 'n' || e.key === 'N') &&
        !typing &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey &&
        !document.querySelector('[role="dialog"]')
      ) {
        e.preventDefault();
        onNew();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFocusSearch, onNew]);
}
