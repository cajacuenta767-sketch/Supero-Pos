/**
 * Identificadores locales únicos.
 *
 * Se generaban con `` `c-${Date.now()}` ``. Dos altas dentro del mismo
 * milisegundo —una importación, un doble clic, una prueba automatizada— salían
 * con el mismo identificador, y a partir de ahí editar una editaba las dos y
 * borrar una borraba las dos. El contador de sesión lo impide sin depender de
 * la resolución del reloj.
 */

let counter = 0;

/** `prefijo-<instante><contador en base 36>`, p. ej. `c-lz8k3n01`. */
export const localId = (prefix: string): string => {
  counter = (counter + 1) % 1_000_000;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
};
