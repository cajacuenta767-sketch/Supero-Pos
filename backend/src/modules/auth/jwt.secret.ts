/**
 * Secreto de firma de los tokens.
 *
 * Antes había un valor por defecto en el código —`super_secret_jwt_key_2026`—
 * en dos ficheros. Ese valor está publicado en el repositorio: con él,
 * cualquiera firma un token de administrador. Ahora la ausencia de la variable
 * detiene el arranque en lugar de degradar la seguridad en silencio.
 *
 * En desarrollo se permite un secreto efímero distinto en cada arranque: sirve
 * para trabajar y no se puede filtrar porque no existe en ningún fichero.
 */
import { randomBytes } from 'crypto';

const MIN_LENGTH = 32;

let developmentSecret: string | null = null;

export const getJwtSecret = (): string => {
  const configured = process.env.JWT_SECRET;

  if (configured && configured.length >= MIN_LENGTH) return configured;

  if (configured) {
    throw new Error(
      `JWT_SECRET es demasiado corto (${configured.length} caracteres); se exigen al menos ${MIN_LENGTH}.`,
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no está definido. La API no arranca sin él en producción.');
  }

  if (!developmentSecret) {
    developmentSecret = randomBytes(48).toString('hex');
    console.warn(
      '[auth] JWT_SECRET no definido: se usa un secreto aleatorio de desarrollo. ' +
        'Las sesiones se invalidan en cada reinicio. Defina JWT_SECRET para producción.',
    );
  }
  return developmentSecret;
};
