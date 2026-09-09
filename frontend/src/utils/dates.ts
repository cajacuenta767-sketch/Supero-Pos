/**
 * Formato de fechas y horas de la terminal.
 *
 * Convivían cinco criterios: `toLocaleString('es-ES')` en cinco sitios, `es-BO`
 * en otro, dos llamadas sin configuración regional, y datos de ejemplo con la
 * hora escrita a mano —unos con segundos (`14:15:22` en Informes y Usuarios) y
 * otros sin ellos (`14:22` en el resto—.
 *
 * El criterio: la terminal opera en Bolivia y el segundo no le sirve a nadie
 * para leer un listado. Solo se muestra donde hace falta desempatar dos
 * registros del mismo minuto.
 */

const LOCALE = 'es-BO';

/** 14/08/2026 */
export const formatDate = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: '2-digit', year: 'numeric' });
};

/** 14:22 */
export const formatTime = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit', hour12: false });
};

/** 14/08/2026 14:22 */
export const formatDateTime = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return `${formatDate(date)} ${formatTime(date)}`;
};

/**
 * Normaliza una hora ya escrita como texto.
 *
 * Los datos de ejemplo traen la hora en cadenas fijas, unas con segundos y otras
 * sin ellos. Esto los iguala sin tener que reescribir cada literal.
 */
export const trimSeconds = (text: string): string =>
  text.replace(/\b(\d{1,2}:\d{2}):\d{2}\b/g, '$1');
