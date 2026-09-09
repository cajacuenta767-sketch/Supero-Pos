/**
 * Configuración que llega del entorno de compilación.
 *
 * Vite sustituye `import.meta.env.VITE_*` por literales al compilar, así que una
 * comparación estática permite que el empaquetador **elimine** el bloque
 * completo del build de producción. Es lo que hace que las credenciales de
 * demostración no viajen en el binario que se instala en una tienda.
 */

/** Base de la API. Antes estaba escrita como `http://localhost:3000` en dos
 *  ficheros, así que no había forma de apuntar a producción. */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api/v1'
).replace(/\/+$/, '');

/**
 * Modo demostración.
 *
 * Habilita el acceso sin backend con usuarios de ejemplo. Debe estar apagado en
 * cualquier despliegue real: mientras esté activo, quien pueda dejar la
 * terminal sin red entra con credenciales conocidas.
 */
export const IS_DEMO_MODE: boolean = import.meta.env.VITE_DEMO_MODE === 'true';
