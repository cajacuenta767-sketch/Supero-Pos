import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingBag, Trash2, Plus, Minus, CreditCard,
  ShieldCheck, Scale, QrCode, ShieldAlert, User, Tag,
  Lock, Unlock, Sparkles
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
  category: string;
}

const MASTER_POS_CATALOG: ProductItem[] = [
  { id: 101, sku: 'ELE-S23-001', barcode: '7750123456789', name: 'Smartphone Galaxy S23 Ultra (128GB)', unit_type: 'SERIALIZED', retail_price: 850.00, wholesale_price: 800.00, wholesale_min_qty: 3, stock: 12, category: 'Electrónica' },
  { id: 102, sku: 'AB-QSO-002', barcode: '7759876543210', name: 'Queso Criollo (a granel / kg)', unit_type: 'FRACTION', retail_price: 45.00, wholesale_price: 40.00, wholesale_min_qty: 5, stock: 45.5, category: 'Abarrotes' },
  { id: 103, sku: 'ELE-AUD-003', barcode: '7751112223334', name: 'Audífonos Bluetooth Wireless Pro', unit_type: 'UNIT', retail_price: 35.00, wholesale_price: 28.00, wholesale_min_qty: 6, stock: 30, category: 'Electrónica' },
  { id: 104, sku: 'AB-CAR-004', barcode: '7754445556667', name: 'Carne Lomo Fino (a granel / kg)', unit_type: 'FRACTION', retail_price: 68.00, wholesale_price: 62.00, wholesale_min_qty: 4, stock: 25.0, category: 'Abarrotes' },
  { id: 105, sku: 'ELE-TAB-005', barcode: '7757778889990', name: 'Tablet Pro 11" 256GB WiFi', unit_type: 'SERIALIZED', retail_price: 620.00, wholesale_price: 580.00, wholesale_min_qty: 2, stock: 8, category: 'Electrónica' },
  { id: 106, sku: 'AB-LAC-006', barcode: '7753332221110', name: 'Leche Entera 1 Litro (Caja)', unit_type: 'UNIT', retail_price: 8.50, wholesale_price: 7.50, wholesale_min_qty: 12, stock: 120, category: 'Abarrotes' },
];

