const { contextBridge, ipcRenderer } = require('electron');

/**
 * Puente entre la terminal y el proceso principal.
 *
 * La ventana se creaba con `nodeIntegration: true` y `contextIsolation: false`,
 * la combinación más peligrosa de Electron: cualquier inyección en la interfaz
 * —y la aplicación pinta nombres de producto, de cliente y plantillas de ticket
 * que se editan desde Ajustes— pasaba a ejecutar código con acceso al sistema de
 * archivos del equipo.
 *
 * Ahora el renderer corre aislado y solo ve esta superficie: cuatro funciones
 * concretas, ninguna de ellas capaz de ejecutar código arbitrario.
 */
/** Convierte la respuesta del proceso principal en valor o excepción. */
const unwrap = (reply) => {
  if (reply && typeof reply === 'object' && 'error' in reply) {
    throw new Error(reply.error);
  }
  return reply?.value;
};

contextBridge.exposeInMainWorld('superoPos', {
  /**
   * Canal de consultas a la base SQLite local.
   *
   * Es síncrono a propósito. `better-sqlite3` ya lo era, la escritura de una
   * venta son milisegundos, y mantenerlo así conserva la transacción atómica y
   * el flujo de cobro tal cual: la alternativa era volver asíncrono todo el
   * camino, incluido el render del arqueo, sin ganar nada a cambio.
   *
   * Un error en el proceso principal vuelve como `{ error }` y se relanza aquí,
   * para que quien llama lo vea como una excepción normal.
   */
  db: {
    exec: (sql) => unwrap(ipcRenderer.sendSync('db:exec', sql)),
    run: (sql, params) => unwrap(ipcRenderer.sendSync('db:run', sql, params)),
    get: (sql, params) => unwrap(ipcRenderer.sendSync('db:get', sql, params)),
    all: (sql, params) => unwrap(ipcRenderer.sendSync('db:all', sql, params)),
    transaction: (statements) => unwrap(ipcRenderer.sendSync('db:transaction', statements)),
    isAvailable: () => unwrap(ipcRenderer.sendSync('db:available')),
  },

  printer: {
    /** Imprime un ticket. Devuelve el resultado real del envío al dispositivo. */
    printTicket: (ticket) => ipcRenderer.invoke('printer:print-ticket', ticket),
    /** Imprime etiquetas de estantería con código de barras escaneable. */
    printLabels: (job) => ipcRenderer.invoke('printer:print-labels', job),
    /** Abre el cajón portamonedas por el pulso RJ11 de la impresora. */
    openDrawer: () => ipcRenderer.invoke('printer:open-drawer'),
    /** Comprueba que la impresora configurada responde. */
    probe: () => ipcRenderer.invoke('printer:probe'),
  },
});
