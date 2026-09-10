import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CreditCard,
  Lock,
  Minus,
  Plus,
  QrCode,
  Scale,
  Search,
  Camera,
  ShieldAlert,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
  Unlock,
  User,
} from 'lucide-react';
import { useCartStore, lineKey } from '../store/useCartStore';
import { useStoredImage } from '../store/imageStore';
import { useCatalogStore, type Product } from '../store/useCatalogStore';
import { usePosStore } from '../store/usePosStore';
import { useAuthStore } from '../store/useAuthStore';
import { useBarcodeScanner } from '../hooks/useBarcodeScanner';
import { useCameraScanner } from '../hooks/useCameraScanner';
import { hasPermission } from '../utils/permissions';
import { ImeiModal } from './ImeiModal';
import { DecimalQuantityModal } from './DecimalQuantityModal';
import { CheckoutModal } from './CheckoutModal';
import { CashShiftModal } from './CashShiftModal';
import { CustomerModal } from './CustomerModal';
import { SupervisorPinModal } from './SupervisorPinModal';
import { Badge, Button, EmptyState, IconButton, Kbd, Money, cn, useToast } from '../ui';

/* Las categorías se derivan del propio catálogo: la lista fija que había antes
   incluía «Bebidas» y «Lácteos», que ningún producto del POS usaba, y omitía las
   que sí existían en la vista de productos. */

/* La imagen vive en IndexedDB y resolverla es asíncrono: hace falta un
   componente propio para poder usar el hook dentro de la rejilla. */
const ProductThumb: React.FC<{ src: string }> = ({ src }) => {
  const resolved = useStoredImage(src);
  return <img src={resolved ?? undefined} alt="" className="w-full h-full object-cover" />;
};

