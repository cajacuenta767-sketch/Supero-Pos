import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPersisted, readPersisted, writePersisted } from './persist';

// Doble de localStorage: las pruebas corren en Node, sin navegador.
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    get length() {
      return store.size;
    },
    key: (i: number) => [...store.keys()][i] ?? null,
  });
  // Object.keys(localStorage) recorre las claves propias del objeto real.
  vi.stubGlobal(
    'Object',
    new Proxy(Object, {
      get(target, prop, receiver) {
        if (prop === 'keys') {
          return (obj: unknown) =>
            obj === globalThis.localStorage ? [...store.keys()] : Reflect.ownKeys(obj as object);
        }
        return Reflect.get(target, prop, receiver);
      },
    }),
  );
});

describe('ida y vuelta', () => {
  it('devuelve lo guardado', () => {
    writePersisted('gastos', [{ id: 'EXP-1', amount: 50 }]);
    expect(readPersisted('gastos')).toEqual([{ id: 'EXP-1', amount: 50 }]);
  });

  it('devuelve null cuando no hay nada', () => {
    expect(readPersisted('inexistente')).toBeNull();
  });
});

describe('datos que no se pueden interpretar', () => {
  it('descarta un valor corrupto en vez de lanzar', () => {
    store.set('supero_pos_data_gastos', '{esto no es json');
    expect(readPersisted('gastos')).toBeNull();
    // Y lo borra, para no volver a tropezar con él en cada arranque.
    expect(store.has('supero_pos_data_gastos')).toBe(false);
  });

  it('descarta una versión de formato distinta', () => {
    store.set('supero_pos_data_gastos', JSON.stringify({ v: 99, data: [1, 2] }));
    expect(readPersisted('gastos')).toBeNull();
  });
});

describe('almacenamiento lleno', () => {
  it('no interrumpe el trabajo: informa y sigue', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new DOMException('QuotaExceededError');
      },
    });

    expect(writePersisted('gastos', [1, 2, 3])).toBe(false);
    expect(error).toHaveBeenCalled();
    error.mockRestore();
  });
});

describe('limpieza al cerrar sesión', () => {
  it('borra solo las claves del sistema', () => {
    writePersisted('gastos', [1]);
    writePersisted('compras', [2]);
    store.set('otra_app_datos', 'no tocar');

    clearPersisted();

    expect(store.has('supero_pos_data_gastos')).toBe(false);
    expect(store.has('supero_pos_data_compras')).toBe(false);
    expect(store.get('otra_app_datos')).toBe('no tocar');
  });
});
