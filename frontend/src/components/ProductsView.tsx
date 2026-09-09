import React, { useState } from 'react';
import {
  Package,
  Plus,
  Search,
  Edit3,
  Printer,
  Layers,
  Scale,
  Cpu,
  History,
  Copy,
  AlertTriangle,
  FolderPlus,
  Scan,
} from 'lucide-react';
import { Badge, Button, DataTable, EmptyState, IconButton, Money, cn } from '../ui';
import type { Column } from '../ui';

interface Product {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  category: string;
  brand: string;
  unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
  cost_price: number;
  sale_price: number;
  wholesale_price: number;
  wholesale_min_qty: number;
  stock: number;
  min_stock: number;
  is_active: boolean;
  image_url?: string;
}

interface ProductSerial {
  id: number;
  product_name: string;
  serial_number: string;
  status: 'IN_STOCK' | 'SOLD' | 'RETURNED' | 'UNDER_WARRANTY';
  ticket_id?: string;
  customer_name?: string;
  updated_at: string;
}

import { useAuthStore } from '../store/useAuthStore';
import { hasPermission } from '../utils/permissions';

export const ProductsView: React.FC = () => {
  const { user } = useAuthStore();
  const userRole = user?.role || 'ADMIN';
  const canCreateProduct = hasPermission(userRole, 'can_create_product');
  const canEditProduct = hasPermission(userRole, 'can_edit_product');

  const [activeTab, setActiveTab] = useState<'catalog' | 'serials' | 'categories' | 'labels'>(
    'catalog',
  );

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [unitTypeFilter, setUnitTypeFilter] = useState('ALL');
  const [stockStatusFilter, setStockStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(10);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Product Form State
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: 'Golosinas & Snacks',
    brand: 'Genérica',
    unit_type: 'UNIT' as 'UNIT' | 'FRACTION' | 'SERIALIZED',
    cost_price: 10.0,
    sale_price: 15.0,
    wholesale_price: 13.0,
    wholesale_min_qty: 12,
    stock: 50,
    min_stock: 10,
    is_active: true,
  });

  // Mock Products List
  const [products, setProducts] = useState<Product[]>([
    {
      id: 1,
      sku: 'SKU-1001',
      barcode: '7771234567890',
      name: 'Coca Cola 2 Litros Retornable',
      category: 'Bebidas & Gaseosas',
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
      id: 2,
      sku: 'SKU-1002',
      barcode: '2000000000015',
      name: 'Queso Criollo San Javier (Kg)',
      category: 'Lácteos & Fiambrería',
      brand: 'San Javier',
      unit_type: 'FRACTION',
      cost_price: 32.0,
      sale_price: 45.0,
      wholesale_price: 40.0,
      wholesale_min_qty: 5,
      stock: 12.45,
      min_stock: 3.0,
      is_active: true,
    },
    {
      id: 3,
      sku: 'SKU-1003',
      barcode: '8806091234567',
      name: 'Smartphone Samsung Galaxy A54 128GB',
      category: 'Electrónica & Celulares',
      brand: 'Samsung',
      unit_type: 'SERIALIZED',
      cost_price: 1400.0,
      sale_price: 1850.0,
      wholesale_price: 1750.0,
      wholesale_min_qty: 3,
      stock: 4,
      min_stock: 2,
      is_active: true,
    },
    {
      id: 4,
      sku: 'SKU-1004',
      barcode: '7779876543210',
      name: 'Galletas Wafer Chocolate 150g',
      category: 'Golosinas & Snacks',
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
  ]);

  // Mock Serials List
  const [serials] = useState<ProductSerial[]>([
    {
      id: 1,
      product_name: 'Smartphone Samsung Galaxy A54 128GB',
      serial_number: 'IMEI-358492019482710',
      status: 'IN_STOCK',
      updated_at: '14/08/2026 08:30',
    },
    {
      id: 2,
      product_name: 'Smartphone Samsung Galaxy A54 128GB',
      serial_number: 'IMEI-358492019482711',
      status: 'IN_STOCK',
      updated_at: '14/08/2026 08:30',
    },
    {
      id: 3,
      product_name: 'Smartphone Samsung Galaxy A54 128GB',
      serial_number: 'IMEI-358492019482712',
      status: 'SOLD',
      ticket_id: 'TK-10012',
      customer_name: 'Comercial Bolivia S.R.L.',
      updated_at: '12/08/2026 14:15',
    },
  ]);

  // Serial Forensic Search State
  const [serialSearch, setSerialSearch] = useState('');

  // EAN-13 & SKU Auto Generator
  const generateSKU = () => {
    const randomSKU = 'SKU-' + Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, sku: randomSKU }));
  };

  const generateEAN13 = () => {
    let ean = '777' + Math.floor(100000000 + Math.random() * 900000000).toString();
    setFormData((prev) => ({ ...prev, barcode: ean }));
  };

  // Real-time Profit Margin Calculation
  const profitMargin =
    formData.sale_price > 0
      ? (((formData.sale_price - formData.cost_price) / formData.sale_price) * 100).toFixed(1)
      : '0.0';

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchesUnitType = unitTypeFilter === 'ALL' || p.unit_type === unitTypeFilter;
    const matchesStock =
      stockStatusFilter === 'ALL' ||
      (stockStatusFilter === 'CRITICAL' ? p.stock <= p.min_stock : p.stock > p.min_stock);
    return matchesSearch && matchesCategory && matchesUnitType && matchesStock;
  });

  const handleToggleProductStatus = (id: number) => {
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !p.is_active } : p)));
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) return;

    if (editingProduct) {
      setProducts((prev) =>
        prev.map((p) => (p.id === editingProduct.id ? { ...p, ...formData } : p)),
      );
    } else {
      const newProd: Product = {
        id: Date.now(),
        ...formData,
      };
      setProducts((prev) => [newProd, ...prev]);
    }
    setIsProductModalOpen(false);
  };

  const UNIT_META = {
    UNIT: { label: 'Unitario', tone: 'accent' as const, icon: <Package className="w-3 h-3" /> },
    FRACTION: { label: 'A granel', tone: 'success' as const, icon: <Scale className="w-3 h-3" /> },
    SERIALIZED: {
      label: 'Serializado',
      tone: 'warning' as const,
      icon: <Cpu className="w-3 h-3" />,
    },
  };

  const catalogColumns: Array<Column<Product>> = [
    {
      key: 'product',
      header: 'Producto',
      render: (p) => (
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 shrink-0 rounded-md bg-sunken border border-line flex items-center justify-center text-ink-3">
            {p.unit_type === 'UNIT' ? (
              <Package className="w-4 h-4" />
            ) : p.unit_type === 'FRACTION' ? (
              <Scale className="w-4 h-4" />
            ) : (
              <Cpu className="w-4 h-4" />
            )}
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink truncate">{p.name}</p>
            <p className="font-mono text-micro text-ink-3">
              {p.sku} · EAN {p.barcode}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      width: '150px',
      render: (p) => (
        <Badge tone={UNIT_META[p.unit_type].tone} icon={UNIT_META[p.unit_type].icon}>
          {UNIT_META[p.unit_type].label}
        </Badge>
      ),
    },
    {
      key: 'prices',
      header: 'Costo / Venta / Mayorista',
      align: 'right',
      width: '230px',
      render: (p) => (
        <div className="space-y-0.5">
          <div className="flex items-center justify-end gap-2">
            <span className="text-ink-3">
              <Money value={p.cost_price} size="body" />
            </span>
            <span className="text-ink-3">·</span>
            <Money value={p.sale_price} size="base" className="text-ink" />
          </div>
          <p className="text-body text-ok">
            May. <Money value={p.wholesale_price} size="body" /> (≥{p.wholesale_min_qty})
          </p>
        </div>
      ),
    },
    {
      key: 'stock',
      header: 'Stock',
      align: 'right',
      width: '130px',
      render: (p) => {
        const low = p.stock <= p.min_stock;
        const unit = p.unit_type === 'FRACTION' ? 'kg' : 'u.';
        return low ? (
          <Badge
            tone={p.stock === 0 ? 'danger' : 'warning'}
            icon={<AlertTriangle className="w-3 h-3" />}
          >
            {p.stock} {unit}
          </Badge>
        ) : (
          <span className="font-mono tnum text-ink">
            {p.stock} {unit}
          </span>
        );
      },
    },
    {
      key: 'active',
      header: 'En venta',
      align: 'center',
      width: '90px',
      render: (p) => (
        <button
          onClick={() => handleToggleProductStatus(p.id)}
          role="switch"
          aria-checked={p.is_active}
          aria-label={`${p.is_active ? 'Retirar de' : 'Poner en'} venta ${p.name}`}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full shrink-0',
            'transition-colors duration-fast ease-ease',
            p.is_active ? 'bg-ok' : 'bg-line-strong',
          )}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 rounded-full bg-white transition-transform duration-fast ease-ease',
              p.is_active ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '130px',
      render: (p) => (
        <div className="flex items-center justify-end gap-0.5">
          {canEditProduct && (
            <IconButton
              label={`Editar ${p.name}`}
              tone="accent"
              onClick={() => {
                setEditingProduct(p);
                setFormData({ ...p });
                setIsProductModalOpen(true);
              }}
            >
              <Edit3 className="w-4 h-4" />
            </IconButton>
          )}
          <IconButton label={`Duplicar ${p.name}`}>
            <Copy className="w-4 h-4" />
          </IconButton>
          <IconButton label={`Kardex de ${p.name}`}>
            <History className="w-4 h-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-canvas select-none">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        {/* Encabezado y pestañas */}
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-display text-ink">Productos</h1>
            <p className="text-base text-ink-2 mt-1">
              Artículos unitarios, a granel, serializados por IMEI y etiquetas de código de barras.
            </p>
          </div>

          <nav
            className="flex rounded-md border border-line overflow-hidden"
            aria-label="Secciones de productos"
          >
            {(
              [
                { id: 'catalog', label: 'Catálogo', icon: <Package className="w-4 h-4" /> },
                { id: 'serials', label: 'Seriales', icon: <Cpu className="w-4 h-4" /> },
                { id: 'categories', label: 'Categorías', icon: <Layers className="w-4 h-4" /> },
                { id: 'labels', label: 'Etiquetas', icon: <Printer className="w-4 h-4" /> },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                aria-current={activeTab === t.id ? 'page' : undefined}
                className={cn(
                  'h-9 px-4 flex items-center gap-2 text-body font-semibold',
                  'transition-colors duration-fast ease-ease',
                  activeTab === t.id
                    ? 'bg-accent-soft text-accent-ink'
                    : 'bg-raised text-ink-2 hover:text-ink',
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </nav>
        </header>

        {/* Catálogo maestro */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            {/* Los filtros van en una sola fila sobre la tabla */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[240px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por SKU, código de barras o nombre…"
                  className="w-full h-9 pl-9 pr-3 bg-raised border border-line-strong rounded-md text-base text-ink hover:border-ink-3 focus:border-accent transition-colors duration-fast ease-ease"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                aria-label="Categoría"
                className="h-9 px-2.5 bg-raised border border-line-strong rounded-md text-body font-semibold text-ink cursor-pointer hover:border-ink-3 transition-colors duration-fast ease-ease"
              >
                <option value="ALL">Todas las categorías</option>
                <option value="Bebidas &amp; Gaseosas">Bebidas &amp; Gaseosas</option>
                <option value="Lácteos &amp; Fiambrería">Lácteos &amp; Fiambrería</option>
                <option value="Electrónica &amp; Celulares">Electrónica &amp; Celulares</option>
                <option value="Golosinas &amp; Snacks">Golosinas &amp; Snacks</option>
              </select>

              <select
                value={unitTypeFilter}
                onChange={(e) => setUnitTypeFilter(e.target.value)}
                aria-label="Tipo de unidad"
                className="h-9 px-2.5 bg-raised border border-line-strong rounded-md text-body font-semibold text-ink cursor-pointer hover:border-ink-3 transition-colors duration-fast ease-ease"
              >
                <option value="ALL">Todos los tipos</option>
                <option value="UNIT">Unitario</option>
                <option value="FRACTION">A granel</option>
                <option value="SERIALIZED">Serializado</option>
              </select>

              <select
                value={stockStatusFilter}
                onChange={(e) => setStockStatusFilter(e.target.value)}
                aria-label="Estado de stock"
                className="h-9 px-2.5 bg-raised border border-line-strong rounded-md text-body font-semibold text-ink cursor-pointer hover:border-ink-3 transition-colors duration-fast ease-ease"
              >
                <option value="ALL">Todo el stock</option>
                <option value="NORMAL">Stock normal</option>
                <option value="CRITICAL">Bajo mínimo</option>
              </select>

              <div className="flex-1" />

              {canCreateProduct && (
                <Button
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => {
                    setEditingProduct(null);
                    setIsProductModalOpen(true);
                  }}
                >
                  Nuevo producto
                </Button>
              )}
            </div>

            <DataTable
              columns={catalogColumns}
              rows={filteredProducts}
              rowKey={(p) => p.id}
              empty={
                <EmptyState
                  icon={<Package className="w-6 h-6" />}
                  title="Sin coincidencias"
                  hint="Ajuste la búsqueda o los filtros para ver productos."
                />
              }
            />

            <div className="flex items-center justify-between text-body text-ink-2">
              <span>
                Mostrando <span className="font-mono tnum text-ink">{filteredProducts.length}</span>{' '}
                de <span className="font-mono tnum text-ink">{products.length}</span> productos
              </span>
              <label className="flex items-center gap-2">
                Registros por página
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="h-8 px-2 bg-raised border border-line-strong rounded-md text-body font-semibold text-ink cursor-pointer"
                >
                  {[10, 25, 50, 100].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        )}

        {/* TAB 2: SERIALS / IMEI MANAGER */}
        {activeTab === 'serials' && (
          <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-4">
              <div>
                <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-accent" /> Control Forense de Seriales & IMEIs
                </h3>
                <p className="text-body text-ink-3">
                  Búsqueda rápida y estado de garantía de equipos con número de serie único
                </p>
              </div>

              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
                <input
                  type="text"
                  value={serialSearch}
                  onChange={(e) => setSerialSearch(e.target.value)}
                  placeholder="Escanear o buscar número de serie/IMEI..."
                  className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-md text-body font-mono"
                />
              </div>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                  <th className="p-4">Producto Maestro</th>
                  <th className="p-4">Número de Serie / IMEI</th>
                  <th className="p-4 text-center">Estado del Serial</th>
                  <th className="p-4">Ticket / Cliente Vinculado</th>
                  <th className="p-4 text-right">Última Actualización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-body font-mono">
                {serials
                  .filter(
                    (s) =>
                      s.serial_number.includes(serialSearch) ||
                      s.product_name.toLowerCase().includes(serialSearch.toLowerCase()),
                  )
                  .map((s) => (
                    <tr key={s.id} className="hover:bg-sunken">
                      <td className="p-4 font-bold text-ink font-sans">{s.product_name}</td>
                      <td className="p-4 font-bold text-accent">{s.serial_number}</td>
                      <td className="p-4 text-center font-sans">
                        <span
                          className={`px-2.5 py-1 rounded-md text-micro font-bold border ${
                            s.status === 'IN_STOCK'
                              ? 'bg-ok-soft text-ok-ink dark:bg-ok-soft border-ok/30'
                              : 'bg-accent-soft text-accent-ink dark:bg-accent-soft border-accent/30'
                          }`}
                        >
                          {s.status === 'IN_STOCK' ? 'EN STOCK' : 'VENDIDO'}
                        </span>
                      </td>
                      <td className="p-4 font-sans text-ink-2">
                        {s.ticket_id
                          ? `${s.ticket_id} • ${s.customer_name}`
                          : 'Sin asignar (En Tienda)'}
                      </td>
                      <td className="p-4 text-right text-ink-3 text-micro">{s.updated_at}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 3: CATEGORIES & BRANDS */}
        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-extrabold text-base text-ink">Categorías Comerciales</h3>
                <button className="px-3 py-1.5 bg-accent text-white font-bold text-body rounded-md flex items-center gap-1">
                  <FolderPlus className="w-3.5 h-3.5" /> Nueva Categoría
                </button>
              </div>
              <div className="space-y-2 text-body">
                {[
                  'Bebidas & Gaseosas',
                  'Lácteos & Fiambrería',
                  'Electrónica & Celulares',
                  'Golosinas & Snacks',
                ].map((cat, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-sunken rounded-md border border-line flex items-center justify-between font-bold"
                  >
                    <span>{cat}</span>
                    <span className="text-ink-3 font-mono text-micro">Activa</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
              <div className="flex items-center justify-between border-b border-line pb-3">
                <h3 className="font-extrabold text-base text-ink">
                  Unidades de Medida y Conversiones
                </h3>
                <button className="px-3 py-1.5 bg-accent text-white font-bold text-body rounded-md">
                  + Nueva Unidad
                </button>
              </div>
              <div className="space-y-2 text-body">
                <div className="p-3 bg-sunken rounded-md border border-line flex items-center justify-between">
                  <span className="font-bold">Caja x 24 Unidades → Pieza Individual</span>
                  <span className="font-mono text-accent font-bold">Factor 24</span>
                </div>
                <div className="p-3 bg-sunken rounded-md border border-line flex items-center justify-between">
                  <span className="font-bold">Kilogramo (Kg) → Gramos (g)</span>
                  <span className="font-mono text-accent font-bold">Factor 1000</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: BARCODE LABEL GENERATOR */}
        {activeTab === 'labels' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <Scan className="w-5 h-5 text-accent" /> Configuración de Plantilla Térmica
              </h3>

              <div className="space-y-3 text-body">
                <div>
                  <label className="font-bold text-ink-2">Seleccionar Producto</label>
                  <select className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-semibold">
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.barcode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-ink-2">Formato de Etiqueta</label>
                    <select className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold">
                      <option value="50x25">Térmica 50x25 mm</option>
                      <option value="40x30">Térmica 40x30 mm</option>
                      <option value="LETTER">Hoja Carta (30 por página)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-ink-2">Cantidad a Imprimir</label>
                    <input
                      type="number"
                      defaultValue={24}
                      className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-mono font-bold"
                    />
                  </div>
                </div>

                <button className="w-full py-3 bg-accent hover:bg-accent-hover text-white rounded-md font-extrabold flex items-center justify-center gap-2 shadow-e2 transition-all">
                  <Printer className="w-4 h-4" /> Enviar a Impresora Térmica POS
                </button>
              </div>
            </div>

            {/* Real-time Label Preview */}
            <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4 flex flex-col items-center justify-center">
              <span className="text-body font-extrabold text-ink-3 uppercase tracking-widest">
                Vista Previa de Etiqueta Térmica
              </span>

              {/* Thermal Label Mockup */}
              <div className="w-64 p-4 bg-white text-black border-2 border-dashed border-gray-400 rounded-md text-center space-y-2 shadow-e1">
                <span className="font-black text-body block tracking-wide uppercase">
                  SUPERO POS ENTERPRISE
                </span>
                <p className="font-bold text-body line-clamp-1">{products[0]?.name}</p>
                <div className="py-2 bg-black text-white font-mono text-micro font-bold tracking-widest rounded">
                  ||||| | |||||| |||| | |||||
                </div>
                <span className="font-mono text-micro block">{products[0]?.barcode}</span>
                <span className="font-black text-base text-accent-ink block">
                  ${products[0]?.sale_price.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCT FORM MODAL (ProductFormModal) */}
        {isProductModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-2xl overflow-hidden space-y-4">
              <div className="p-5 border-b border-line flex items-center justify-between">
                <h3 className="font-extrabold text-base text-ink">
                  {editingProduct
                    ? 'Editar Producto del Catálogo'
                    : 'Crear Nuevo Producto en Catálogo Maestro'}
                </h3>
                <button
                  onClick={() => setIsProductModalOpen(false)}
                  className="text-ink-3 hover:text-ink-2"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="p-5 space-y-4 text-body">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-ink-2">Código SKU *</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        required
                        value={formData.sku}
                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                        placeholder="SKU-1001"
                        className="w-full p-2 bg-sunken border border-line rounded-md font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={generateSKU}
                        className="px-3 bg-accent-soft text-accent font-bold rounded-md text-micro"
                        title="Generar SKU"
                      >
                        Auto
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="font-bold text-ink-2">Código de Barras (EAN-13)</label>
                    <div className="flex gap-2 mt-1">
                      <input
                        type="text"
                        value={formData.barcode}
                        onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                        placeholder="7771234567890"
                        className="w-full p-2 bg-sunken border border-line rounded-md font-mono"
                      />
                      <button
                        type="button"
                        onClick={generateEAN13}
                        className="px-3 bg-ok-soft text-ok font-bold rounded-md text-micro"
                        title="Generar EAN13"
                      >
                        EAN
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-ink-2">Nombre Comercial del Producto *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Coca Cola 2 Litros Retornable"
                    className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-ink-2">Tipo de Unidad *</label>
                    <select
                      value={formData.unit_type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          unit_type: e.target.value as typeof formData.unit_type,
                        })
                      }
                      className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold"
                    >
                      <option value="UNIT">Pieza Estándar (UNIT)</option>
                      <option value="FRACTION">Pesable / Granel (FRACTION)</option>
                      <option value="SERIALIZED">Serializado / IMEI (SERIALIZED)</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-bold text-ink-2">Categoría</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-semibold"
                    >
                      <option value="Bebidas & Gaseosas">Bebidas & Gaseosas</option>
                      <option value="Lácteos & Fiambrería">Lácteos & Fiambrería</option>
                      <option value="Electrónica & Celulares">Electrónica & Celulares</option>
                      <option value="Golosinas & Snacks">Golosinas & Snacks</option>
                    </select>
                  </div>
                </div>

                {/* Financial & Prices Section */}
                <div className="p-3 bg-sunken rounded-md border border-line space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-ink">
                      Precios & Margen de Rentabilidad (CPP)
                    </span>
                    <span className="text-body font-extrabold text-ok bg-ok-soft px-2 py-0.5 rounded-md border border-ok/30">
                      Margen Utilidad: {profitMargin}%
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="font-bold text-ink-2 text-micro">Costo Base (CPP) $</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.cost_price}
                        onChange={(e) =>
                          setFormData({ ...formData, cost_price: Number(e.target.value) })
                        }
                        className="w-full mt-1 p-2 bg-raised border border-line rounded-md font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-accent text-micro">Precio Minorista $</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.sale_price}
                        onChange={(e) =>
                          setFormData({ ...formData, sale_price: Number(e.target.value) })
                        }
                        className="w-full mt-1 p-2 bg-raised border border-line rounded-md font-mono font-extrabold text-accent"
                      />
                    </div>
                    <div>
                      <label className="font-bold text-ok text-micro">Precio Mayorista $</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formData.wholesale_price}
                        onChange={(e) =>
                          setFormData({ ...formData, wholesale_price: Number(e.target.value) })
                        }
                        className="w-full mt-1 p-2 bg-raised border border-line rounded-md font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsProductModalOpen(false)}
                    className="px-4 py-2 bg-sunken text-ink rounded-md font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md font-extrabold shadow"
                  >
                    Guardar Producto
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
