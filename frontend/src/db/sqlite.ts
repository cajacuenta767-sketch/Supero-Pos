// SQLite Local Database Manager for Offline-First Terminal POS
// Uses better-sqlite3 for synchronous zero-latency local operations

export interface LocalSyncQueueItem {
  id?: number;
  payload_type: string;
  local_id: string | number;
  payload_data: string;
  attempts?: number;
  status?: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  created_at?: string;
}

// 4-Block Transaction Contract Interfaces
export interface BlockA {
  transaction_id: string; // Immutable UUID v4
  timestamp: string; // ISO local timestamp
  branch_id: string;
  register_id: string;
  shift_id: string;
  cashier_id: string;
  customer_id: string | null;
  /**
   * Conforme de entrega firmado por el cliente, PNG en data: URI.
   *
   * Solo se pide en ventas a cuenta de un cliente identificado: es la prueba de
   * que la mercancía salió aceptada. Opcional porque una venta al público
   * general nunca la lleva.
   */
  customer_signature?: string;
}

export interface BlockB {
  subtotal: number;
  total_discount: number;
  grand_total: number;
}

export interface BlockCPaymentItem {
  payment_method: 'CASH' | 'CARD' | 'QR' | 'MIXED';
  amount_received: number;
  change_given: number;
}

export interface BlockC {
  payment_breakdown: BlockCPaymentItem[];
}

export interface BlockDItem {
  product_id: string;
  quantity: number; // Decimal support (e.g. 0.450 kg)
  unit_price: number;
  line_subtotal: number;
  serials_used: string[]; // IMEIs array
}

export interface BlockD {
  items: BlockDItem[];
}

export interface FourBlockSalePayload {
  transaction_id: string;
  timestamp: string;
  branch_id: string;
  register_id: string;
  shift_id: string;
  cashier_id: string;
  customer_id: string | null;
  subtotal: number;
  total_discount: number;
  grand_total: number;
  payment_breakdown: BlockCPaymentItem[];
  items: BlockDItem[];
  block_a: BlockA;
  block_b: BlockB;
  block_c: BlockC;
  block_d: BlockD;
}

/** Superficie de better-sqlite3 que este motor realmente usa. El paquete se
 *  carga en tiempo de ejecución vía `window.require` de Electron, así que no
 *  hay tipos publicados que importar. */
interface SqliteStatement {
  run: (...params: unknown[]) => { lastInsertRowid: number | bigint; changes: number };
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
}
interface SqliteHandle {
  prepare: (sql: string) => SqliteStatement;
  exec: (sql: string) => void;
  transaction: <T extends (...args: never[]) => unknown>(fn: T) => T;
}
interface ElectronWindow extends Window {
  require?: (moduleName: string) => new (filename: string) => SqliteHandle;
}

class LocalDatabaseEngine {
  private db: SqliteHandle | null = null;
  private mockSyncQueue: LocalSyncQueueItem[] = [];
  private storageWarningIssued = false;

  constructor() {
    this.initDatabase();
    this.initMockStorage();
  }

  private initDatabase() {
    try {
      const electronWindow = typeof window !== 'undefined' ? (window as ElectronWindow) : undefined;
      /* La condición estaba invertida —`!electronWindow || ...`—: fuera de
         Electron entraba igual y funcionaba solo porque la excepción caía en el
         catch de abajo. */
      if (electronWindow?.require) {
        const Database = electronWindow.require('better-sqlite3');
        this.db = new Database('supero_pos_local.db');
        this.createTables();
      }
    } catch {
      console.warn('Running in browser preview mode - using Web Storage / Memory mock for SQLite');
    }
  }

  private initMockStorage() {
    if (!this.db && typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem('supero_pos_mock_queue');
      if (stored) {
        try {
          this.mockSyncQueue = JSON.parse(stored);
        } catch {
          this.mockSyncQueue = [];
        }
      }
    }
  }

  /**
   * Persiste la cola del modo navegador.
   *
   * Los payloads llevan firmas y fotos en base64, así que la cola supera con
   * facilidad la cuota de localStorage. Sin este try/catch, `setItem` lanzaba
   * `QuotaExceededError` en mitad de un cobro y la venta fallaba con un aviso
   * ininteligible. Ahora se avisa y la venta sigue viva en memoria.
   */
  private saveMockStorage() {
    if (this.db || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem('supero_pos_mock_queue', JSON.stringify(this.mockSyncQueue));
      localStorage.setItem('supero_pos_pending_count', String(this.getPendingCount()));
      this.storageWarningIssued = false;
    } catch {
      if (!this.storageWarningIssued) {
        this.storageWarningIssued = true;
        console.error(
          'No se pudo guardar la cola local: almacenamiento del navegador lleno. ' +
            'Las ventas siguen en memoria y se perderán al recargar; sincronice cuanto antes.',
        );
      }
    }
  }

