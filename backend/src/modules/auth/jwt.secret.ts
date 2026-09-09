/**
 * Secreto de firma de los tokens.
 *
 * Antes había un secreto por defecto escrito en el código, en dos ficheros. Un
 * valor así queda publicado en el repositorio, y con él cualquiera firma un
 * token de administrador. Ahora la ausencia de la variable detiene el arranque
 * en lugar de degradar la seguridad en silencio.
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
