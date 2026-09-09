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

interface CatalogState {
  products: Product[];
  addProduct: (product: Omit<Product, 'id'>) => Product;
  updateProduct: (id: number, patch: Partial<Product>) => void;
  removeProduct: (id: number) => void;
  toggleActive: (id: number) => void;
  /** Descuenta existencias tras una venta. Admite decimales por el granel. */
  adjustStock: (id: number, delta: number) => void;
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

  adjustStock: (id, delta) =>
    set((state) => ({
      products: persist(
        state.products.map((p) =>
          p.id === id ? { ...p, stock: Number((p.stock + delta).toFixed(4)) } : p,
        ),
      ),
    })),

  findByBarcode: (barcode) => get().products.find((p) => p.barcode === barcode.trim()),

  sellableProducts: () => get().products.filter((p) => p.is_active),

  categories: () => [...new Set(get().products.map((p) => p.category))].sort(),
}));