export const PosView: React.FC = () => {
  const { user } = useAuthStore();
  const userRole = user?.role || 'ADMIN';
  const canAccessPos = hasPermission(userRole, 'can_access_pos');
  const canApplyDiscount = hasPermission(userRole, 'can_apply_discount');

  const { cashShift, selectedCustomer, manualDiscount, pendingSyncCount, setManualDiscount } = usePosStore();
  const { items, addItem, removeItem, updateQuantity, clearCart, getSubtotal, getTotal, getDiscountAmount } = useCartStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('TODOS');
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Modal States
  const [isCashShiftModalOpen, setIsCashShiftModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [targetManualDiscount, setTargetManualDiscount] = useState<number>(0);

  const [pendingSerializedProduct, setPendingSerializedProduct] = useState<ProductItem | null>(null);
  const [pendingFractionalProduct, setPendingFractionalProduct] = useState<ProductItem | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Check Cash Shift on Load: If shift is null, display mandatory shift opening modal
  useEffect(() => {
    if (cashShift === null) {
      setIsCashShiftModalOpen(true);
    }
  }, [cashShift]);

  // Native Laser Barcode Scanner Integration (<10ms matching)
  useBarcodeScanner((barcode) => {
    const matched = MASTER_POS_CATALOG.find(
      (p) => p.barcode === barcode || p.sku.toLowerCase() === barcode.toLowerCase()
    );
    if (matched) {
      handleSelectProduct(matched);
      setSearchQuery('');
    }
  });

  // Keyboard Shortcuts (F2: Search focus, F8/F12: Pay / Checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F8' || e.key === 'F12') {
        e.preventDefault();
        if (items.length > 0 && cashShift !== null) {
          setIsCheckoutOpen(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, cashShift]);

  if (!canAccessPos) {
    return (
      <div className="h-[calc(100vh-56px)] flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-[#000000] text-center">
        <ShieldAlert className="w-16 h-16 text-rose-500 mb-4 animate-bounce" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Acceso Restringido al Punto de Venta (POS)</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-2">
          Su rol actual (<strong className="text-blue-500 font-mono">{userRole}</strong>) no tiene permisos asignados para operar la terminal de ventas POS.
        </p>
      </div>
    );
  }

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
      addItem({
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        unit_type: product.unit_type,
        retail_price: product.retail_price,
        wholesale_price: product.wholesale_price,
        wholesale_min_qty: product.wholesale_min_qty,
      }, 1);
    }
  };

  const handleApplyManualDiscountClick = (desiredDiscount: number) => {
    if (desiredDiscount > 10) {
      setTargetManualDiscount(desiredDiscount);
      setIsSupervisorModalOpen(true);
    } else {
      setManualDiscount(desiredDiscount);
    }
  };

  const categories = ['TODOS', 'Abarrotes', 'Electrónica', 'Bebidas', 'Lácteos'];
  const filteredCatalog = MASTER_POS_CATALOG.filter((p) => {
    const matchesCategory = selectedCategory === 'TODOS' || p.category === selectedCategory;
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  const customerDiscountRate = selectedCustomer?.discountPercentage || 0;
  const subtotalNeto = getSubtotal();
  const totalDiscount = getDiscountAmount(customerDiscountRate, manualDiscount);
  const totalPagar = getTotal(customerDiscountRate, manualDiscount);

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-56px)] bg-gray-100 dark:bg-[#000000] overflow-hidden select-none transition-colors duration-200">
      {/* Shift Mandatory Warning Banner if Closed */}
      {cashShift === null && (
        <div className="bg-rose-600 text-white px-4 py-2 flex items-center justify-between text-xs font-bold shadow-md">
          <div className="flex items-center space-x-2">
            <Lock className="w-4 h-4 animate-spin" />
            <span>APERTURA DE CAJA OBLIGATORIA: Inicie su turno para registrar ventas en la terminal POS.</span>
          </div>
          <button
            onClick={() => setIsCashShiftModalOpen(true)}
            className="px-3 py-1 bg-white text-rose-700 hover:bg-rose-50 rounded-lg text-xs font-black uppercase shadow"
          >
            Abrir Turno Ahora
          </button>
        </div>
      )}

      {/* Top POS Operational Shortcuts & Sync Queue Bar */}
      <div className="bg-[#121212] px-4 py-2 border-b border-gray-800 flex items-center justify-between text-xs font-mono font-bold text-gray-300">
        <div className="flex items-center space-x-4">
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /> ONLINE (Sincronizado)
          </span>
          <span className="text-gray-500">•</span>
          <span>Operador: <strong className="text-white font-sans">{user?.name || 'Juan Pérez'}</strong> ({userRole})</span>
          <span className="text-gray-500">•</span>
          <span>
            Shift: {cashShift ? (
              <span className="text-emerald-400 font-semibold inline-flex items-center gap-1">
                <Unlock className="w-3 h-3" /> ABIERTO (Fondo: ${cashShift.initialFloat.toFixed(2)})
              </span>
            ) : (
              <span className="text-rose-400 font-semibold inline-flex items-center gap-1">
                <Lock className="w-3 h-3" /> CERRADO
              </span>
            )}
          </span>
          <span className="text-gray-500">•</span>
          <span className="text-blue-400">Cola: <strong className="text-white font-bold">{pendingSyncCount}</strong></span>
        </div>

        {/* Shortcuts pills */}
        <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 rounded bg-gray-800 text-blue-400 border border-gray-700">[F2] Buscar</span>
          <span className="px-2 py-0.5 rounded bg-gray-800 text-purple-400 border border-gray-700">[F4] Balanza</span>
          <span className="px-2 py-0.5 rounded bg-gray-800 text-emerald-400 border border-gray-700">[F8/F12] Cobrar</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL: Shopping Cart, Customer Selection & Totals */}
        <div className="w-1/2 flex flex-col bg-white dark:bg-[#0B0C10] border-r border-gray-200 dark:border-[#1F2833]">
          {/* Active Customer & Discount Selector Bar */}
          <div className="p-3 bg-gray-50 dark:bg-[#121212] border-b border-gray-200 dark:border-[#1F2833] flex items-center justify-between">
            <div
              onClick={() => setIsCustomerModalOpen(true)}
              className="flex items-center space-x-2 cursor-pointer group hover:opacity-80 transition-opacity"
            >
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                <User className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-semibold">Cliente Asignado:</div>
                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <span>{selectedCustomer.businessName}</span>
                  <span className="text-[10px] text-gray-500 font-mono">(NIT: {selectedCustomer.taxId})</span>
                  {selectedCustomer.group === 'VIP' && (
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-400 text-black">VIP 5%</span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Customer Switch Button */}
            <button
              onClick={() => setIsCustomerModalOpen(true)}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Cambiar Cliente
            </button>
          </div>

          {/* Cart Header */}
          <div className="p-3 border-b border-gray-200 dark:border-[#1F2833] flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <h2 className="font-bold text-gray-900 dark:text-white text-base">Carrito de Ventas</h2>
              <span className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 px-2 py-0.5 rounded-full font-bold">
                {items.length} ítems
              </span>
            </div>
            {items.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium flex items-center"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Vaciar Ticket
              </button>
            )}
          </div>

          {/* Cart Items Table */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 dark:text-gray-600 space-y-2">
                <ShoppingBag className="w-12 h-12 stroke-[1.5]" />
                <p className="text-sm font-medium">El carrito está vacío</p>
                <p className="text-xs">Escanee un código de barras láser o seleccione un producto del catálogo</p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="p-3 bg-gray-50 dark:bg-[#121212] rounded-xl border border-gray-200 dark:border-[#1F2833] flex items-center justify-between hover:border-blue-500 transition-colors"
                >
                  <div className="flex-1 pr-3">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-gray-900 dark:text-white">{item.name}</span>
                      {item.is_wholesale_applied && (
                        <span className="px-1.5 py-0.5 text-[9px] font-black rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3 text-emerald-500" /> ¡Mayorista!
                        </span>
                      )}
                      {item.unit_type === 'SERIALIZED' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          IMEI
                        </span>
                      )}
                      {item.unit_type === 'FRACTION' && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
                          Granel
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 space-x-2 mt-0.5">
                      <span>SKU: {item.sku}</span>
                      <span>•</span>
                      <span>${item.unit_price.toFixed(2)} c/u</span>
                      {item.is_wholesale_applied && (
                        <span className="text-[10px] text-emerald-500 line-through">
                          (${item.retail_price.toFixed(2)})
                        </span>
                      )}
                    </div>

                    {item.serial_number && (
                      <div className="text-[11px] font-mono text-amber-600 dark:text-amber-400 mt-1 flex items-center">
                        <ShieldCheck className="w-3 h-3 mr-1" /> IMEI: {item.serial_number}
                      </div>
                    )}
                  </div>

                  {/* Quantity Controls & Subtotal */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center bg-white dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-lg">
                      <button
                        onClick={() =>
                          updateQuantity(item.id, Math.max(0.001, item.quantity - (item.unit_type === 'FRACTION' ? 0.1 : 1)))
                        }
                        className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-l-lg"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-2 text-xs font-mono font-bold text-gray-900 dark:text-white">
                        {item.unit_type === 'FRACTION' ? item.quantity.toFixed(3) : item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.quantity + (item.unit_type === 'FRACTION' ? 0.1 : 1))
                        }
                        className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-r-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right w-20">
                      <span className="block font-mono font-bold text-sm text-gray-900 dark:text-white">
                        ${item.subtotal.toFixed(2)}
                      </span>
                    </div>

                    <button onClick={() => removeItem(item.id)} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Totals & Manual Discount Toolbar */}
          <div className="p-4 bg-gray-50 dark:bg-[#121212] border-t border-gray-200 dark:border-[#1F2833] space-y-3">
            {/* Quick Manual Discount Selector */}
            <div className="flex items-center justify-between text-xs border-b border-gray-200 dark:border-gray-800 pb-2">
              <span className="text-gray-600 dark:text-gray-400 font-semibold flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-blue-500" /> Descuento Manual Rápidos:
              </span>
              <div className="flex space-x-1.5">
                {[0, 5, 10, 15, 20].map((d) => (
                  <button
                    key={d}
                    onClick={() => handleApplyManualDiscountClick(d)}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold border transition-colors ${
                      manualDiscount === d
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-[#0B0C10] border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50'
                    }`}
                  >
                    {d}% {d > 10 ? '🔒' : ''}
                  </button>
                ))}
              </div>
            </div>

            {/* Totals Display */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-600 dark:text-gray-400">
                <span>Subtotal Neto:</span>
                <span className="font-mono">${subtotalNeto.toFixed(2)}</span>
              </div>

              {totalDiscount > 0 && (
                <div className="flex justify-between text-red-500 font-medium text-xs">
                  <span>
                    Descuento Aplicado ({customerDiscountRate}% Grupo + {manualDiscount}% Manual):
                  </span>
                  <span className="font-mono">-${totalDiscount.toFixed(2)}</span>
                </div>
              )}

              {!canApplyDiscount && (
                <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1 justify-end">
                  <span>🔒 Descuentos manuales restringidos para {userRole} (Requiere Supervisor/Admin)</span>
                </div>
              )}

              <div className="flex justify-between text-2xl font-black text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-800">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono text-3xl text-emerald-500 dark:text-emerald-400">${totalPagar.toFixed(2)}</span>
              </div>
            </div>

            {/* High Impact Full Width Checkout Button (F8/F12) */}
            <button
              disabled={items.length === 0 || cashShift === null}
              onClick={() => setIsCheckoutOpen(true)}
              className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-black text-lg shadow-lg shadow-emerald-500/20 flex items-center justify-center space-x-2 transition-transform active:scale-[0.99]"
            >
              <CreditCard className="w-6 h-6" />
              <span>COBRAR / LIQUIDAR (F8 / F12)</span>
            </button>
          </div>
        </div>

        {/* RIGHT PANEL: Smart Scanner & Touch Grid Catalog */}
        <div className="w-1/2 flex flex-col p-4 space-y-4">
          {/* Search Bar Input (F2) */}
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="[F2] Escanear código de barras o buscar por SKU/Nombre..."
              className="w-full p-3 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-xl text-xs font-semibold text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>

          {/* Category Filters */}
          <div className="flex space-x-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-white dark:bg-[#121212] text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-[#1F2833] hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Touch Grid Tiles */}
          <div className="grid grid-cols-2 gap-3 overflow-y-auto flex-1 pr-1">
            {filteredCatalog.map((product) => (
              <div
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="p-4 bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-xl hover:border-blue-500 hover:shadow-lg transition-all cursor-pointer flex flex-col justify-between group active:scale-95"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                      {product.sku}
                    </span>

                    {product.unit_type === 'SERIALIZED' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 flex items-center">
                        <QrCode className="w-3 h-3 mr-0.5" /> IMEI
                      </span>
                    )}

                    {product.unit_type === 'FRACTION' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 flex items-center">
                        <Scale className="w-3 h-3 mr-0.5" /> Granel
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm text-gray-900 dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {product.name}
                  </h3>

                  <div className="text-[11px] text-gray-400 mt-1">Stock: {product.stock} dispon.</div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-gray-100 dark:border-gray-800 pt-2">
                  <div>
                    <span className="font-bold font-mono text-lg text-blue-600 dark:text-blue-400">
                      ${product.retail_price.toFixed(2)}
                    </span>
                    {product.wholesale_price < product.retail_price && (
                      <div className="text-[10px] text-emerald-500 font-semibold">
                        May: ${product.wholesale_price.toFixed(2)} (≥{product.wholesale_min_qty})
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-bold text-gray-400 group-hover:text-blue-500 transition-colors">
                    + Agregar
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CashShiftModal isOpen={isCashShiftModalOpen} onClose={() => setIsCashShiftModalOpen(false)} />
      <CustomerModal isOpen={isCustomerModalOpen} onClose={() => setIsCustomerModalOpen(false)} />

      <SupervisorPinModal
        isOpen={isSupervisorModalOpen}
        targetDiscountPercentage={targetManualDiscount}
        onClose={() => setIsSupervisorModalOpen(false)}
        onSuccess={() => {
          console.log(`Descuento del ${targetManualDiscount}% autorizado por supervisor.`);
        }}
      />

      <ImeiModal
        isOpen={!!pendingSerializedProduct}
        productName={pendingSerializedProduct?.name || ''}
        onConfirm={(serial) => {
          if (pendingSerializedProduct) {
            addItem({
              id: pendingSerializedProduct.id,
              sku: pendingSerializedProduct.sku,
              barcode: pendingSerializedProduct.barcode,
              name: pendingSerializedProduct.name,
              unit_type: pendingSerializedProduct.unit_type,
              retail_price: pendingSerializedProduct.retail_price,
              wholesale_price: pendingSerializedProduct.wholesale_price,
              wholesale_min_qty: pendingSerializedProduct.wholesale_min_qty,
            }, 1, serial);
            setPendingSerializedProduct(null);
          }
        }}
        onClose={() => setPendingSerializedProduct(null)}
      />

      <DecimalQuantityModal
        isOpen={!!pendingFractionalProduct}
        productName={pendingFractionalProduct?.name || ''}
        unitPrice={pendingFractionalProduct?.retail_price || 0}
        onConfirm={(qty) => {
          if (pendingFractionalProduct) {
            addItem({
              id: pendingFractionalProduct.id,
              sku: pendingFractionalProduct.sku,
              barcode: pendingFractionalProduct.barcode,
              name: pendingFractionalProduct.name,
              unit_type: pendingFractionalProduct.unit_type,
              retail_price: pendingFractionalProduct.retail_price,
              wholesale_price: pendingFractionalProduct.wholesale_price,
              wholesale_min_qty: pendingFractionalProduct.wholesale_min_qty,
            }, qty);
            setPendingFractionalProduct(null);
          }
        }}
        onClose={() => setPendingFractionalProduct(null)}
      />

      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onSuccess={() => {
          searchInputRef.current?.focus();
        }}
      />
    </div>
  );
};