export const PosView: React.FC = () => {
  const { user } = useAuthStore();
  const userRole = user?.role || 'ADMIN';
  const canAccessPos = hasPermission(userRole, 'can_access_pos');
  const canApplyDiscount = hasPermission(userRole, 'can_apply_discount');

  const toast = useToast();
  const { cashShift, selectedCustomer, manualDiscount, pendingSyncCount, setManualDiscount } =
    usePosStore();

  /* Catálogo compartido: el mismo que edita la vista de Productos. Antes cada
     una tenía el suyo, con nombres y precios distintos para el mismo artículo. */
  const products = useCatalogStore((state) => state.products);
  const sellable = useMemo(() => products.filter((p) => p.is_active), [products]);
  const CATEGORIES = useMemo(
    () =>
      ['TODOS', ...new Set(sellable.map((p) => p.category))].sort((a, b) =>
        a === 'TODOS' ? -1 : b === 'TODOS' ? 1 : a.localeCompare(b, 'es'),
      ),
    [sellable],
  );
  const {
    items,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getSubtotal,
    getTotal,
    getDiscountAmount,
  } = useCartStore();

  const [selectedCategory, setSelectedCategory] = useState('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  /* Retroalimentación periférica: la última fila añadida destella 420ms.
     El cajero confirma el escaneo sin apartar la vista del producto. */
  const [flashId, setFlashId] = useState<number | null>(null);
  const cartEndRef = useRef<HTMLDivElement>(null);

  const [shiftModalDismissed, setShiftModalDismissed] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [targetManualDiscount, setTargetManualDiscount] = useState(0);
  const [pendingSerializedProduct, setPendingSerializedProduct] = useState<Product | null>(null);
  const [pendingFractionalProduct, setPendingFractionalProduct] = useState<Product | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  /* Sin turno abierto la terminal no vende: el modal se deriva del estado en
 lugar de forzarse con un efecto, que causaría un render en cascada. */
  const isCashShiftModalOpen = cashShift === null && !shiftModalDismissed;

  const signalAdded = (id: number) => {
    setFlashId(id);
    window.setTimeout(() => setFlashId((c) => (c === id ? null : c)), 460);
    window.requestAnimationFrame(() =>
      cartEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }),
    );
  };

  const handleSelectProduct = (product: Product) => {
    if (cashShift === null) {
      /* Sin turno no se vende. Se vuelve a abrir el arqueo y se dice por qué:
         antes el clic no hacía nada visible más que reaparecer el modal. */
      toast('Abra el turno de caja antes de cobrar.', 'warning');
      setShiftModalDismissed(false);
      return;
    }

    /* Sin existencias no se vende. Antes se podía añadir al ticket un producto
       agotado, y la venta lo dejaba en negativo sin que nadie se enterara hasta
       el siguiente conteo. */
    const yaEnTicket = items
      .filter((i) => i.id === product.id)
      .reduce((sum, i) => sum + i.quantity, 0);
    if (product.stock - yaEnTicket <= 0) {
      toast(
        product.stock <= 0
          ? `«${product.name}» está agotado`
          : `Solo quedan ${product.stock} de «${product.name}», ya en el ticket`,
        'warning',
      );
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

  /* Un solo camino de escaneo para los dos lectores: la pistola USB de la
     terminal fija y la cámara de una tablet de mostrador. */
  const handleScannedCode = (barcode: string) => {
    const matched = sellable.find(
      (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase(),
    );
    if (matched) {
      handleSelectProduct(matched);
      setSearchQuery('');
    }
  };

  useBarcodeScanner(handleScannedCode);
  const {
    supported: cameraSupported,
    scanning: cameraScanning,
    error: cameraError,
    videoRef: cameraVideoRef,
    start: startCamera,
    stop: stopCamera,
  } = useCameraScanner(handleScannedCode);

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
  const filteredCatalog = sellable.filter(
    (p) =>
      (selectedCategory === 'TODOS' || p.category === selectedCategory) &&
      (p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        p.barcode.includes(searchQuery)),
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
          <Button variant="danger" size="sm" onClick={() => setShiftModalDismissed(false)}>
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
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Kbd keys="F2" /> Buscar
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Kbd keys="F4" /> Balanza
          </span>
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Kbd keys={['F8', 'F12']} /> Cobrar
          </span>
        </div>
      </div>

      {/* 44 / 56 a favor del catálogo */}
      {/* Bajo 1280px la división lado a lado deja columnas de ~240px:
          por debajo de ese ancho el ticket y el catálogo se apilan. */}
      <div className="flex-1 flex flex-col xl:flex-row overflow-y-auto xl:overflow-hidden">
        {/* ─── Ticket ─────────────────────────────────────────────────── */}
        <section className="w-full xl:w-[44%] shrink-0 flex flex-col bg-surface border-b xl:border-b-0 xl:border-r border-line">
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
                  <span className="text-base font-semibold text-ink truncate">
                    {selectedCustomer.businessName}
                  </span>
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
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={clearCart}
              >
                Vaciar
              </Button>
            )}
          </div>

          {/* Líneas del ticket */}
          <div className="flex-1 min-h-[180px] xl:min-h-0 overflow-y-auto">
            {items.length === 0 ? (
              <EmptyState
                icon={<ShoppingBag className="w-6 h-6" />}
                title="Ticket vacío"
                hint="Escanee un código de barras o toque un producto del catálogo."
              />
            ) : (
              <div className="divide-y divide-line">
                {items.map((item) => {
                  /* Un producto serializado genera una línea por número de
                     serie, todas con el mismo `id`: la identidad de la línea es
                     el par id + serie, igual que en el store. Antes los
                     controles pasaban solo el `id` y actuaban sobre todas sus
                     líneas a la vez. */
                  const key = lineKey(item.id, item.serial_number);
                  return (
                    <div
                      key={key}
                      className={cn(
                        'min-h-16 px-3 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 bg-raised',
                        flashId === item.id && 'animate-scan-flash',
                      )}
                    >
                      <div className="flex-1 min-w-[160px] space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-base font-semibold text-ink">{item.name}</span>
                          {item.is_wholesale_applied && (
                            <Badge tone="success" icon={<Sparkles className="w-3 h-3" />}>
                              Mayorista
                            </Badge>
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
                            updateQuantity(
                              key,
                              Math.max(
                                0.001,
                                item.quantity - (item.unit_type === 'FRACTION' ? 0.1 : 1),
                              ),
                            )
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
                            updateQuantity(
                              key,
                              item.quantity + (item.unit_type === 'FRACTION' ? 0.1 : 1),
                            )
                          }
                          className="border border-line-strong"
                        >
                          <Plus className="w-4 h-4" />
                        </IconButton>
                      </div>

                      <div className="w-24 text-right shrink-0">
                        <Money value={item.subtotal} size="base" className="text-ink" />
                      </div>

                      <IconButton
                        label="Quitar del ticket"
                        tone="danger"
                        onClick={() => removeItem(key)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </IconButton>
                    </div>
                  );
                })}
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
                  <span>
                    Descuento ({customerDiscountRate}% grupo + {manualDiscount}% manual)
                  </span>
                  <Money value={-totalDiscount} size="body" />
                </div>
              )}

              {!canApplyDiscount && (
                <p className="text-body text-warn-ink text-right">
                  🔒 Descuentos manuales restringidos para {userRole}
                </p>
              )}

              <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1 pt-2 border-t border-line-strong">
                <span className="text-micro uppercase text-ink-2 pb-2">Total a pagar</span>
                <Money
                  value={totalPagar}
                  size="hero"
                  className="text-ink leading-none text-[clamp(2rem,7vw,3.5rem)]"
                />
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
        <section className="w-full xl:w-[56%] flex flex-col p-4 gap-3 min-w-0">
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

          {cameraSupported && (
            <div className="shrink-0 space-y-2">
              <Button
                variant={cameraScanning ? 'danger' : 'secondary'}
                block
                icon={<Camera className="w-4 h-4" />}
                onClick={() => (cameraScanning ? stopCamera() : startCamera())}
              >
                {cameraScanning ? 'Detener cámara' : 'Escanear con la cámara'}
              </Button>

              {cameraError && <p className="text-body text-danger">{cameraError}</p>}

              <video
                ref={cameraVideoRef}
                className={cn(
                  'w-full rounded-md border border-line bg-black',
                  cameraScanning ? 'block max-h-48 object-cover' : 'hidden',
                )}
                muted
                playsInline
              />
            </div>
          )}

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

          <div className="flex-1 min-h-[320px] xl:min-h-0 overflow-y-auto -mr-1 pr-1">
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
                          <Badge tone="warning" icon={<QrCode className="w-3 h-3" />}>
                            IMEI
                          </Badge>
                        )}
                        {product.unit_type === 'FRACTION' && (
                          <Badge tone="accent" icon={<Scale className="w-3 h-3" />}>
                            Granel
                          </Badge>
                        )}
                      </div>

                      <div className="flex-1 flex items-start gap-2.5 min-w-0">
                        {product.image_url && (
                          <span className="w-10 h-10 shrink-0 rounded-md bg-sunken border border-line overflow-hidden">
                            <ProductThumb src={product.image_url} />
                          </span>
                        )}
                        <p className="flex-1 text-base font-semibold text-ink leading-snug group-hover:text-accent transition-colors duration-fast">
                          {product.name}
                        </p>
                      </div>

                      <p
                        className={cn(
                          'text-body',
                          low ? 'text-warn-ink font-semibold' : 'text-ink-3',
                        )}
                      >
                        Stock <span className="font-mono tnum">{product.stock}</span>
                        {low && ' · bajo mínimo'}
                      </p>

                      <div className="pt-2 border-t border-line flex items-end justify-between gap-2">
                        <div>
                          <Money value={product.sale_price} size="title" className="text-ink" />
                          {product.wholesale_price < product.sale_price && (
                            <p className="text-body text-ok">
                              May. <Money value={product.wholesale_price} size="body" /> (≥
                              {product.wholesale_min_qty})
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
      <CashShiftModal isOpen={isCashShiftModalOpen} onClose={() => setShiftModalDismissed(true)} />
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
        productId={pendingSerializedProduct?.id ?? 0}
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
        unitPrice={pendingFractionalProduct?.sale_price || 0}
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
