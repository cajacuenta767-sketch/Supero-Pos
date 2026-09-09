/**
 * Aritmética de dinero en céntimos enteros.
 *
 * El carrito operaba con `number` y remataba cada paso con
 * `parseFloat(x.toFixed(4))`. Los flotantes binarios no representan 0,1 ni 0,2,
 * así que el error se acumulaba por línea y por descuento; la prueba está en que
 * `isPaymentCovered` necesitaba una tolerancia de 0,001 para dar por cobrada una
 * venta exacta. Un céntimo perdido por ticket son decenas de bolivianos al mes
 * en una caja con movimiento.
 *
 * Aquí todo se calcula en enteros —la unidad mínima de la moneda— y solo se
 * vuelve a decimal en el borde: al pintar y al construir el payload.
 */

/** Céntimos por unidad monetaria. El boliviano tiene dos decimales. */
const SCALE = 100;

/** Redondeo al par más cercano en el punto medio (bankers' rounding).
 *  `Math.round` sesga siempre hacia arriba, y ese sesgo se acumula en una
 *  columna de miles de importes. */
const roundHalfToEven = (value: number): number => {
  const floor = Math.floor(value);
  const diff = value - floor;
  if (diff > 0.5) return floor + 1;
  if (diff < 0.5) return floor;
  return floor % 2 === 0 ? floor : floor + 1;
};

/** Convierte un importe decimal a céntimos. */
export const toCents = (amount: number): number => {
  if (!Number.isFinite(amount)) return 0;
  return roundHalfToEven(amount * SCALE);
};

/** Vuelve a unidades monetarias para mostrar o enviar. */
export const fromCents = (cents: number): number => cents / SCALE;

/**
 * Aplica un porcentaje sobre un importe en céntimos.
 *
 * El porcentaje puede tener decimales (un 5,5 % de cliente VIP), así que se
 * escala antes de dividir para no perder precisión en el camino.
 */
export const percentOf = (cents: number, percentage: number): number =>
  roundHalfToEven((cents * percentage) / 100);

/**
 * Importe de una línea: cantidad por precio unitario.
 *
 * La cantidad puede ser decimal —0,450 kg de queso—, así que se multiplica en
 * céntimos y se redondea una sola vez, al final.
 */
export const lineTotalCents = (quantity: number, unitPriceCents: number): number =>
  roundHalfToEven(quantity * unitPriceCents);

export const sumCents = (values: number[]): number => values.reduce((acc, v) => acc + v, 0);
