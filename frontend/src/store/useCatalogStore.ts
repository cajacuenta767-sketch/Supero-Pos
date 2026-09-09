import { create } from 'zustand';
import { readPersisted, writePersisted } from './persist';

/**
 * Catálogo de productos, único para toda la terminal.
 *
 * Antes existía dos veces: `MASTER_POS_CATALOG` en la vista de venta y otra
 * lista en la de productos, con nombres, precios y SKU distintos para el mismo
 * artículo —«Queso Criollo (a granel / kg)» frente a «Queso Criollo San Javier
 * (Kg)»—. Dar de alta un producto no lo hacía vendible, y el POS mostraba seis
 * artículos donde el catálogo tenía cuatro.
 */

export type UnitType = 'UNIT' | 'FRACTION' | 'SERIALIZED';

export interface Product {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  brand?: string;
  unit_type: UnitType;
  cost_price: number;
  /** Precio al público. En la vista de venta se llamaba `retail_price`. */
  sale_price: number;
  wholesale_price: number;
  wholesale_min_qty: number;
  stock: number;
  min_stock: number;
  /** Un producto inactivo no se ofrece en el punto de venta. */
  is_active: boolean;
  image_url?: string;
}

const STORAGE_KEY = 'catalogo';
const MOVEMENTS_KEY = 'movimientos_stock';
const SERIALS_KEY = 'series';

const SEED: Product[] = [
  {
    id: 101,
    sku: 'ELE-S23-001',
    barcode: '7750123456789',
    name: 'Smartphone Galaxy S23 Ultra (128GB)',
    category: 'Electrónica',
    brand: 'Samsung',
    unit_type: 'SERIALIZED',
    cost_price: 700.0,
    sale_price: 850.0,
    wholesale_price: 800.0,
    wholesale_min_qty: 3,
    stock: 12,
    min_stock: 4,
    is_active: true,
  },
  {
    id: 102,
    sku: 'AB-QSO-002',
    barcode: '7759876543210',
    name: 'Queso Criollo San Javier (kg)',
    category: 'Lácteos',
    brand: 'San Javier',
    unit_type: 'FRACTION',
    cost_price: 32.0,
    sale_price: 45.0,
    wholesale_price: 40.0,
    wholesale_min_qty: 5,
    stock: 45.5,
    min_stock: 10,
    is_active: true,
  },
  {
    id: 103,
    sku: 'ELE-AUD-003',
    barcode: '7751112223334',
    name: 'Audífonos Bluetooth Wireless Pro',
    category: 'Electrónica',
    brand: 'Genérico',
    unit_type: 'UNIT',
    cost_price: 22.0,
    sale_price: 35.0,
    wholesale_price: 28.0,
    wholesale_min_qty: 6,
    stock: 30,
    min_stock: 8,
    is_active: true,
  },
  {
    id: 104,
    sku: 'AB-CAR-004',
    barcode: '7754445556667',
    name: 'Carne Lomo Fino (a granel / kg)',
    category: 'Abarrotes',
    unit_type: 'FRACTION',
    cost_price: 52.0,
    sale_price: 68.0,
    wholesale_price: 62.0,
    wholesale_min_qty: 4,
    stock: 25.0,
    min_stock: 10,
    is_active: true,
  },
  {
    id: 105,
    sku: 'ELE-TAB-005',
    barcode: '7757778889990',
    name: 'Tablet Pro 11" 256GB WiFi',
    category: 'Electrónica',
    unit_type: 'SERIALIZED',
    cost_price: 500.0,
    sale_price: 620.0,
    wholesale_price: 580.0,
    wholesale_min_qty: 2,
    stock: 8,
    min_stock: 10,
    is_active: true,
  },
  {
    id: 106,
    sku: 'AB-LAC-006',
    barcode: '7753332221110',
    name: 'Leche Entera 1 Litro (Caja)',
    category: 'Abarrotes',
    brand: 'Pil',
    unit_type: 'UNIT',
    cost_price: 6.5,
    sale_price: 8.5,
    wholesale_price: 7.5,
    wholesale_min_qty: 12,
    stock: 120,
    min_stock: 24,
    is_active: true,
  },
  {
    id: 107,
    sku: 'BEB-COL-007',
    barcode: '7771234567890',
    name: 'Coca Cola 2 Litros Retornable',
    category: 'Bebidas',
    brand: 'Coca Cola',
    unit_type: 'UNIT',
    cost_price: 8.5,
    sale_price: 12.0,
    wholesale_price: 10.5,
    wholesale_min_qty: 6,
    stock: 45,
    min_stock: 10,
    is_active: true,
  },
  {
    id: 108,
    sku: 'GOL-WAF-008',
    barcode: '7779876543210',
    name: 'Galletas Wafer Chocolate 150g',
    category: 'Golosinas',
    brand: 'Arcor',
    unit_type: 'UNIT',
    cost_price: 3.0,
    sale_price: 5.0,
    wholesale_price: 4.2,
    wholesale_min_qty: 12,
    stock: 2,
    min_stock: 15,
    is_active: true,
  },
];

