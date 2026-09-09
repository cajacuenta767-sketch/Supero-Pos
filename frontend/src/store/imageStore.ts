/**
 * Almacén de imágenes de la terminal, en IndexedDB.
 *
 * Las fotos —comprobantes de gasto, evidencia de una merma, el recuento de la
 * gaveta, el logotipo, la imagen del producto— se guardaban como data URI
 * dentro del propio registro, y los registros van a `localStorage`. Una foto de
 * 800px en WebP ocupa unos 60 KB, que en base64 se convierten en 80: con unos
 * cincuenta comprobantes se agota la cuota de 5 MB y, a partir de ahí, deja de
 * guardarse *todo* lo de esa clave —no solo la foto— hasta que alguien borre
 * datos del navegador.
 *
 * IndexedDB no tiene ese techo y guarda binario sin inflarlo. Los registros
 * pasan a llevar una referencia corta (`img_lz8k3n01`) en lugar de la imagen.
 *
 * Se degrada sin romperse: si IndexedDB no está disponible —ventana privada,
 * almacenamiento bloqueado, entorno sin DOM— se guarda en memoria, que dura lo
 * que la sesión. Es peor, pero deja trabajar.
 */
import { useEffect, useState } from 'react';
import { localId } from '../utils/ids';

const DB_NAME = 'supero_pos_imagenes';
const DB_VERSION = 1;
const STORE = 'imagenes';

/** Marca que distingue una referencia de una imagen incrustada de las de antes. */
const PREFIX = 'img_';

export const isImageRef = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.startsWith(PREFIX);

/** Respaldo en memoria para cuando IndexedDB no existe o falla. */
const memoria = new Map<string, string>();

let conexion: Promise<IDBDatabase | null> | null = null;

const abrir = (): Promise<IDBDatabase | null> => {
  if (conexion) return conexion;

  conexion = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') return resolve(null);

      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      /* Otra pestaña con una versión distinta bloquearía la apertura para
         siempre: se sigue con el respaldo en memoria en vez de colgarse. */
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });

  return conexion;
};

const transaccion = async (modo: IDBTransactionMode): Promise<IDBObjectStore | null> => {
  const db = await abrir();
  if (!db) return null;
  try {
    return db.transaction(STORE, modo).objectStore(STORE);
  } catch {
    return null;
  }
};

/**
 * Guarda una imagen y devuelve su referencia.
 *
 * Acepta un data URI —que es lo que produce el recorte en el navegador— y
 * devuelve la cadena corta que va al registro.
 */
export const putImage = async (dataUrl: string): Promise<string> => {
  const id = localId('img').replace('img-', PREFIX);
  memoria.set(id, dataUrl);

  const store = await transaccion('readwrite');
  if (store) {
    await new Promise<void>((resolve) => {
      const request = store.put(dataUrl, id);
      request.onsuccess = () => resolve();
      /* Si falla la escritura, la imagen sigue en memoria y la sesión continúa;
         se perderá al recargar, que es mejor que perder el registro entero. */
      request.onerror = () => resolve();
    });
  }

  return id;
};

/**
 * Recupera una imagen por su referencia.
 *
 * Lo que no sea una referencia se devuelve tal cual: los registros guardados
 * antes de este cambio llevan el data URI incrustado y tienen que seguir
 * viéndose.
 */
export const getImage = async (ref: string | null | undefined): Promise<string | null> => {
  if (!ref) return null;
  if (!isImageRef(ref)) return ref;

  const enMemoria = memoria.get(ref);
  if (enMemoria) return enMemoria;

  const store = await transaccion('readonly');
  if (!store) return null;

  return new Promise((resolve) => {
    const request = store.get(ref);
    request.onsuccess = () => {
      const value = typeof request.result === 'string' ? request.result : null;
      if (value) memoria.set(ref, value);
      resolve(value);
    };
    request.onerror = () => resolve(null);
  });
};

/** Borra una imagen. Un registro eliminado no debe dejar su foto ocupando sitio. */
export const deleteImage = async (ref: string | null | undefined): Promise<void> => {
  if (!isImageRef(ref)) return;
  memoria.delete(ref);
  const store = await transaccion('readwrite');
  if (!store) return;
  await new Promise<void>((resolve) => {
    const request = store.delete(ref);
    request.onsuccess = () => resolve();
    request.onerror = () => resolve();
  });
};

/** Cuántas imágenes hay guardadas. Para diagnóstico, no para la interfaz. */
export const countImages = async (): Promise<number> => {
  const store = await transaccion('readonly');
  if (!store) return memoria.size;
  return new Promise((resolve) => {
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(0);
  });
};

/**
 * Resuelve una referencia para pintarla.
 *
 * Devuelve `null` mientras busca y si no existe, así que quien la use debe
 * contemplar el hueco: la lectura de IndexedDB es asíncrona y la primera
 * pasada de render no tiene la imagen todavía.
 */
export const useStoredImage = (ref: string | null | undefined): string | null => {
  const [src, setSrc] = useState<string | null>(isImageRef(ref) ? null : (ref ?? null));

  useEffect(() => {
    let vigente = true;
    void getImage(ref).then((value) => {
      if (vigente) setSrc(value);
    });
    return () => {
      vigente = false;
    };
  }, [ref]);

  return src;
};
