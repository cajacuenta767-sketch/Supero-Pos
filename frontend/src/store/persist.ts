import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Persistencia local de los datos de cada apartado.
 *
 * Cada vista guardaba sus registros en un `useState` que se destruye al
 * desmontarla: se registraba un gasto, se navegaba a otra pantalla y al volver
 * la fila había desaparecido. Pasaba en trece de los quince apartados.
 *
 * Esto no sustituye al backend —la fuente de verdad sigue siendo el servidor
 * cuando hay red—, pero sí evita que el trabajo de una jornada se evapore por
 * cambiar de pestaña o recargar la terminal.
 */

const PREFIX = 'supero_pos_data_';

/** Versión del formato. Al subirla se descarta lo guardado en lugar de intentar
 *  interpretar una estructura que ya no coincide con el código. */
const VERSION = 1;

interface Envelope<T> {
  v: number;
  data: T;
}

/**
 * Acceso seguro al almacenamiento.
 *
 * No siempre existe: ventana privada, navegador con el almacenamiento
 * bloqueado, captura de miniaturas, o simplemente un entorno sin DOM. Sin esta
 * comprobación, el `catch` de abajo intentaba `localStorage.removeItem` y volvía
 * a lanzar, así que el error escapaba y tumbaba el módulo al importarlo.
 */
const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export const readPersisted = <T>(key: string): T | null => {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (parsed.v !== VERSION) {
      store.removeItem(PREFIX + key);
      return null;
    }
    return parsed.data;
  } catch {
    // Un valor corrupto no debe impedir abrir la vista: se descarta.
    try {
      store.removeItem(PREFIX + key);
    } catch {
      /* Si ni siquiera se puede borrar, se sigue sin él. */
    }
    return null;
  }
};

export const writePersisted = <T>(key: string, data: T): boolean => {
  const store = storage();
  if (!store) return false;
  try {
    store.setItem(PREFIX + key, JSON.stringify({ v: VERSION, data }));
    return true;
  } catch {
    /* Cuota agotada: las fotos en base64 la llenan rápido. No se interrumpe el
       trabajo, pero se avisa una vez para que no pase inadvertido. */
    console.error(
      `No se pudo guardar «${key}»: almacenamiento local lleno. ` +
        'Los cambios siguen en memoria y se perderán al recargar.',
    );
    return false;
  }
};

export const clearPersisted = () => {
  const store = storage();
  if (!store) return;
  try {
    for (const key of Object.keys(store)) {
      if (key.startsWith(PREFIX)) store.removeItem(key);
    }
  } catch {
    /* Sin almacenamiento no hay nada que limpiar. */
  }
};

/**
 * `useState` que sobrevive al desmontaje y a la recarga.
 *
 * Se usa igual que `useState`, así que migrar una vista es cambiar una línea.
 */
export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => readPersisted<T>(key) ?? initial);

  /* El primer render no debe reescribir lo que se acaba de leer: solo se guarda
     a partir del primer cambio real. */
  const hydrated = useRef(false);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    writePersisted(key, value);
  }, [key, value]);

  const reset = useCallback(() => {
    setValue(initial);
    writePersisted(key, initial);
  }, [key, initial]);

  return [value, setValue, reset] as const;
}
