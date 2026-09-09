import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getImage, isImageRef, putImage, deleteImage } from './imageStore';

/* IndexedDB no existe en Node: el almacén cae a su respaldo en memoria, que es
   justo el camino que hay que comprobar que no rompe nada. */
beforeEach(() => {
  vi.stubGlobal('indexedDB', undefined);
});

describe('imageStore', () => {
  const DATA_URL = 'data:image/webp;base64,UklGRh4AAABXRUJQVlA4TBEAAAAvAAAAAAfQ//73v/+BiOh/AAA=';

  it('guarda y devuelve la imagen por su referencia', async () => {
    const ref = await putImage(DATA_URL);
    expect(isImageRef(ref)).toBe(true);
    expect(await getImage(ref)).toBe(DATA_URL);
  });

  it('la referencia es corta: es lo que va al registro en lugar de la foto', async () => {
    const ref = await putImage(DATA_URL);
    /* Una foto de 800px en base64 pasa de 80.000 caracteres. Si la referencia
       no fuera corta, no habríamos resuelto nada. */
    expect(ref.length).toBeLessThan(32);
    expect(ref.length * 100).toBeLessThan(DATA_URL.length * 100);
  });

  it('dos imágenes seguidas no comparten referencia', async () => {
    const a = await putImage(DATA_URL);
    const b = await putImage(DATA_URL);
    expect(a).not.toBe(b);
  });

  it('un data URI antiguo se devuelve tal cual: los registros de antes deben seguir viéndose', async () => {
    expect(await getImage(DATA_URL)).toBe(DATA_URL);
    expect(isImageRef(DATA_URL)).toBe(false);
  });

  it('sin foto, no hay nada que resolver', async () => {
    expect(await getImage(null)).toBeNull();
    expect(await getImage(undefined)).toBeNull();
    expect(await getImage('')).toBeNull();
  });

  it('borrar libera la imagen: un registro eliminado no deja su foto ocupando sitio', async () => {
    const ref = await putImage(DATA_URL);
    await deleteImage(ref);
    expect(await getImage(ref)).toBeNull();
  });

  it('borrar algo que no es una referencia no toca nada', async () => {
    await expect(deleteImage(DATA_URL)).resolves.toBeUndefined();
    expect(await getImage(DATA_URL)).toBe(DATA_URL);
  });
});
