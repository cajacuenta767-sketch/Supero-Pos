const net = require('net');
const fs = require('fs');
const { promisify } = require('util');

/**
 * Envío real de bytes a la impresora térmica.
 *
 * Lo que había antes no imprimía nada: el módulo construía un Buffer, el
 * manejador IPC respondía `{ success: true, bytesSent }` y ninguna línea de
 * código escribía esos bytes en un dispositivo. Además, ninguna parte de la
 * interfaz llegaba a invocar ese IPC, así que el camino estaba desconectado de
 * punta a punta y el usuario creía que su ticket había salido.
 *
 * Se admiten las dos conexiones habituales en mostrador:
 *  - red: impresoras Ethernet/WiFi, puerto 9100 (RAW/JetDirect).
 *  - dispositivo: nodo del sistema (/dev/usb/lp0 en Linux, \\.\COM3 en Windows,
 *    o una cola compartida) sobre el que se escribe directamente.
 */

const DEFAULT_PORT = 9100;
const CONNECT_TIMEOUT_MS = 5000;

const writeFile = promisify(fs.writeFile);

function sendOverNetwork(host, port, payload) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    let settled = false;

    const fail = (err) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      reject(err);
    };

    socket.setTimeout(CONNECT_TIMEOUT_MS);
    socket.once('timeout', () => fail(new Error(`La impresora ${host}:${port} no respondió.`)));
    socket.once('error', (err) => fail(err));

    socket.connect(port, host, () => {
      socket.write(payload, (err) => {
        if (err) return fail(err);
        // `end` espera al vaciado del socket: sin esto se cerraba la conexión
        // antes de que la impresora recibiera el último bloque.
        socket.end(() => {
          if (settled) return;
          settled = true;
          resolve({ transport: 'network', target: `${host}:${port}`, bytes: payload.length });
        });
      });
    });
  });
}

async function sendToDevice(devicePath, payload) {
  await writeFile(devicePath, payload);
  return { transport: 'device', target: devicePath, bytes: payload.length };
}

/**
 * @param {{interface?: string, host?: string, port?: number, devicePath?: string}} config
 * @param {Buffer} payload
 */
async function sendToPrinter(config, payload) {
  const iface = (config?.interface ?? '').toUpperCase();

  if (iface === 'NETWORK' || (!iface && config?.host)) {
    if (!config?.host) throw new Error('Impresora de red sin dirección configurada.');
    return sendOverNetwork(config.host, config.port ?? DEFAULT_PORT, payload);
  }

  if (!config?.devicePath) {
    throw new Error(
      'No hay impresora configurada. Indique una dirección de red o la ruta del dispositivo en Ajustes.',
    );
  }
  return sendToDevice(config.devicePath, payload);
}

module.exports = { sendToPrinter, DEFAULT_PORT };