  public createTables() {
    if (!this.db) return;

    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        payload_type VARCHAR(50) NOT NULL,
        local_id VARCHAR(100) NOT NULL,
        payload_data JSON NOT NULL,
        attempts INTEGER DEFAULT 0,
        status VARCHAR(20) DEFAULT 'PENDING',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id VARCHAR(100) UNIQUE NOT NULL,
        shift_id VARCHAR(100) NOT NULL DEFAULT '',
        cash_register_id VARCHAR(100) NOT NULL,
        user_id VARCHAR(100) NOT NULL,
        customer_id VARCHAR(100),
        subtotal DECIMAL(12,4) NOT NULL,
        total_discount DECIMAL(12,4) NOT NULL,
        grand_total DECIMAL(12,4) NOT NULL,
        payment_method VARCHAR(30) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      -- sale_id se declaraba INTEGER y recibía el UUID de la transacción:
      -- funcionaba solo porque SQLite no impone tipos. Ahora es VARCHAR, con
      -- índice, que es lo que de verdad se consulta.
      CREATE TABLE IF NOT EXISTS sale_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id VARCHAR(100) NOT NULL,
        product_id VARCHAR(100) NOT NULL,
        quantity DECIMAL(12,4) NOT NULL,
        unit_price DECIMAL(12,4) NOT NULL,
        subtotal DECIMAL(12,4) NOT NULL,
        serials_used TEXT
      );

      -- Desglose real del cobro. La tabla sales guarda un único método, así que
      -- una venta mixta se contabilizaba entera como efectivo y el arqueo salía
      -- descuadrado.
      CREATE TABLE IF NOT EXISTS sale_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id VARCHAR(100) NOT NULL,
        payment_method VARCHAR(30) NOT NULL,
        amount_received DECIMAL(12,4) NOT NULL,
        change_given DECIMAL(12,4) NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sale_details_sale ON sale_details(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sale_payments_sale ON sale_payments(sale_id);
      CREATE INDEX IF NOT EXISTS idx_sales_shift ON sales(shift_id);
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status, id);
    `);
  }

  // Atomic ACID Transaction for Local Sales with 4-Block Contract
  public processLocalSaleAtomic(saleData: FourBlockSalePayload): {
    success: boolean;
    saleId: string;
  } {
    if (!this.db) {
      // Browser preview mode fallback engine
      const mockId =
        this.mockSyncQueue.length > 0
          ? Math.max(...this.mockSyncQueue.map((q) => q.id || 0)) + 1
          : 1;

      const newItem: LocalSyncQueueItem = {
        id: mockId,
        payload_type: 'SALE_TRANSACTION',
        local_id: saleData.transaction_id,
        payload_data: JSON.stringify(saleData),
        attempts: 0,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      };

      this.mockSyncQueue.push(newItem);
      this.saveMockStorage();
      console.log('Processed atomic local sale (Browser Mock):', saleData.transaction_id);
      return { success: true, saleId: saleData.transaction_id };
    }

    const db = this.db;
    const transaction = db.transaction((data: FourBlockSalePayload) => {
      const methods = new Set(data.payment_breakdown.map((p) => p.payment_method));
      /* Antes se guardaba `payment_breakdown[0]` a secas, así que una venta
         mixta quedaba registrada como efectivo y el arqueo no cuadraba. */
      const headerMethod =
        methods.size > 1 ? 'MIXED' : (data.payment_breakdown[0]?.payment_method ?? 'CASH');

      db.prepare(
        `INSERT INTO sales (transaction_id, shift_id, cash_register_id, user_id, customer_id,
                            subtotal, total_discount, grand_total, payment_method, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        data.transaction_id,
        data.shift_id,
        data.register_id,
        data.cashier_id,
        data.customer_id || null,
        data.subtotal,
        data.total_discount,
        data.grand_total,
        headerMethod,
        data.timestamp,
      );

      const paymentStmt = db.prepare(
        `INSERT INTO sale_payments (sale_id, payment_method, amount_received, change_given)
         VALUES (?, ?, ?, ?)`,
      );
      for (const payment of data.payment_breakdown) {
        paymentStmt.run(
          data.transaction_id,
          payment.payment_method,
          payment.amount_received,
          payment.change_given,
        );
      }

