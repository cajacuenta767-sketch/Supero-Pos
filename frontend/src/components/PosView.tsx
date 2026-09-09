import React, { useEffect, useRef, useState } from 'react';
import {
  CreditCard, Lock, Minus, Plus, QrCode, Scale, Search,
  ShieldAlert, ShieldCheck, ShoppingBag, Sparkles, Tag, Trash2, Unlock, User,
} from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { hasPermission } from '../utils/permissions';
import { ImeiModal } from './ImeiModal';
import { DecimalQuantityModal } from './DecimalQuantityModal';
import { CheckoutModal } from './CheckoutModal';
import { CashShiftModal } from './CashShiftModal';
import { CustomerModal } from './CustomerModal';
import { SupervisorPinModal } from './SupervisorPinModal';
import { Badge, Button, EmptyState, IconButton, Kbd, Money, cn } from '../ui';

interface ProductItem {
  id: number;
  sku: string;
  barcode: string;
  name: string;
  unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
  retail_price: number;
  wholesale_price: number;
  wholesale_min_qty: number;
  stock: number;
  min_stock: number;
  category: string;
}

const MASTER_POS_CATALOG: ProductItem[] = [
  { id: 101, sku: 'ELE-S23-001', barcode: '7750123456789', name: 'Smartphone Galaxy S23 Ultra (128GB)', unit_type: 'SERIALIZED', retail_price: 850.00, wholesale_price: 800.00, wholesale_min_qty: 3, stock: 12, min_stock: 4, category: 'Electrónica' },
  { id: 102, sku: 'AB-QSO-002', barcode: '7759876543210', name: 'Queso Criollo (a granel / kg)', unit_type: 'FRACTION', retail_price: 45.00, wholesale_price: 40.00, wholesale_min_qty: 5, stock: 45.5, min_stock: 10, category: 'Abarrotes' },
  { id: 103, sku: 'ELE-AUD-003', barcode: '7751112223334', name: 'Audífonos Bluetooth Wireless Pro', unit_type: 'UNIT', retail_price: 35.00, wholesale_price: 28.00, wholesale_min_qty: 6, stock: 30, min_stock: 8, category: 'Electrónica' },
  { id: 104, sku: 'AB-CAR-004', barcode: '7754445556667', name: 'Carne Lomo Fino (a granel / kg)', unit_type: 'FRACTION', retail_price: 68.00, wholesale_price: 62.00, wholesale_min_qty: 4, stock: 25.0, min_stock: 10, category: 'Abarrotes' },
  { id: 105, sku: 'ELE-TAB-005', barcode: '7757778889990', name: 'Tablet Pro 11" 256GB WiFi', unit_type: 'SERIALIZED', retail_price: 620.00, wholesale_price: 580.00, wholesale_min_qty: 2, stock: 8, min_stock: 10, category: 'Electrónica' },
  { id: 106, sku: 'AB-LAC-006', barcode: '7753332221110', name: 'Leche Entera 1 Litro (Caja)', unit_type: 'UNIT', retail_price: 8.50, wholesale_price: 7.50, wholesale_min_qty: 12, stock: 120, min_stock: 24, category: 'Abarrotes' },
];

const CATEGORIES = ['TODOS', 'Abarrotes', 'Electrónica', 'Bebidas', 'Lácteos'];