/**
 * Motivo de un cambio de existencias.
 *
 * Todo movimiento deja asiento: sin él, un stock que no cuadra no se puede
 * explicar, y explicar la diferencia es la mitad del trabajo de un almacén.
 */
export type MovementType =
  'SALE' | 'SALE_RETURN' | 'PURCHASE' | 'LOSS' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'AUDIT';

export const MOVEMENT_LABEL: Record<MovementType, string> = {
  SALE: 'Venta',
  SALE_RETURN: 'Devolución de venta',
  PURCHASE: 'Recepción de compra',
  LOSS: 'Merma o daño',
  TRANSFER_OUT: 'Salida por traslado',
  TRANSFER_IN: 'Entrada por traslado',
  AUDIT: 'Ajuste por auditoría',
};

export interface StockMovement {
  id: string;
  productId: number;
  productName: string;
  type: MovementType;
  /** Con signo: negativo descuenta. */
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  /** Documento que lo origina: ticket, orden de compra, guía de traslado… */
  reference?: string;
  reason?: string;
  at: string;
}

export interface MovementInput {
  productId: number;
  type: MovementType;
  quantity: number;
  reference?: string;
  reason?: string;
}

/** Cuántos asientos se conservan en la terminal. Lo viejo vive en el servidor. */
const MOVEMENT_LIMIT = 500;

export type SerialStatus = 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'DAMAGED';

/**
 * Unidad serializada concreta: este teléfono, no «un teléfono».
 *
 * Vivía como estado local de la vista de productos, así que al vender se
 * aceptaba cualquier IMEI: se podía vender dos veces el mismo aparato, o uno que
 * nunca entró al almacén. Validar la forma del número no basta; hay que
 * comprobar que existe y está disponible.
 */
export interface ProductSerial {
  serialNumber: string;
  productId: number;
  status: SerialStatus;
  ticketId?: string;
  updatedAt: string;
}

/* Series de ejemplo, con dígito de control válido: los IMEI del catálogo tienen
   que poder comprobarse igual que los que llegan escaneados. */
const SERIAL_SEED: ProductSerial[] = [
  { serialNumber: '358492019482717', productId: 101, status: 'IN_STOCK', updatedAt: '' },
  { serialNumber: '358492019482725', productId: 101, status: 'IN_STOCK', updatedAt: '' },
  { serialNumber: '358492019482733', productId: 101, status: 'IN_STOCK', updatedAt: '' },
  { serialNumber: '356938035643809', productId: 105, status: 'IN_STOCK', updatedAt: '' },
  { serialNumber: '490154203237518', productId: 105, status: 'IN_STOCK', updatedAt: '' },
];

interface CatalogState {
  products: Product[];
  movements: StockMovement[];
  serials: ProductSerial[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: number, patch: Partial<Product>) => void;
  removeProduct: (id: number) => void;
  toggleActive: (id: number) => void;
  /**
   * Único punto por el que cambian las existencias.
   *
   * Antes solo la venta tocaba el stock: recibir una compra, registrar una merma
   * o mover mercadería entre almacenes no cambiaban nada, así que el inventario
   * solo bajaba y la cifra dejaba de significar algo. Ahora toda operación pasa
   * por aquí y deja su asiento.
   */
  applyMovement: (input: MovementInput) => StockMovement | null;
  /** Varios movimientos como una sola operación: una recepción de N líneas. */
  applyMovements: (inputs: MovementInput[]) => StockMovement[];
  movementsFor: (productId: number) => StockMovement[];

  /** Series disponibles de un producto. */
  availableSerials: (productId: number) => ProductSerial[];
  /**
   * Comprueba que la serie puede venderse.
   *
   * Devuelve el motivo del rechazo, o `undefined` si está disponible. Una serie
   * desconocida no se acepta: si el aparato existe, tiene que haber entrado.
   */
  checkSerial: (productId: number, serialNumber: string) => string | undefined;
  /** Marca una serie como vendida y la ata a su ticket. */
  markSerialsSold: (serialNumbers: string[], ticketId: string) => void;
  /** Alta de series al recibir mercadería. */
  registerSerials: (productId: number, serialNumbers: string[]) => void;
  findByBarcode: (barcode: string) => Product | undefined;
  /** Solo lo vendible: activo y con existencias registradas. */
  sellableProducts: () => Product[];
  categories: () => string[];
}

