/**
 * Validación de IMEI.
 *
 * Un IMEI son 15 dígitos cuyo último es de control por el algoritmo de Luhn,
 * el mismo de las tarjetas. Comprobarlo atrapa el dígito mal tecleado antes de
 * que el equipo entre al inventario con una serie que no existe — y una serie
 * equivocada es un equipo que no se puede reclamar en garantía.
 *
 * No valida el TAC contra la base GSMA: eso exige red, y el almacén trabaja sin
 * ella.
 */
export const imeiCheckDigit = (first14: string): number => {
  const sum = first14
    .slice(0, 14)
    .split('')
    .reduce((acc, digit, index) => {
      // Se duplican las posiciones pares empezando por la segunda (índice 1).
      const n = Number(digit) * (index % 2 === 1 ? 2 : 1);
      return acc + (n > 9 ? n - 9 : n);
    }, 0);
  return (10 - (sum % 10)) % 10;
};

export const isValidImei = (value: string): boolean =>
  /^\d{15}$/.test(value) && imeiCheckDigit(value) === Number(value[14]);

/**
 * Mensaje de error para un IMEI, o `undefined` si es válido.
 *
 * Devuelve `undefined` también con el campo vacío: un campo intacto no ha
 * fallado todavía y marcarlo en rojo antes de teclear nada es ruido.
 */
export const imeiError = (raw: string): string | undefined => {
  const value = raw.trim();
  if (value === '') return undefined;
  if (!/^\d+$/.test(value)) return 'Un IMEI son solo dígitos.';
  if (value.length !== 15) return `Un IMEI tiene 15 dígitos; llevas ${value.length}.`;
  if (!isValidImei(value))
    return `Dígito de control incorrecto: debería terminar en ${imeiCheckDigit(value)}.`;
  return undefined;
};
