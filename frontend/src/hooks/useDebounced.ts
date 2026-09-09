import { useEffect, useState } from 'react';

/**
 * Retrasa la propagación de un valor.
 *
 * Los buscadores filtraban en cada pulsación sobre la lista entera: con
 * doscientas filas y una tabla que se reordena, teclear se nota. Ciento
 * cincuenta milisegundos son imperceptibles al escribir y suficientes para no
 * recalcular ocho veces por palabra.
 */
export function useDebounced<T>(value: T, delayMs = 150): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);

  return debounced;
}
