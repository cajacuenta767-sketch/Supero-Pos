import React, { useMemo, useState } from 'react';
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
  Barcode,
  ean13CheckDigit,
  isValidEan13,
  Button,
  Card,
  ImageUpload,
  Modal,
  DataTable,
  EmptyState,
  IconButton,
  Input,
  Money,
  Select,
  Toolbar,
  cn,
  useToast,
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
import { useViewShortcuts } from '../hooks/useViewShortcuts';
import { useDebounced } from '../hooks/useDebounced';
import type { Column } from '../ui';

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
import { isPrintingAvailable, printProductLabels } from '../services/printing';
import { useCatalogStore, MOVEMENT_LABEL, type Product } from '../store/useCatalogStore';
import { formatDateTime } from '../utils/dates';

export const ProductsView: React.FC = () => {
  const { user } = useAuthStore();
  const toast = useToast();

  /* F2 lleva el foco al buscador. */
  useViewShortcuts({});
  // Sin respaldo a ADMIN: un perfil sin rol no debe habilitar altas ni ediciones.
  const userRole = user?.role;
  const canCreateProduct = hasPermission(userRole, 'can_create_product');
  const canEditProduct = hasPermission(userRole, 'can_edit_product');

  const [activeTab, setActiveTab] = useState<'catalog' | 'serials' | 'categories' | 'labels'>(
    'catalog',
  );

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  /* El filtro corría en cada pulsación sobre la lista entera. */
  const searchQueryDebounced = useDebounced(searchQuery);
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
    image_url: undefined as string | undefined,
  });

  /* Catálogo compartido con el punto de venta. Antes esta vista tenía su propia
     lista, con nombres, SKU y precios distintos para los mismos artículos: dar
     de alta un producto aquí no lo hacía vendible allí. */
  const products = useCatalogStore((state) => state.products);
  const addProduct = useCatalogStore((state) => state.addProduct);
  const updateProduct = useCatalogStore((state) => state.updateProduct);
  const toggleActive = useCatalogStore((state) => state.toggleActive);

  /* Las series salen del catálogo compartido: eran estado local de esta vista,
     así que el punto de venta no podía comprobarlas al cobrar. */
  const serialInventory = useCatalogStore((state) => state.serials);
  const serials: ProductSerial[] = useMemo(
    () =>
      serialInventory.map((s, index) => ({
        id: index + 1,
        product_name: products.find((p) => p.id === s.productId)?.name ?? 'Producto retirado',
        serial_number: s.serialNumber,
        status: s.status === 'DAMAGED' ? 'RETURNED' : s.status,
        ticket_id: s.ticketId,
        updated_at: s.updatedAt ? formatDateTime(s.updatedAt) : '—',
      })),
    [serialInventory, products],
  );

  // Serial Forensic Search State
  const [serialSearch, setSerialSearch] = useState('');

  /* Kardex por producto: el store lo lleva desde la primera ola y ninguna
     pantalla lo enseñaba. El icono de historial de cada fila no hacía nada. */
  const [kardexProduct, setKardexProduct] = useState<Product | null>(null);
  const [formError, setFormError] = useState<string | undefined>();
  const duplicateOf = useCatalogStore((state) => state.duplicateOf);
  const movementsFor = useCatalogStore((state) => state.movementsFor);
  const kardex = kardexProduct ? movementsFor(kardexProduct.id) : [];

  /* Duplicar: el icono tampoco hacía nada. Abre el alta con una copia, sin
     existencias y con SKU y código de barras nuevos —dos productos no pueden
     compartir el código que lee el escáner—. */
  const duplicateProduct = (p: Product) => {
    const base = '777' + Math.floor(100000000 + Math.random() * 900000000).toString();
    setEditingProduct(null);
    setFormError(undefined);
    setFormData({
      sku: `${p.sku}-COPIA`,
      barcode: base + ean13CheckDigit(base),
      name: `${p.name} (copia)`,
      category: p.category,
      brand: p.brand ?? 'Genérica',
      unit_type: p.unit_type,
      cost_price: p.cost_price,
      sale_price: p.sale_price,
      wholesale_price: p.wholesale_price,
      wholesale_min_qty: p.wholesale_min_qty,
      stock: 0,
      min_stock: p.min_stock,
      is_active: p.is_active,
      image_url: p.image_url,
    });
    setIsProductModalOpen(true);
  };

  // EAN-13 & SKU Auto Generator
  const generateSKU = () => {
    const randomSKU = 'SKU-' + Math.floor(1000 + Math.random() * 9000);
    setFormData((prev) => ({ ...prev, sku: randomSKU }));
  };

  // '777' es el prefijo GS1 de Bolivia. Los 9 dígitos siguientes completan los
  // 12 de datos; el decimotercero es el de control y lo calcula la primitiva,
  // no nosotros: un EAN-13 sin él no lo lee ningún escáner.
  const generateEAN13 = () => {
    const base = '777' + Math.floor(100000000 + Math.random() * 900000000).toString();
    setFormData((prev) => ({ ...prev, barcode: base + ean13CheckDigit(base) }));
  };

  const handlePrintLabels = async () => {
    if (!selectedLabelProduct) return;

    if (!isPrintingAvailable()) {
      toast(
        'La impresión de etiquetas solo está disponible en la terminal de escritorio.',
        'warning',
      );
      return;
    }

    const outcome = await printProductLabels({
      productName: selectedLabelProduct.name,
      sku: selectedLabelProduct.sku,
      barcode: selectedLabelProduct.barcode,
      price: selectedLabelProduct.sale_price,
      copies: labelCopies,
      labelSize,
    });

    if (outcome.printed) {
      toast(
        `${labelCopies} ${labelCopies === 1 ? 'etiqueta enviada' : 'etiquetas enviadas'} a la impresora`,
        'success',
      );
    } else {
      toast(`No se pudo imprimir: ${outcome.reason}`, 'danger');
    }
  };

  const barcodeError = (() => {
    const code = formData.barcode.trim();
    if (code === '') return undefined;
    if (!/^\d+$/.test(code)) return 'Solo dígitos.';
    if (code.length !== 13) return `Un EAN-13 tiene 13 dígitos; llevas ${code.length}.`;
    if (!isValidEan13(code))
      return `Dígito de control incorrecto: debería terminar en ${ean13CheckDigit(code)}.`;
    return undefined;
  })();

  // Real-time Profit Margin Calculation
  const profitMargin =
    formData.sale_price > 0
      ? (((formData.sale_price - formData.cost_price) / formData.sale_price) * 100).toFixed(1)
      : '0.0';

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQueryDebounced.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQueryDebounced.toLowerCase()) ||
      p.barcode.includes(searchQueryDebounced);
    const matchesCategory = categoryFilter === 'ALL' || p.category === categoryFilter;
    const matchesUnitType = unitTypeFilter === 'ALL' || p.unit_type === unitTypeFilter;
    const matchesStock =
      stockStatusFilter === 'ALL' ||
      (stockStatusFilter === 'CRITICAL' ? p.stock <= p.min_stock : p.stock > p.min_stock);
    return matchesSearch && matchesCategory && matchesUnitType && matchesStock;
  });

  const handleToggleProductStatus = (id: number) => toggleActive(id);

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    /* Antes esto era un `return` mudo: sin nombre o sin SKU el botón no hacía
       nada y no decía por qué. */
    if (!formData.name.trim()) {
      setFormError('El nombre del producto es obligatorio.');
      return;
    }
    if (!formData.sku.trim()) {
      setFormError('El SKU es obligatorio: es lo que cruza el producto con las compras.');
      return;
    }

    /* Dos productos con el mismo código de barras hacen que el escáner cobre
       el que encuentra primero, y nadie se entera hasta el conteo. */
    const clash = duplicateOf(formData, editingProduct?.id);
    if (clash) {
      setFormError(
        clash.field === 'sku'
          ? `El SKU «${formData.sku}» ya es de «${clash.product.name}».`
          : `El código de barras «${formData.barcode}» ya es de «${clash.product.name}»: el escáner no podría distinguirlos.`,
      );
      return;
    }

    if (editingProduct) {
      updateProduct(editingProduct.id, formData);
      toast(`«${formData.name}» actualizado`, 'success');
    } else {
      addProduct(formData);
      toast(`«${formData.name}» añadido al catálogo`, 'success');
    }
    setFormError(undefined);
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
      card: 'title',
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
          <span className="w-9 h-9 shrink-0 rounded-md bg-sunken border border-line overflow-hidden flex items-center justify-center text-ink-3">
            {p.image_url ? (
              <img src={p.image_url} alt="" className="w-full h-full object-cover" />
            ) : p.unit_type === 'UNIT' ? (
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
      card: 'meta',
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
      card: 'hidden',
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
                setFormError(undefined);
                // `brand` es opcional en el catálogo y el formulario lo trata
                // como cadena: se normaliza al cargar en vez de al guardar.
                setFormData({ ...p, brand: p.brand ?? '', image_url: p.image_url });
                setIsProductModalOpen(true);
              }}
            >
              <Edit3 className="w-4 h-4" />
            </IconButton>
          )}
          {canEditProduct && (
            <IconButton label={`Duplicar ${p.name}`} onClick={() => duplicateProduct(p)}>
              <Copy className="w-4 h-4" />
            </IconButton>
          )}
          <IconButton label={`Kardex de ${p.name}`} onClick={() => setKardexProduct(p)}>
            <History className="w-4 h-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  const kardexColumns: Array<Column<(typeof kardex)[number]>> = [
    {
      key: 'at',
      header: 'Fecha y hora',
      width: '160px',
      render: (m) => (
        <span className="font-mono tnum text-body text-ink-2">{formatDateTime(m.at)}</span>
      ),
    },
    {
      key: 'type',
      header: 'Motivo',
      render: (m) => (
        <div>
          <Badge tone={m.quantity >= 0 ? 'success' : 'danger'}>{MOVEMENT_LABEL[m.type]}</Badge>
          {m.reason && <p className="text-body text-ink-3 mt-1">{m.reason}</p>}
        </div>
      ),
    },
    {
      key: 'reference',
      header: 'Documento',
      width: '150px',
      render: (m) => <span className="font-mono text-body text-ink-3">{m.reference ?? '—'}</span>,
    },
    {
      key: 'quantity',
      header: 'Cantidad',
      align: 'right',
      width: '110px',
      sortValue: (m) => m.quantity,
      render: (m) => (
        <span
          className={cn(
            'font-mono tnum font-semibold',
            m.quantity >= 0 ? 'text-ok' : 'text-danger',
          )}
        >
          {m.quantity > 0 ? '+' : ''}
          {m.quantity}
        </span>
      ),
    },
    {
      key: 'stockAfter',
      header: 'Queda',
      align: 'right',
      width: '100px',
      render: (m) => <span className="font-mono tnum text-ink-2">{m.stockAfter}</span>,
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
              caption="Catálogo de productos con precio, existencias y estado"
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
              caption="Números de serie e IMEI registrados por producto"
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
                caption="Categorías del catálogo y cuántos productos contienen"
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
                caption="Equivalencias entre unidades de medida"
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
                {/* Antes este botón no tenía acción: se pulsaba y no ocurría
                    nada, ni un aviso. */}
                <Button
                  icon={<Printer className="w-4 h-4" />}
                  disabled={!selectedLabelProduct || !isValidEan13(selectedLabelProduct.barcode)}
                  onClick={handlePrintLabels}
                >
                  Imprimir {labelCopies}
                </Button>
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
                <Barcode
                  value={selectedLabelProduct?.barcode ?? ''}
                  height={labelSize === '50x25' ? 30 : 24}
                  moduleWidth={1}
                />
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
        onClose={() => {
          setIsProductModalOpen(false);
          setFormError(undefined);
        }}
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
        {/* `noValidate` deja pasar el envío para que valide el manejador: el
            aviso nativo del navegador sale en su idioma —«Please fill out this
            field.» en una interfaz en español— y en una burbuja flotante, no
            junto al campo como el resto de los errores de la aplicación. Los
            campos conservan `required` por su semántica accesible. */}
        <form id="product-form" noValidate onSubmit={handleSaveProduct} className="space-y-5">
          {formError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-danger-soft border border-danger/25 flex items-start gap-2 text-body text-danger-ink"
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              {formError}
            </div>
          )}

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
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      barcode: e.target.value.replace(/\D/g, '').slice(0, 13),
                    })
                  }
                  placeholder="7771234567890"
                  error={barcodeError}
                  /* Ambos campos llevan siempre línea de mensaje: la fila se alinea
                     por abajo, y un mensaje que aparece y desaparece movía el botón
                     «Auto» respecto al de al lado. */
                  hint={
                    isValidEan13(formData.barcode)
                      ? 'Código válido, listo para imprimir.'
                      : '13 dígitos. «Auto» genera uno con su dígito de control.'
                  }
                  className="flex-1 [&_input]:font-mono"
                />
                <Button type="button" variant="secondary" onClick={generateEAN13}>
                  Auto
                </Button>
              </div>
              {isValidEan13(formData.barcode) && (
                <div className="lg:col-span-2 flex justify-center py-2 bg-surface border border-line rounded-md">
                  <Barcode value={formData.barcode} height={36} moduleWidth={2} />
                </div>
              )}
              <Input
                label="Nombre del producto"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="lg:col-span-2"
              />
            </div>
          </section>

          <section className="pt-4 border-t border-line">
            <ImageUpload
              value={formData.image_url ?? null}
              onChange={(url) => setFormData({ ...formData, image_url: url ?? undefined })}
              label="Imagen del producto"
              hint="El cajero reconoce un producto por su foto antes que por su nombre: es lo que hace rápida la rejilla del punto de venta."
              preview="lg"
              maxSize={600}
            />
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

      {/* Kardex del producto */}
      <Modal
        isOpen={kardexProduct !== null}
        onClose={() => setKardexProduct(null)}
        icon={<History className="w-4 h-4" />}
        title="Movimientos del producto"
        subtitle={kardexProduct?.name}
        size="lg"
      >
        {kardex.length === 0 ? (
          <EmptyState
            icon={<History className="w-6 h-6" />}
            title="Sin movimientos registrados"
            hint="Las ventas, recepciones, mermas y ajustes de este producto aparecerán aquí."
          />
        ) : (
          <DataTable
            caption={`Movimientos de existencias de ${kardexProduct?.name ?? 'el producto'}`}
            columns={kardexColumns}
            rows={kardex}
            rowKey={(m) => m.id}
            dense
          />
        )}
      </Modal>
    </div>
  );
};
