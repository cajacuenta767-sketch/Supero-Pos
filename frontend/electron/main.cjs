const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { formatTicketESCPOSText } = require('./escposPrinter.cjs');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    title: 'Supero POS - Terminal de Punto de Venta',
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Load Vite dev server or production index.html
  const startUrl = process.env.VITE_DEV_SERVER_URL || `file://${path.join(__dirname, '../dist/index.html')}`;
  mainWindow.loadURL(startUrl);

  // Native ESC/POS thermal printer IPC handler
  ipcMain.on('print-escpos-ticket', (event, ticketData) => {
    try {
      const bufferPayload = formatTicketESCPOSText(ticketData);
      console.log(`[ESC/POS Driver] Enviando tramas (${bufferPayload.length} bytes) a impresora térmica...`);
      event.reply('print-escpos-reply', { success: true, bytesSent: bufferPayload.length });
    } catch (err) {
      console.error('[ESC/POS Driver Error]:', err);
      event.reply('print-escpos-reply', { success: false, error: err.message });
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
