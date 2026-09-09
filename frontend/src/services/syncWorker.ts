// Worker de sincronización: evalúa la conectividad y drena la cola local.
import axios, { AxiosError } from 'axios';
import { localDb } from '../db/sqlite';
import { useSyncStore } from '../store/useSyncStore';
import { useAuthStore } from '../store/useAuthStore';
import { API_BASE_URL } from '../config/env';
import { formatTime } from '../utils/dates';

const SERVER_HEALTH_URL = `${API_BASE_URL}/health`;
const BATCH_SYNC_URL = `${API_BASE_URL}/sync/batch`;

/** Ventas por envío. El endpoint acepta lotes; antes se mandaban de una en una
 *  pese a llamarse `batch`, con una petición HTTP por ticket. */
const BATCH_SIZE = 25;

/** Espera entre intentos cuando el servidor no responde, en milisegundos.
 *  Reintentar cada 30 s contra un servidor caído no acerca la reconexión y sí
 *  gasta batería y red. */
const BACKOFF_STEPS_MS = [30_000, 60_000, 120_000, 300_000];

export class SyncWorkerService {
  private timerId: ReturnType<typeof setInterval> | null = null;
  private isProcessing = false;
  private consecutiveFailures = 0;
  private nextAttemptAt = 0;
  private baseIntervalMs = 30_000;

  public startWorker(intervalMs = 30_000) {
    if (this.timerId) return;
    this.baseIntervalMs = intervalMs;
    this.tick();
    this.timerId = setInterval(() => this.tick(), intervalMs);
  }

  public stopWorker() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  public async triggerManualSync() {
    // Una reconexión detectada por el navegador cancela la espera del backoff.
    this.nextAttemptAt = 0;
    await this.tick();
  }

  private backoffDelay(): number {
    if (this.consecutiveFailures === 0) return 0;
    const index = Math.min(this.consecutiveFailures - 1, BACKOFF_STEPS_MS.length - 1);
    return Math.max(BACKOFF_STEPS_MS[index], this.baseIntervalMs);
  }

  private refreshCounters() {
    const sync = useSyncStore.getState();
    sync.setPendingCount(localDb.getPendingCount());
    /* La cola tiene además elementos agotados tras cinco intentos. Antes no se
       contaban en ningún sitio: el indicador bajaba a cero y una venta que
       nunca llegó al servidor desaparecía de la vista de todos. */
    sync.setFailedCount(localDb.getFailedCount());
  }

  private async tick() {
    if (this.isProcessing) return;
    if (Date.now() < this.nextAttemptAt) return;
    this.isProcessing = true;

    try {
      const isAlive = await this.pingHealth();
      useSyncStore.getState().setIsOnline(isAlive);

      if (!isAlive) {
        this.consecutiveFailures += 1;
        this.nextAttemptAt = Date.now() + this.backoffDelay();
        this.refreshCounters();
        return;
      }

      this.consecutiveFailures = 0;
      this.nextAttemptAt = 0;
      await this.drainQueue();
    } catch (error) {
      console.warn('Excepción en el ciclo de sincronización (modo autónomo activo):', error);
      useSyncStore.getState().setIsOnline(false);
      this.consecutiveFailures += 1;
      this.nextAttemptAt = Date.now() + this.backoffDelay();
    } finally {
      this.refreshCounters();
      this.isProcessing = false;
    }
  }

  private async drainQueue() {
    const pending = localDb.getPendingSyncItems(BATCH_SIZE);
    if (pending.length === 0) return;

    const transactions = pending
      .map((item) => {
        try {
          return {
            item,
            payload:
              typeof item.payload_data === 'string'
                ? JSON.parse(item.payload_data)
                : item.payload_data,
          };
        } catch {
          /* Un payload ilegible no se puede reenviar nunca: se agota para que
             salga del camino y quede contabilizado como fallido, en lugar de
             bloquear la cola para siempre. */
          console.error(
            `Payload corrupto en la cola local (id ${item.id}); se marca como fallido.`,
          );
          if (item.id !== undefined) localDb.exhaustAttempts(item.id);
          return null;
        }
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

    if (transactions.length === 0) return;

    try {
      const response = await axios.post(
        BATCH_SYNC_URL,
        {
          terminal_id: 'POS-TERMINAL-01',
          sync_batch_id: `batch-${Date.now()}`,
          transactions: transactions.map((t) => t.payload),
        },
        {
          timeout: 15_000,
          // Sin esta cabecera el endpoint responde 401: la API dejó de aceptar
          // el rol por cabecera y exige el token de la sesión.
          headers: this.authHeaders(),
        },
      );

      /* El servidor devuelve qué transacciones confirmó. Antes respondía
         `success: true` siempre y el cliente borraba de la cola incluso las que
         habían fallado: la venta desaparecía de los dos lados. Ahora solo se
         borra lo que aparece en `processed_ids`. */
      const confirmed: string[] = Array.isArray(response.data?.processed_ids)
        ? response.data.processed_ids
        : [];
      const confirmedSet = new Set(confirmed);

      for (const { item } of transactions) {
        if (item.id === undefined) continue;
        if (confirmedSet.has(String(item.local_id))) {
          localDb.removeSyncQueueItem(item.id);
        } else {
          localDb.incrementAttempts(item.id);
        }
      }

      const rejected = transactions.length - confirmedSet.size;
      if (rejected > 0) {
        console.warn(
          `El servidor rechazó ${rejected} de ${transactions.length} ventas del lote; ` +
            'se conservan en la cola local para reintentar.',
        );
      }

      useSyncStore.getState().setLastSyncTime(formatTime(new Date()));
    } catch (err) {
      const reason = err instanceof AxiosError ? (err.message ?? '') : String(err);
      console.warn(`Error de envío del lote: ${reason}. Se conserva la cola intacta.`);
      /* Un fallo de transporte no dice nada sobre cada venta, así que no se
         penaliza ninguna: se reintenta el lote entero en el siguiente ciclo. */
      this.consecutiveFailures += 1;
      this.nextAttemptAt = Date.now() + this.backoffDelay();
    }
  }

  private authHeaders(): Record<string, string> {
    const token = useAuthStore.getState().token;
    return token ? { Authorization: `Bearer ${token}` } : {};
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
