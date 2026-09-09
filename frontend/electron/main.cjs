const { app, BrowserWindow, ipcMain, session, shell } = require('electron');
const path = require('path');
const { buildTicket, buildLabels, buildDrawerKick } = require('./escposPrinter.cjs');
const { sendToPrinter } = require('./printerTransport.cjs');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

/**
 * Configuración de la impresora.
 *
 * Llega por entorno para no exigir un editor de ajustes en el proceso
 * principal. `PRINTER_INTERFACE` admite NETWORK o DEVICE.
 */
const printerConfig = () => ({
  interface: process.env.PRINTER_INTERFACE ?? (process.env.PRINTER_HOST ? 'NETWORK' : 'DEVICE'),
  host: process.env.PRINTER_HOST,
  port: process.env.PRINTER_PORT ? Number(process.env.PRINTER_PORT) : undefined,
  devicePath: process.env.PRINTER_DEVICE,
});

// --- Base de datos local -----------------------------------------------------

let db = null;

function openDatabase() {
  try {
    const Database = require('better-sqlite3');
    db = new Database(path.join(app.getPath('userData'), 'supero_pos_local.db'));
    db.pragma('journal_mode = WAL');
    return true;
  } catch (err) {
    console.warn('[db] better-sqlite3 no disponible:', err.message);
    return false;
  }
}

/**
 * Puente de base de datos.
 *
 * El renderer accedía a `better-sqlite3` con `window.require`, que solo existe
 * con `nodeIntegration: true`. Ahora el módulo nativo vive únicamente en el
 * proceso principal y el renderer manda sentencias por IPC.
 */
function registerDatabaseHandlers() {
  /* Canal síncrono: el renderer espera el resultado igual que antes esperaba a
     better-sqlite3. Cada respuesta viaja envuelta para que un fallo llegue como
     excepción al otro lado en vez de como `undefined` silencioso. */
  const reply = (event, fn) => {
    try {
      event.returnValue = { value: fn() };
    } catch (err) {
      event.returnValue = { error: err.message };
    }
  };

  const requireDb = () => {
    if (!db) throw new Error('Base de datos local no disponible.');
    return db;
  };

  ipcMain.on('db:available', (event) => reply(event, () => db !== null));

  ipcMain.on('db:exec', (event, sql) =>
    reply(event, () => {
      requireDb().exec(sql);
      return true;
    }),
  );

  ipcMain.on('db:run', (event, sql, params = []) =>
    reply(event, () => {
      const info = requireDb().prepare(sql).run(...params);
      return { changes: info.changes, lastInsertRowid: Number(info.lastInsertRowid) };
    }),
  );

  ipcMain.on('db:get', (event, sql, params = []) =>
    reply(event, () => requireDb().prepare(sql).get(...params) ?? null),
  );

  ipcMain.on('db:all', (event, sql, params = []) =>
    reply(event, () => requireDb().prepare(sql).all(...params)),
  );

  /* Varias sentencias en una sola transacción. Es lo que sostiene la venta
     atómica: cabecera, líneas, desglose de cobro y encolado entran o no entra
     nada. */
  ipcMain.on('db:transaction', (event, statements = []) =>
    reply(event, () => {
      const database = requireDb();
      const run = database.transaction((list) => {
        for (const { sql, params = [] } of list) {
          database.prepare(sql).run(...params);
        }
      });
      run(statements);
      return true;
    }),
  );
}

// --- Impresión ---------------------------------------------------------------

function registerPrinterHandlers() {
  ipcMain.handle('printer:print-ticket', async (_event, ticket) => {
    /* Antes este manejador componía un Buffer y respondía éxito sin enviarlo a
       ningún sitio: el ticket nunca salía y la interfaz daba la impresión
       contraria. */
    const payload = buildTicket(ticket ?? {});
    const result = await sendToPrinter(printerConfig(), payload);
    return { success: true, ...result };
  });

  ipcMain.handle('printer:print-labels', async (_event, job) => {
    const payload = buildLabels(job ?? {});
    const result = await sendToPrinter(printerConfig(), payload);
    return { success: true, ...result };
  });

  ipcMain.handle('printer:open-drawer', async () => {
    const result = await sendToPrinter(printerConfig(), buildDrawerKick());
    return { success: true, ...result };
  });

  ipcMain.handle('printer:probe', async () => {
    const config = printerConfig();
    if (config.interface === 'NETWORK' && !config.host) {
      return { available: false, reason: 'Impresora de red sin dirección configurada.' };
    }
    if (config.interface !== 'NETWORK' && !config.devicePath) {
      return { available: false, reason: 'Sin ruta de dispositivo configurada.' };
    }
    return { available: true, target: config.host ?? config.devicePath };
  });
}

// --- Ventana -----------------------------------------------------------------

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Supero POS - Terminal de Punto de Venta',
    autoHideMenuBar: true,
    webPreferences: {
      /* Antes: nodeIntegration true y contextIsolation false. Con esa
         combinación, cualquier inyección en la interfaz —la aplicación pinta
         nombres de producto y de cliente, y plantillas de ticket editables—
         ejecutaba código con acceso al sistema de archivos del equipo. */
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  /* La terminal no navega a ningún sitio: carga su propia interfaz y punto.
     Sin estos dos guardas, un enlace bastaba para llevar la ventana a una
     página cualquiera. */
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = process.env.VITE_DEV_SERVER_URL;
    if (!allowed || !url.startsWith(allowed)) event.preventDefault();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Un enlace externo se abre en el navegador del sistema, nunca dentro de la
    // terminal, que es donde vive la sesión.
    if (/^https?:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });

  const startUrl =
    process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  return mainWindow;
}

function applyContentSecurityPolicy() {
  const apiOrigin = process.env.VITE_API_ORIGIN ?? 'http://localhost:3000';
  // En desarrollo, Vite necesita websocket y evaluación para la recarga en
  // caliente; el build empaquetado no.
  const csp = isDev
    ? `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ws: ${apiOrigin}`
    : `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${apiOrigin}; object-src 'none'; base-uri 'none'; frame-ancestors 'none'`;

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [csp] },
    });
  });
}

app.whenReady().then(() => {
  applyContentSecurityPolicy();
  openDatabase();
  registerDatabaseHandlers();
  registerPrinterHandlers();
  createWindow();

  // En macOS la aplicación sigue viva sin ventanas: sin esto, cerrar la única
  // ventana dejaba un proceso al que no se podía volver desde el dock.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (db) db.close();
});
