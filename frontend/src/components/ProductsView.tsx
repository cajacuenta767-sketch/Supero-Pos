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
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  Modal,
  DataTable,
  EmptyState,
  IconButton,
  Input,
  Money,
  Select,
  Toolbar,
  cn,
} from '../ui';

type LabelSize = '50x25' | '40x20';

/* Medidas físicas del adhesivo a 96 ppp: no escalan con la ventana. */
const LABEL_PX: Record<LabelSize, { w: number; h: number }> = {
  '50x25': { w: 189, h: 94 },
  '40x20': { w: 151, h: 76 },
};

const CATEGORY_ROWS = [
  { name: 'Bebidas y gaseosas', products: 42 },
  { name: 'Lácteos y fiambrería', products: 28 },
  { name: 'Electrónica y celulares', products: 63 },
  { name: 'Golosinas y snacks', products: 51 },
];

const UNIT_ROWS = [
  { from: 'Caja de 24', to: 'Pieza individual', factor: 24 },
  { from: 'Kilogramo', to: 'Gramo', factor: 1000 },
];
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

  const [labelProductSku, setLabelProductSku] = useState('SKU-1001');
  const [labelSize, setLabelSize] = useState<LabelSize>('50x25');
  const [labelCopies, setLabelCopies] = useState(12);

  const selectedLabelProduct = products.find((p) => p.sku === labelProductSku) ?? products[0];

  const filteredSerials = serials.filter(
    (s) =>
      s.serial_number.includes(serialSearch) ||
      s.product_name.toLowerCase().includes(serialSearch.toLowerCase()),
  );

  const serialColumns: Array<Column<(typeof serials)[number]>> = [
    {
      key: 'product',
      header: 'Producto',
      render: (s) => (
        <span className="text-base font-semibold text-ink truncate">{s.product_name}</span>
      ),
    },
    {
      key: 'serial',
      header: 'Número de serie / IMEI',
      width: '260px',
      render: (s) => <span className="font-mono text-body text-ink">{s.serial_number}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      width: '140px',
      render: (s) => (
        <Badge tone={s.status === 'IN_STOCK' ? 'success' : 'accent'}>
          {s.status === 'IN_STOCK' ? 'En stock' : 'Vendido'}
        </Badge>
      ),
    },
    {
      key: 'ticket',
      header: 'Ticket vinculado',
      render: (s) => <span className="font-mono text-body text-ink-2">{s.ticket_id ?? '—'}</span>,
    },
  ];

  const categoryColumns: Array<Column<(typeof CATEGORY_ROWS)[number]>> = [
    {
      key: 'name',
      header: 'Categoría',
      render: (c) => <span className="text-base font-semibold text-ink">{c.name}</span>,
    },
    {
      key: 'count',
      header: 'Productos',
      align: 'right',
      width: '120px',
      render: (c) => <span className="font-mono tnum text-ink-2">{c.products}</span>,
    },
  ];

  const unitColumns: Array<Column<(typeof UNIT_ROWS)[number]>> = [
    {
      key: 'conv',
      header: 'Conversión',
      render: (u) => (
        <span className="text-base text-ink">
          {u.from} <span className="text-ink-3">→</span> {u.to}
        </span>
      ),
    },
    {
      key: 'factor',
      header: 'Factor',
      align: 'right',
      width: '110px',
      render: (u) => <span className="font-mono tnum text-ink">{u.factor}</span>,
    },
  ];

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
          <div className="space-y-4">
            <Toolbar
              search={serialSearch}
              onSearchChange={setSerialSearch}
              searchPlaceholder="Escanear o buscar número de serie / IMEI…"
            />
            <DataTable
              columns={serialColumns}
              rows={filteredSerials}
              rowKey={(s) => s.id}
              empty={
                <EmptyState
                  icon={<Cpu className="w-6 h-6" />}
                  title="Sin series que coincidan"
                  hint="Escanee un IMEI o busque por nombre de producto."
                />
              }
            />
          </div>
        )}

        {activeTab === 'categories' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            <Card
              title="Categorías"
              subtitle="Agrupan el catálogo y filtran el punto de venta."
              icon={<Layers className="w-4 h-4" />}
              action={
                <Button size="sm" variant="secondary" icon={<FolderPlus className="w-3.5 h-3.5" />}>
                  Nueva
                </Button>
              }
              padding="none"
            >
              <DataTable
                columns={categoryColumns}
                rows={CATEGORY_ROWS}
                rowKey={(c) => c.name}
                dense
                className="border-0 rounded-none"
              />
            </Card>

            <Card
              title="Unidades y conversiones"
              subtitle="Permiten comprar en caja y vender por pieza."
              icon={<Scale className="w-4 h-4" />}
              action={
                <Button size="sm" variant="secondary" icon={<Plus className="w-3.5 h-3.5" />}>
                  Nueva
                </Button>
              }
              padding="none"
            >
              <DataTable
                columns={unitColumns}
                rows={UNIT_ROWS}
                rowKey={(u) => u.from}
                dense
                className="border-0 rounded-none"
              />
            </Card>
          </div>
        )}

        {activeTab === 'labels' && (
          <div className="flex flex-col xl:flex-row gap-5 items-start">
            <Card
              title="Etiqueta"
              icon={<Printer className="w-4 h-4" />}
              className="flex-1 min-w-0"
            >
              <div className="space-y-4">
                <Select
                  label="Producto"
                  value={labelProductSku}
                  onChange={(e) => setLabelProductSku(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.sku}>
                      {p.name}
                    </option>
                  ))}
                </Select>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Tamaño"
                    hint="Medida física del papel adhesivo."
                    value={labelSize}
                    onChange={(e) => setLabelSize(e.target.value as LabelSize)}
                  >
                    <option value="50x25">50 × 25 mm · estante</option>
                    <option value="40x20">40 × 20 mm · producto pequeño</option>
                  </Select>
                  <Input
                    label="Copias"
                    type="number"
                    min={1}
                    max={200}
                    value={labelCopies}
                    onChange={(e) => setLabelCopies(parseInt(e.target.value) || 1)}
                    className="[&_input]:font-mono"
                  />
                </div>
                <Button icon={<Printer className="w-4 h-4" />}>Imprimir {labelCopies}</Button>
              </div>
            </Card>

            {/* Al ancho real del adhesivo: es una medida física y no escala. */}
            <div className="shrink-0 space-y-2">
              <p className="text-micro uppercase text-ink-2">Vista previa · {labelSize} mm</p>
              <div
                className="bg-white text-black border border-line-strong rounded-sm p-2 flex flex-col items-center justify-center gap-1"
                style={{ width: LABEL_PX[labelSize].w, height: LABEL_PX[labelSize].h }}
              >
                <span className="text-[9px] font-semibold text-center leading-tight line-clamp-2">
                  {selectedLabelProduct?.name ?? ''}
                </span>
                <div className="flex items-end gap-[1px] h-6">
                  {Array.from({ length: 28 }, (_, i) => (
                    <span
                      key={i}
                      className="bg-black"
                      style={{ width: i % 3 === 0 ? 2 : 1, height: '100%' }}
                    />
                  ))}
                </div>
                <span className="font-mono text-[8px]">{selectedLabelProduct?.barcode ?? ''}</span>
                <span className="font-mono text-[11px] font-bold">
                  ${selectedLabelProduct?.sale_price.toFixed(2) ?? '0.00'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Alta y edición de producto */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        icon={<Package className="w-4 h-4" />}
        title={editingProduct ? 'Editar producto' : 'Nuevo producto'}
        subtitle={editingProduct?.name}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsProductModalOpen(false)}>
              Cancelar
            </Button>
            <Button form="product-form" type="submit">
              Guardar
            </Button>
          </>
        }
      >
        <form id="product-form" onSubmit={handleSaveProduct} className="space-y-5">
          <section className="space-y-3">
            <p className="text-micro uppercase text-ink-3">Identificación</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="flex items-end gap-2">
                <Input
                  label="Código SKU"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  placeholder="SKU-1001"
                  className="flex-1 [&_input]:font-mono"
                />
                <Button type="button" variant="secondary" onClick={generateSKU}>
                  Auto
                </Button>
              </div>
              <div className="flex items-end gap-2">
                <Input
                  label="Código de barras EAN-13"
                  value={formData.barcode}
                  onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                  placeholder="7771234567890"
                  className="flex-1 [&_input]:font-mono"
                />
                <Button type="button" variant="secondary" onClick={generateEAN13}>
                  Auto
                </Button>
              </div>
              <Input
                label="Nombre del producto"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="lg:col-span-2"
              />
            </div>
          </section>

          <section className="space-y-3 pt-4 border-t border-line">
            <p className="text-micro uppercase text-ink-3">Tipo y stock</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Select
                label="Tipo de unidad"
                value={formData.unit_type}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unit_type: e.target.value as typeof formData.unit_type,
                  })
                }
              >
                <option value="UNIT">Unitario</option>
                <option value="FRACTION">A granel</option>
                <option value="SERIALIZED">Serializado con IMEI</option>
              </Select>
              <Input
                label="Stock actual"
                type="number"
                step="0.001"
                value={formData.stock}
                onChange={(e) =>
                  setFormData({ ...formData, stock: parseFloat(e.target.value) || 0 })
                }
                className="[&_input]:font-mono [&_input]:text-right"
              />
              <Input
                label="Stock mínimo"
                hint="Por debajo, el producto se marca en ámbar."
                type="number"
                value={formData.min_stock}
                onChange={(e) =>
                  setFormData({ ...formData, min_stock: parseFloat(e.target.value) || 0 })
                }
                className="[&_input]:font-mono [&_input]:text-right"
              />
            </div>
          </section>

          <section className="space-y-3 pt-4 border-t border-line">
            <p className="text-micro uppercase text-ink-3">Precios</p>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Input
                label="Costo"
                type="number"
                step="0.01"
                value={formData.cost_price}
                onChange={(e) =>
                  setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })
                }
                className="[&_input]:font-mono [&_input]:text-right"
              />
              <Input
                label="Precio de venta"
                type="number"
                step="0.01"
                value={formData.sale_price}
                onChange={(e) =>
                  setFormData({ ...formData, sale_price: parseFloat(e.target.value) || 0 })
                }
                className="[&_input]:font-mono [&_input]:text-right"
              />
              <Input
                label="Precio mayorista"
                type="number"
                step="0.01"
                value={formData.wholesale_price}
                onChange={(e) =>
                  setFormData({ ...formData, wholesale_price: parseFloat(e.target.value) || 0 })
                }
                className="[&_input]:font-mono [&_input]:text-right"
              />
            </div>

            <div className="flex items-center justify-between px-4 h-12 rounded-md bg-sunken border border-line">
              <span className="text-base text-ink-2">Margen sobre el costo</span>
              <span
                className={cn(
                  'font-mono tnum text-title font-semibold',
                  parseFloat(profitMargin) >= 20
                    ? 'text-ok'
                    : parseFloat(profitMargin) > 0
                      ? 'text-warn'
                      : 'text-danger',
                )}
              >
                {profitMargin}%
              </span>
            </div>
          </section>
        </form>
      </Modal>
    </div>
  );
};