const persist = (products: Product[]) => {
  writePersisted(STORAGE_KEY, products);
  return products;
};

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: readPersisted<Product[]>(STORAGE_KEY) ?? SEED,
  movements: readPersisted<StockMovement[]>(MOVEMENTS_KEY) ?? [],
  serials: readPersisted<ProductSerial[]>(SERIALS_KEY) ?? SERIAL_SEED,

  addProduct: (product) => {
    const id = Math.max(0, ...get().products.map((p) => p.id)) + 1;
    const created: Product = { ...product, id };
    set((state) => ({ products: persist([...state.products, created]) }));
    return created;
  },

  updateProduct: (id, patch) =>
    set((state) => ({
      products: persist(state.products.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    })),

  removeProduct: (id) =>
    set((state) => ({ products: persist(state.products.filter((p) => p.id !== id)) })),

  toggleActive: (id) =>
    set((state) => ({
      products: persist(
        state.products.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p)),
      ),
    })),

  applyMovement: (input) => {
    const [movement] = get().applyMovements([input]);
    return movement ?? null;
  },

  applyMovements: (inputs) => {
    const recorded: StockMovement[] = [];

    set((state) => {
      let products = state.products;

      for (const input of inputs) {
        const product = products.find((p) => p.id === input.productId);
        if (!product) {
          // Un movimiento sobre algo que no está en el catálogo no se inventa.
          console.warn(`Movimiento ignorado: el producto ${input.productId} no existe.`);
          continue;
        }

        const before = product.stock;
        const after = Number((before + input.quantity).toFixed(4));

        if (after < 0) {
          /* Se registra igual: la operación ya ocurrió físicamente y negarla
             haría desaparecer el hecho. Queda avisado para conciliar. */
          console.warn(
            `Stock negativo en «${product.name}»: ${before} → ${after}. Requiere conciliación.`,
          );
        }

        products = products.map((p) => (p.id === product.id ? { ...p, stock: after } : p));

        recorded.push({
          id: `MOV-${Date.now()}-${recorded.length}`,
          productId: product.id,
          productName: product.name,
          type: input.type,
          quantity: input.quantity,
          stockBefore: before,
          stockAfter: after,
          reference: input.reference,
          reason: input.reason,
          at: new Date().toISOString(),
        });
      }

      if (recorded.length === 0) return state;

      const movements = [...recorded, ...state.movements].slice(0, MOVEMENT_LIMIT);
      writePersisted(MOVEMENTS_KEY, movements);
      return { products: persist(products), movements };
    });

    return recorded;
  },

  movementsFor: (productId) => get().movements.filter((m) => m.productId === productId),

  availableSerials: (productId) =>
    get().serials.filter((s) => s.productId === productId && s.status === 'IN_STOCK'),

  checkSerial: (productId, serialNumber) => {
    const clean = serialNumber.trim();
    const found = get().serials.find((s) => s.serialNumber === clean);

    if (!found) return 'Esta serie no consta en el inventario.';
    if (found.productId !== productId) return 'La serie pertenece a otro producto.';
    if (found.status === 'SOLD')
      return `Ya vendida${found.ticketId ? ` en ${found.ticketId}` : ''}.`;
    if (found.status === 'DAMAGED') return 'Marcada como dañada: no se puede vender.';
    return undefined;
  },

  markSerialsSold: (serialNumbers, ticketId) =>
    set((state) => {
      const target = new Set(serialNumbers.map((s) => s.trim()));
      const serials = state.serials.map((s) =>
        target.has(s.serialNumber)
          ? { ...s, status: 'SOLD' as const, ticketId, updatedAt: new Date().toISOString() }
          : s,
      );
      writePersisted(SERIALS_KEY, serials);
      return { serials };
    }),

  registerSerials: (productId, serialNumbers) =>
    set((state) => {
      const known = new Set(state.serials.map((s) => s.serialNumber));
      const nuevos = serialNumbers
        .map((n) => n.trim())
        .filter((n) => n && !known.has(n))
        .map((serialNumber) => ({
          serialNumber,
          productId,
          status: 'IN_STOCK' as const,
          updatedAt: new Date().toISOString(),
        }));

      if (nuevos.length === 0) return state;
      const serials = [...nuevos, ...state.serials];
      writePersisted(SERIALS_KEY, serials);
      return { serials };
    }),

  findByBarcode: (barcode) => get().products.find((p) => p.barcode === barcode.trim()),

  sellableProducts: () => get().products.filter((p) => p.is_active),

  categories: () => [...new Set(get().products.map((p) => p.category))].sort(),
}));
