// Background Worker Service evaluating network connectivity & processing sync_queue every 30 seconds
import axios from 'axios';
import { localDb } from '../db/sqlite';
import { useSyncStore } from '../store/useSyncStore';

const SERVER_HEALTH_URL = 'http://localhost:3000/api/v1/health';
const BATCH_SYNC_URL = 'http://localhost:3000/api/v1/sync/batch';

export class SyncWorkerService {
  private timerId: any = null;
  private isProcessing = false;

  public startWorker(intervalMs = 30000) {
    if (this.timerId) return;

    // Run initial tick immediately, then repeat every 30s
    this.tick();
    this.timerId = setInterval(() => this.tick(), intervalMs);
    console.log('Background Sync Worker iniciado (intervalo activo: 30s)');
  }

  public stopWorker() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public async triggerManualSync() {
    await this.tick();
  }

  private async tick() {
    // Freeze queue if already processing (prevents race conditions)
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      // 1. Detección Activa de Red: Ping a /api/v1/health
      const isAlive = await this.pingHealth();
      useSyncStore.getState().setIsOnline(isAlive);

      if (isAlive) {
        // 2. Algoritmo Estricto de Reconexión (FIFO): Extraer venta más antigua (ORDER BY id ASC)
        const pendingItems = localDb.getPendingSyncItems(50);
        useSyncStore.getState().setPendingCount(pendingItems.length);

        if (pendingItems.length === 0) {
          useSyncStore.getState().setPendingCount(0);
          return;
        }

        console.log(`Reconexión activa: Procesando cola FIFO de ${pendingItems.length} transacciones...`);

        // 3. Procesamiento secuencial FIFO uno por uno
        for (const item of pendingItems) {
          try {
            const transactionPayload =
              typeof item.payload_data === 'string'
                ? JSON.parse(item.payload_data)
                : item.payload_data;

            const response = await axios.post(
              BATCH_SYNC_URL,
              {
                terminal_id: 'POS-TERMINAL-01',
                sync_batch_id: `batch-${item.id}-${Date.now()}`,
                transactions: [transactionPayload],
              },
              { timeout: 8000 }
            );

            // Eliminar de sync_queue SOLO tras recibir confirmación 200 OK
            if (response.status === 200 && response.data?.success) {
              if (item.id !== undefined) {
                localDb.removeSyncQueueItem(item.id);
              }
              const currentPending = localDb.getPendingCount();
              useSyncStore.getState().setPendingCount(currentPending);
              useSyncStore.getState().setLastSyncTime(new Date().toLocaleTimeString());
              console.log(`[200 OK] Ticket ${item.local_id} reconciliado y eliminado de sync_queue. Restantes: ${currentPending}`);
            } else {
              // Si la respuesta no es 200 OK, congelar la cola y reintentar en el siguiente tick
              console.warn(`Respuesta no confirmada para ticket ${item.local_id}. Deteniendo flujo FIFO.`);
              break;
            }
          } catch (err: any) {
            console.warn(`Error en envío FIFO para ticket ${item.local_id}: ${err?.message}. Congelando transmisión.`);
            if (item.id !== undefined) {
              localDb.incrementAttempts(item.id);
            }
            // Detener el bucle en caso de falla de red para preservar orden estricto FIFO
            break;
          }
        }

        // Actualizar contador visual al finalizar la ráfaga
        const finalCount = localDb.getPendingCount();
        useSyncStore.getState().setPendingCount(finalCount);
      }
    } catch (error) {
      console.warn('Sync Worker tick exception (Modo autónomo activo):', error);
      useSyncStore.getState().setIsOnline(false);
    } finally {
      this.isProcessing = false;
    }
  }

  private async pingHealth(): Promise<boolean> {
    try {
      const res = await axios.get(SERVER_HEALTH_URL, { timeout: 3000 });
      return res.status === 200 && res.data?.status === 'ONLINE';
    } catch {
      return false;
    }
  }
}

export const syncWorker = new SyncWorkerService();