export const PosView: React.FC = () => {
  const { user } = useAuthStore();
  const userRole = user?.role || 'ADMIN';
  const canAccessPos = hasPermission(userRole, 'can_access_pos');
  const canApplyDiscount = hasPermission(userRole, 'can_apply_discount');

  const { cashShift, selectedCustomer, manualDiscount, pendingSyncCount, setManualDiscount } = usePosStore();
  const { items, addItem, removeItem, updateQuantity, clearCart, getSubtotal, getTotal, getDiscountAmount } = useCartStore();

  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* Retroalimentación periférica: la última fila añadida destella 420ms.
     El cajero confirma el escaneo sin apartar la vista del producto. */
  const [flashId, setFlashId] = useState<number | null>(null);
  const cartEndRef = useRef<HTMLDivElement>(null);

  const [isCashShiftModalOpen, setIsCashShiftModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [targetManualDiscount, setTargetManualDiscount] = useState(0);
  const [pendingSerializedProduct, setPendingSerializedProduct] = useState<ProductItem | null>(null);
  const [pendingFractionalProduct, setPendingFractionalProduct] = useState<ProductItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  useEffect(() => {
    if (cashShift === null) setIsCashShiftModalOpen(true);
  }, [cashShift]);

  const signalAdded = (id: number) => {
    setFlashId(id);
    window.setTimeout(() => setFlashId((c) => (c === id ? null : c)), 460);
    window.requestAnimationFrame(() =>
      cartEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }),
    );
  };

  const handleSelectProduct = (product: ProductItem) => {
    if (cashShift === null) {
      setIsCashShiftModalOpen(true);
      return;
    }
    if (product.unit_type === 'SERIALIZED') {
      setPendingSerializedProduct(product);
    } else if (product.unit_type === 'FRACTION') {
      setPendingFractionalProduct(product);
    } else {
      addItem({ ...product }, 1);
      signalAdded(product.id);
    }
  };

  // Lector láser nativo (<10 ms)
  useBarcodeScanner((barcode) => {
    const matched = MASTER_POS_CATALOG.find(
      (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase(),
    );
    if (matched) {
      handleSelectProduct(matched);
      setSearchQuery('');
    }
  });

  // F2 busca · F8/F12 cobra
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F8' || e.key === 'F12') {
        e.preventDefault();
        if (items.length > 0 && cashShift !== null) setIsCheckoutOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items, cashShift]);

  if (!canAccessPos) {
    return (
      <EmptyState
        className="bg-canvas"
        icon={<ShieldAlert className="w-6 h-6 text-danger" />}
        title="Acceso restringido al punto de venta"
        hint={`El rol ${userRole} no tiene permisos para operar la terminal de ventas.`}
      />
    );
  }

  const handleApplyManualDiscountClick = (desired: number) => {
    if (desired > 10) {
      setTargetManualDiscount(desired);
      setIsSupervisorModalOpen(true);
    } else {
      setManualDiscount(desired);
    }
  };

  const q = searchQuery.toLowerCase();
  const filteredCatalog = MASTER_POS_CATALOG.filter(
    (p) =>
      (selectedCategory === 'TODOS' || p.category === selectedCategory) &&
      (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.barcode.includes(searchQuery)),
  );

  const customerDiscountRate = selectedCustomer?.discountPercentage || 0;
  const subtotalNeto = getSubtotal();
  const totalDiscount = getDiscountAmount(customerDiscountRate, manualDiscount);
  const totalPagar = getTotal(customerDiscountRate, manualDiscount);
  const canCheckout = items.length > 0 && cashShift !== null;

  return (
    <div className="flex flex-col h-full bg-canvas overflow-hidden select-none">
      {/* Turno cerrado: bloqueo explícito, sin animación ansiosa */}
      {cashShift === null && (
        <div className="shrink-0 bg-danger-soft border-b border-danger/30 px-4 h-11 flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-base font-semibold text-danger-ink">
            <Lock className="w-4 h-4 shrink-0" />
            Apertura de caja obligatoria para registrar ventas.
          </span>
          <Button variant="danger" size="sm" onClick={() => setIsCashShiftModalOpen(true)}>
            Abrir turno
          </Button>
        </div>
      )}

      {/* Barra de contexto operativo */}
      <div className="shrink-0 h-9 px-4 bg-sunken border-b border-line flex items-center gap-3 text-body text-ink-2 overflow-x-auto">
        <span className="whitespace-nowrap">
          Operador <strong className="text-ink font-semibold">{user?.name || 'Usuario'}</strong>
        </span>
        <span className="text-ink-3">·</span>
        <span className="flex items-center gap-1.5 whitespace-nowrap">
          Turno
          {cashShift ? (
            <span className="inline-flex items-center gap-1 font-semibold text-ok">
              <Unlock className="w-3 h-3" /> abierto
              <span className="text-ink-2 font-normal">
                (fondo <Money value={cashShift.initialFloat} size="body" />)
              </span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 font-semibold text-danger">
              <Lock className="w-3 h-3" /> cerrado
            </span>
          )}
        </span>
        <span className="text-ink-3">·</span>
        <span className="whitespace-nowrap">
          Cola <strong className="font-mono tnum text-ink">{pendingSyncCount}</strong>
        </span>

        <div className="flex-1" />

        <div className="flex items-center gap-3 shrink-0">
          <span className="flex items-center gap-1.5 whitespace-nowrap"><Kbd keys="F2" /> Buscar</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><Kbd keys="F4" /> Balanza</span>
          <span className="flex items-center gap-1.5 whitespace-nowrap"><Kbd keys={['F8', 'F12']} /> Cobrar</span>
        </div>
      </div>

      {/* 44 / 56 a favor del catálogo */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Ticket ─────────────────────────────────────────────────── */}
        <section className="w-[44%] flex flex-col bg-surface border-r border-line">
          {/* Cliente activo */}
          <div className="shrink-0 h-14 px-3 border-b border-line flex items-center justify-between gap-3">
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center gap-2.5 min-w-0 rounded-md p-1 -m-1 hover:bg-sunken transition-colors duration-fast ease-ease"
            >
              <span className="w-9 h-9 shrink-0 rounded-md bg-accent-soft text-accent-ink flex items-center justify-center">
                <User className="w-4 h-4" />
              </span>
              <span className="min-w-0 text-left">
                <span className="block text-micro uppercase text-ink-3">Cliente</span>
                <span className="flex items-center gap-1.5 min-w-0">
                  <span className="text-base font-semibold text-ink truncate">{selectedCustomer.businessName}</span>
                  {selectedCustomer.group === 'VIP' && <Badge tone="warning">VIP 5%</Badge>}
                </span>
              </span>
            </button>
            <Button variant="secondary" size="sm" onClick={() => setIsCustomerModalOpen(true)}>
              Cambiar
            </Button>
          </div>

          {/* Cabecera del ticket */}
          <div className="shrink-0 h-11 px-3 border-b border-line flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-accent" />
              <h2 className="text-base font-semibold text-ink">Ticket</h2>
              <Badge tone="accent">{items.length} ítems</Badge>
            </div>
            {items.length > 0 && (
              <Button variant="ghost" size="sm" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={clearCart}>
                Vaciar
              </Button>
            )}
          </div>

          {/* Líneas del ticket */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="w-6 h-6" />}
                title="Ticket vacío"
                hint="Escanee un código de barras o toque un producto del catálogo."
              />
            ) : (
              <div className="divide-y divide-line">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      'min-h-16 px-3 py-2.5 flex items-center gap-3 bg-raised',
                      flashId === item.id && 'animate-scan-flash',
                    )}
                  >
                    <div className="flex-1 min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-base font-semibold text-ink">{item.name}</span>
                        {item.is_wholesale_applied && (
                          <Badge tone="success" icon={<Sparkles className="w-3 h-3" />}>Mayorista</Badge>
                        )}
                        {item.unit_type === 'SERIALIZED' && <Badge tone="warning">IMEI</Badge>}
                        {item.unit_type === 'FRACTION' && <Badge tone="accent">Granel</Badge>}
                      </div>

                      <div className="flex items-center gap-2 text-body text-ink-2">
                        <span className="font-mono">{item.sku}</span>
                        <span className="text-ink-3">·</span>
                        <Money value={item.unit_price} size="body" /> c/u
                        {item.is_wholesale_applied && (
                          <span className="text-ink-3 line-through">
                            <Money value={item.retail_price} size="body" />
                          </span>
                        )}
                      </div>

                      {item.serial_number && (
                        <div className="flex items-center gap-1 text-body font-mono text-warn-ink">
                          <ShieldCheck className="w-3 h-3" /> {item.serial_number}
                        </div>
                      )}
                    </div>

                    {/* Controles táctiles de 44px */}
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton
                        label="Restar cantidad"
                        size="touch"
                        onClick={() =>
                          updateQuantity(item.id, Math.max(0.001, item.quantity - (item.unit_type === 'FRACTION' ? 0.1 : 1)))
                        }
                        className="border border-line-strong"
                      >
                        <Minus className="w-4 h-4" />
                      </IconButton>
                      <span className="w-16 text-center font-mono tnum text-base font-semibold text-ink">
                        {item.unit_type === 'FRACTION' ? item.quantity.toFixed(3) : item.quantity}
                      </span>
                      <IconButton
                        label="Sumar cantidad"
                        size="touch"
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + (item.unit_type === 'FRACTION' ? 0.1 : 1))
                        }
                        className="border border-line-strong"
                      >
                        <Plus className="w-4 h-4" />
                      </IconButton>
                    </div>

                    <div className="w-24 text-right shrink-0">
                      <Money value={item.subtotal} size="base" className="text-ink" />
                    </div>

                    <IconButton label="Quitar del ticket" tone="danger" onClick={() => removeItem(item.id)}>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </div>
                ))}
                <div ref={cartEndRef} />
              </div>
            )}
          </div>

          {/* Zona del total: la cifra manda */}
          <div className="shrink-0 bg-sunken border-t border-line">
            <div className="px-4 py-2.5 flex items-center justify-between gap-3 border-b border-line">
              <span className="flex items-center gap-1.5 text-body text-ink-2">
                <Tag className="w-3.5 h-3.5 text-accent" /> Descuento
              </span>
              <div className="flex gap-1">
                {[0, 5, 10, 15, 20].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleApplyManualDiscountClick(d)}
                    className={cn(
                      'h-7 px-2.5 rounded-sm border font-mono tnum text-body font-bold',
                      'transition-colors duration-fast ease-ease',
                      manualDiscount === d
                        ? 'bg-accent text-white border-accent'
                        : 'bg-raised border-line-strong text-ink-2 hover:border-accent hover:text-accent',
                    )}
                  >
                    {d}%{d > 10 ? ' 🔒' : ''}
                  </button>
                ))}
              </div>
            </div>

            <div className="px-4 py-3 space-y-1.5">
              <div className="flex justify-between text-body text-ink-2">
                <span>Subtotal neto</span>
                <Money value={subtotalNeto} size="body" className="text-ink-2" />
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-body text-danger">
                  <span>Descuento ({customerDiscountRate}% grupo + {manualDiscount}% manual)</span>
                  <Money value={-totalDiscount} size="body" />
                </div>
              )}

              {!canApplyDiscount && (
                <p className="text-body text-warn-ink text-right">
                  🔒 Descuentos manuales restringidos para {userRole}
                </p>
              )}

              <div className="flex items-end justify-between gap-3 pt-2 border-t border-line-strong">
                <span className="text-micro uppercase text-ink-2 pb-2">Total a pagar</span>
                <Money value={totalPagar} size="hero" className="text-ink leading-none" />
              </div>
            </div>

            <div className="px-4 pb-4">
              <Button
                variant="success"
                size="pos"
                block
                disabled={!canCheckout}
                onClick={() => setIsCheckoutOpen(true)}
                icon={<CreditCard className="w-5 h-5" />}
              >
                Cobrar
                <Kbd keys={['F8', 'F12']} className="bg-white/20 border-white/25 text-white ml-1" />
              </Button>
            </div>
          </div>
        </section>

        {/* ─── Catálogo ───────────────────────────────────────────────── */}
        <section className="w-[56%] flex flex-col p-4 gap-3 min-w-0">
          <div className="relative shrink-0">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Escanear código de barras o buscar por SKU / nombre…"
              className="w-full h-11 pl-10 pr-14 bg-raised border border-line-strong rounded-md text-base text-ink hover:border-ink-3 focus:border-accent transition-colors duration-fast ease-ease"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2">
              <Kbd keys="F2" />
            </span>
          </div>

          <div className="shrink-0 flex gap-2 overflow-x-auto pb-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'h-9 px-4 rounded-md border text-body font-semibold whitespace-nowrap',
                  'transition-colors duration-fast ease-ease',
                  selectedCategory === cat
                    ? 'bg-accent-soft border-accent/40 text-accent-ink'
                    : 'bg-raised border-line text-ink-2 hover:border-line-strong hover:text-ink',
                )}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto -mr-1 pr-1">
            {filteredCatalog.length === 0 ? (
              <EmptyState
                icon={<Search className="w-6 h-6" />}
                title="Sin coincidencias"
                hint="Revise el término de búsqueda o cambie de categoría."
              />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 content-start">
                {filteredCatalog.map((product) => {
                  const low = product.stock <= product.min_stock;
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleSelectProduct(product)}
                      className={cn(
                        'group text-left min-h-[132px] p-3 flex flex-col gap-2 rounded-lg border bg-raised',
                        'transition-colors duration-fast ease-ease hover:border-accent',
                        /* Stock crítico: borde ámbar, no texto de alarma */
                        low ? 'border-warn/50' : 'border-line',
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-mono text-micro px-1.5 h-5 inline-flex items-center rounded-sm bg-sunken text-ink-3">
                          {product.sku}
                        </span>
                        {product.unit_type === 'SERIALIZED' && (
                          <Badge tone="warning" icon={<QrCode className="w-3 h-3" />}>IMEI</Badge>
                        )}
                        {product.unit_type === 'FRACTION' && (
                          <Badge tone="accent" icon={<Scale className="w-3 h-3" />}>Granel</Badge>
                        )}
                      </div>

                      <p className="flex-1 text-base font-semibold text-ink leading-snug group-hover:text-accent transition-colors duration-fast">
                        {product.name}
                      </p>

                      <p className={cn('text-body', low ? 'text-warn-ink font-semibold' : 'text-ink-3')}>
                        Stock <span className="font-mono tnum">{product.stock}</span>
                        {low && ' · bajo mínimo'}
                      </p>

                      <div className="pt-2 border-t border-line flex items-end justify-between gap-2">
                        <div>
                          <Money value={product.retail_price} size="title" className="text-ink" />
                          {product.wholesale_price < product.retail_price && (
                            <p className="text-body text-ok">
                              May. <Money value={product.wholesale_price} size="body" /> (≥{product.wholesale_min_qty})
                            </p>
                          )}
                        </div>
                        <span className="text-body font-semibold text-ink-3 group-hover:text-accent transition-colors duration-fast">
                          + Agregar
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Modales */}
      <CashShiftModal isOpen={isCashShiftModalOpen} onClose={() => setIsCashShiftModalOpen(false)} />
      <CustomerModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} />

      <SupervisorPinModal
        isOpen={isSupervisorModalOpen}
        targetDiscountPercentage={targetManualDiscount}
        onClose={() => setIsSupervisorModalOpen(false)}
        /* El modal aplica el descuento al validar el PIN. */
        onSuccess={() => undefined}
      />

      <ImeiModal
        isOpen={!!pendingSerializedProduct}
        productName={pendingSerializedProduct?.name || ''}
        onConfirm={(serial) => {
          if (!pendingSerializedProduct) return;
          addItem({ ...pendingSerializedProduct }, 1, serial);
          signalAdded(pendingSerializedProduct.id);
          setPendingSerializedProduct(null);
        }}
        onClose={() => setPendingSerializedProduct(null)}
      />

      <DecimalQuantityModal
        isOpen={!!pendingFractionalProduct}
        productName={pendingFractionalProduct?.name || ''}
        unitPrice={pendingFractionalProduct?.retail_price || 0}
        onConfirm={(qty) => {
          if (!pendingFractionalProduct) return;
          addItem({ ...pendingFractionalProduct }, qty);
          signalAdded(pendingFractionalProduct.id);
          setPendingFractionalProduct(null);
        }}
        onClose={() => setPendingFractionalProduct(null)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => searchInputRef.current?.focus()}
      />
    </div>
  );
};