      // La sentencia se prepara una vez, no una por línea del ticket.
      const detailStmt = db.prepare(
        `INSERT INTO sale_details (sale_id, product_id, quantity, unit_price, subtotal, serials_used)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      for (const item of data.items) {
        /* Antes se guardaba `serials_used[0]`: de tres teléfonos vendidos en una
           línea quedaba uno. Los otros dos solo vivían en `sync_queue`, que se
           borra al sincronizar, así que se perdía justo la trazabilidad que
           justifica serializar. */
        detailStmt.run(
          data.transaction_id,
          item.product_id,
          item.quantity,
          item.unit_price,
          item.line_subtotal,
          item.serials_used.length > 0 ? JSON.stringify(item.serials_used) : null,
        );
      }

      db.prepare(
        `INSERT INTO sync_queue (payload_type, local_id, payload_data, status)
         VALUES ('SALE_TRANSACTION', ?, ?, 'PENDING')`,
      ).run(data.transaction_id, JSON.stringify(data));

      return { success: true, saleId: data.transaction_id };
    });

    return transaction(saleData);
  }

  /**
   * Efectivo que debería haber en la gaveta por las ventas del turno.
   *
   * Es lo que convierte el arqueo ciego en un arqueo: sin esta cifra el conteo
   * físico no se compara con nada. Solo lee.
   *
   * Suma el desglose real por método de pago (`sale_payments`), de modo que una
   * venta mixta aporta solo la parte cobrada en efectivo. Antes se sumaba
   * `grand_total` filtrando por el único método guardado en la cabecera, y esa
   * venta se contaba entera como efectivo.
   */
  public getCashSalesTotal(sinceIso: string): number {
    if (!this.db) {
      return this.mockSyncQueue.reduce((total, item) => {
        if (item.payload_type !== 'SALE_TRANSACTION') return total;
        let payload: FourBlockSalePayload;
        try {
          payload = JSON.parse(item.payload_data) as FourBlockSalePayload;
        } catch {
          return total;
        }
        if (payload.timestamp < sinceIso) return total;
        const cash = (payload.payment_breakdown ?? []).reduce(
          (sum, line) =>
            line.payment_method === 'CASH' ? sum + line.amount_received - line.change_given : sum,
          0,
        );
        return total + cash;
      }, 0);
    }

    /* Se suma del desglose por método, no de la cabecera de la venta: una venta
       mixta aporta solo su parte en efectivo. */
    const row = this.db
      .prepare(
        `SELECT COALESCE(SUM(p.amount_received - p.change_given), 0) AS total
         FROM sale_payments p
         JOIN sales s ON s.transaction_id = p.sale_id
         WHERE p.payment_method = 'CASH' AND s.created_at >= ?`,
      )
      .get(sinceIso) as { total: number } | undefined;

    return row?.total ?? 0;
  }

  // Component 1 & 4: Strict FIFO Sync Queue Extractor (oldest items first)
  public getPendingSyncItems(limit = 50): LocalSyncQueueItem[] {
    if (!this.db) {
      return this.mockSyncQueue
        .filter((item) => item.status === 'PENDING')
        .sort((a, b) => (a.id || 0) - (b.id || 0))
        .slice(0, limit);
    }
    return this.db
      .prepare("SELECT * FROM sync_queue WHERE status = 'PENDING' ORDER BY id ASC LIMIT ?")
      .all(limit) as LocalSyncQueueItem[];
  }

  // Remove synced item from queue after 200 OK confirmation
  public removeSyncQueueItem(id: number) {
    if (!this.db) {
      this.mockSyncQueue = this.mockSyncQueue.filter((item) => item.id !== id);
      this.saveMockStorage();
      return;
    }
    this.db.prepare('DELETE FROM sync_queue WHERE id = ?').run(id);
  }

  public markSynced(ids: number[]) {
    if (!this.db) {
      this.mockSyncQueue = this.mockSyncQueue.filter((item) => !ids.includes(item.id!));
      this.saveMockStorage();
      return;
    }
    const placeholders = ids.map(() => '?').join(',');
    this.db.prepare(`DELETE FROM sync_queue WHERE id IN (${placeholders})`).run(...ids);
  }

  public incrementAttempts(id: number) {
    if (!this.db) {
      const found = this.mockSyncQueue.find((item) => item.id === id);
      if (found) {
        found.attempts = (found.attempts || 0) + 1;
        if (found.attempts >= 5) found.status = 'FAILED';
      }
      this.saveMockStorage();
      return;
    }
    this.db
      .prepare(
        `
      UPDATE sync_queue 
      SET attempts = attempts + 1, 
          status = CASE WHEN attempts + 1 >= 5 THEN 'FAILED' ELSE 'PENDING' END 
      WHERE id = ?
    `,
      )
      .run(id);
  }

  /**
   * Ventas que agotaron sus reintentos.
   *
   * Sin este contador, un ticket que el servidor rechaza cinco veces pasa a
   * `FAILED`, deja de contarse como pendiente y desaparece sin que nadie sepa
   * que nunca se registró.
   */
  public getFailedCount(): number {
    if (!this.db) {
      return this.mockSyncQueue.filter((item) => item.status === 'FAILED').length;
    }
    const res = this.db
      .prepare("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'FAILED'")
      .get() as { count: number } | undefined;
    return res?.count || 0;
  }

  /** Marca un elemento como agotado sin pasar por los cinco intentos: se usa
   *  con payloads corruptos, que no se van a poder reenviar nunca. */
  public exhaustAttempts(id: number) {
    if (!this.db) {
      const found = this.mockSyncQueue.find((item) => item.id === id);
      if (found) {
        found.attempts = 5;
        found.status = 'FAILED';
      }
      this.saveMockStorage();
      return;
    }
    this.db.prepare("UPDATE sync_queue SET attempts = 5, status = 'FAILED' WHERE id = ?").run(id);
  }

  public getPendingCount(): number {
    if (!this.db) {
      return this.mockSyncQueue.filter((item) => item.status === 'PENDING').length;
    }
    const res = this.db
      .prepare("SELECT COUNT(*) as count FROM sync_queue WHERE status = 'PENDING'")
      .get() as { count: number } | undefined;
    return res?.count || 0;
  }
}

export const localDb = new LocalDatabaseEngine();
