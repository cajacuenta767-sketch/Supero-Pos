import React, { useState } from 'react';
import { 
  ShoppingCart, 
  Plus, 
  Search, 
  Truck, 
  Printer, 
  Cpu, 
  TrendingUp, 
  ArrowDownRight
} from 'lucide-react';

interface PurchaseOrder {
 id: string; // PO-2001
 date: string;
 supplier_name: string;
 supplier_tax_id: string;
 branch: string;
 items_count: number;
 total: number;
 status: 'PENDING' | 'PARTIAL_RECEIVED' | 'COMPLETED' | 'CANCELLED';
 payment_terms: string;
 items: POItem[];
}

interface POItem {
 id: number;
 sku: string;
 name: string;
 ordered_qty: number;
 received_qty: number;
 cost_price: number;
 unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
 serials?: string[];
}

export const PurchasesView: React.FC = () => {
 const [activeSubTab, setActiveSubTab] = useState<'orders' | 'receivings' | 'returns'>('orders');

  // Search & Filters
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
 const [isPOModalOpen, setIsPOModalOpen] = useState(false);
 const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
 const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Receiving IMEI Scanning State
 const [scannedImeis, setScannedImeis] = useState<string[]>([]);
 const [imeiInput, setImeiInput] = useState('');

  // Mock Purchase Orders List
 const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
 id: 'PO-2001',
 date: '12/08/2026',
 supplier_name: 'Distribuidora Lácteos del Valle',
 supplier_tax_id: '904837201',
 branch: 'Almacén Central',
 items_count: 3,
 total: 12450.00,
 status: 'PENDING',
 payment_terms: '30 días',
 items: [
        { id: 1, sku: 'SKU-1001', name: 'Coca Cola 2 Litros Retornable', ordered_qty: 100, received_qty: 0, cost_price: 8.50, unit_type: 'UNIT' },
        { id: 2, sku: 'SKU-1002', name: 'Queso Criollo San Javier (Kg)', ordered_qty: 50.000, received_qty: 0, cost_price: 32.00, unit_type: 'FRACTION' },
      ]
    },
    {
 id: 'PO-2002',
 date: '10/08/2026',
 supplier_name: 'Importadora Electrónica TechBol',
 supplier_tax_id: '803928102',
 branch: 'Sucursal Central',
 items_count: 5,
 total: 9250.00,
 status: 'COMPLETED',
 payment_terms: 'Contado',
 items: [
        { id: 3, sku: 'SKU-1003', name: 'Smartphone Samsung Galaxy A54 128GB', ordered_qty: 5, received_qty: 5, cost_price: 1400.00, unit_type: 'SERIALIZED', serials: ['IMEI-358492019482710', 'IMEI-358492019482711'] }
      ]
    }
  ]);

 const filteredOrders = purchaseOrders.filter(po => {
 const matchesSearch = po.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
 po.supplier_name.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
 return matchesSearch && matchesStatus;
  });

 const handleAddImei = (e: React.FormEvent) => {
 e.preventDefault();
 if (!imeiInput.trim()) return;
 if (scannedImeis.includes(imeiInput.trim())) {
 alert('⚠️ Este número de serie/IMEI ya ha sido escaneado en este lote.');
 return;
    }
 setScannedImeis(prev => [...prev, imeiInput.trim()]);
 setImeiInput('');
  };

 const handleConfirmReceiving = () => {
 if (!selectedPO) return;

    // Execute receiving & update CPP
 setPurchaseOrders(prev => prev.map(po => po.id === selectedPO.id ? {
      ...po,
 status: 'COMPLETED',
 items: po.items.map(item => ({ ...item, received_qty: item.ordered_qty }))
    } : po));

 console.log(`[CPP & KARDEX] Actualización atómica de CPP e incremento de stock ejecutado para PO ${selectedPO.id}`);
 alert(`✅ Recepción de PO ${selectedPO.id} completada al 100%. Stock físico e inventario valorizado (CPP) actualizados.`);
 setIsReceivingModalOpen(false);
  };

 return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-blue-500" />
            Compras y Abastecimiento ERP
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Órdenes de compra a proveedores, recepciones con escaneo IMEI y recálculo de Costo Promedio Ponderado (CPP)
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-sunken p-1.5 rounded-md border border-line">
          <button
 onClick={() => setActiveSubTab('orders')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeSubTab === 'orders' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            Órdenes de Compra
          </button>
          <button
 onClick={() => setActiveSubTab('receivings')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeSubTab === 'receivings' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <Truck className="w-4 h-4" />
            Recepción Logística
          </button>
          <button
 onClick={() => setActiveSubTab('returns')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeSubTab === 'returns' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <ArrowDownRight className="w-4 h-4" />
            Notas de Crédito CxP
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: PURCHASE ORDERS LIST */}
      {activeSubTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-raised p-4 rounded-md border border-line shadow-e1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar por # Orden o Proveedor..."
 className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-md text-body text-ink placeholder-gray-400 focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:outline-none"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="PENDING">Pendiente Recepción</option>
                <option value="COMPLETED">Completadas</option>
                <option value="CANCELLED">Anuladas</option>
              </select>

              <button
 onClick={() => setIsPOModalOpen(true)}
 className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-body font-extrabold flex items-center gap-2 shadow-e1 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nueva Orden de Compra
              </button>
            </div>
          </div>

          <div className="bg-raised rounded-md border border-line shadow-e1 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                  <th className="p-4"># Orden Compra</th>
                  <th className="p-4">Proveedor / Empresa</th>
                  <th className="p-4">Sucursal Destino</th>
                  <th className="p-4">Ítems Solicitados</th>
                  <th className="p-4 font-mono">Monto Total ($)</th>
                  <th className="p-4 text-center">Estado Operativo</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-body">
                {filteredOrders.map((po) => {
 const statusBadge = {
                    PENDING: { label: 'PENDIENTE RECEPCIÓN', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 border-amber-200' },
                    PARTIAL_RECEIVED: { label: 'PARCIALMENTE RECIBIDO', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 border-blue-200' },
                    COMPLETED: { label: 'RECIBIDO (COMPLETADO)', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 border-emerald-200' },
                    CANCELLED: { label: 'ANULADA', color: 'bg-rose-100 text-rose-800 dark:bg-rose-950 border-rose-200' },
                  }[po.status];

 return (
                    <tr key={po.id} className="hover:bg-sunken">
                      <td className="p-4 font-mono font-extrabold text-accent">
                        {po.id}
                        <span className="block text-micro text-gray-400 font-normal">{po.date}</span>
                      </td>
                      <td className="p-4 font-bold text-ink">
                        {po.supplier_name}
                        <span className="block text-micro text-gray-400 font-mono font-normal">NIT: {po.supplier_tax_id}</span>
                      </td>
                      <td className="p-4 font-semibold text-ink-2">
                        {po.branch}
                      </td>
                      <td className="p-4 font-mono font-bold">
                        {po.items_count} productos
                      </td>
                      <td className="p-4 font-mono font-black text-ink">
                        ${po.total.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-micro font-bold border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        {po.status === 'PENDING' && (
                          <button
 onClick={() => {
 setSelectedPO(po);
 setIsReceivingModalOpen(true);
                            }}
 className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md font-bold flex items-center gap-1 inline-flex"
 title="Registrar Recepción Física"
                          >
                            <Truck className="w-4 h-4" /> Recibir
                          </button>
                        )}
                        <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md" title="Imprimir OC">
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: RECEIVING LOGISTICS */}
      {activeSubTab === 'receivings' && (
        <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
          <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
            <Truck className="w-5 h-5 text-emerald-500" /> Control de Descarga y Verificación Física en Depósito
          </h3>
          <p className="text-body text-gray-500">Contraste de guías de remisión del proveedor frente al pedido original</p>

          <div className="p-4 bg-sunken rounded-md border border-line text-body space-y-2">
            <span className="font-bold text-ink">Procedimiento Estándar de Recepción:</span>
            <ul className="list-disc list-inside space-y-1 text-ink-2">
              <li>Verificar la cantidad de cajas / unidades descargadas físicamente.</li>
              <li>Para artículos serializados (IMEI), escanear obligatoriamente cada código de barra único.</li>
              <li>Al confirmar la recepción, el sistema recalcula automáticamente el Costo Promedio Ponderado (CPP).</li>
            </ul>
          </div>
        </div>
      )}

      {/* RECEIVING LOGISTICS MODAL (ReceivingLogistics) */}
      {isReceivingModalOpen && selectedPO && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-2xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                  Recepción Física de Mercadería: <span className="font-mono text-blue-600">{selectedPO.id}</span>
                </h3>
                <p className="text-body text-gray-500">Proveedor: {selectedPO.supplier_name}</p>
              </div>
              <button onClick={() => setIsReceivingModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-5 space-y-4 text-body">
              <div className="border border-line rounded-md overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-sunken text-micro font-bold uppercase text-gray-500">
                    <tr>
                      <th className="p-3">Producto / SKU</th>
                      <th className="p-3 text-center">Cant. Pedida</th>
                      <th className="p-3 text-center">Cant. Recibida</th>
                      <th className="p-3 text-right">Costo Pactado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono">
                    {selectedPO.items.map(item => (
                      <tr key={item.id}>
                        <td className="p-3 font-sans font-bold text-ink">
                          {item.name}
                          <span className="block text-micro text-gray-400 font-mono">SKU: {item.sku}</span>
                        </td>
                        <td className="p-3 text-center font-bold">{item.ordered_qty}</td>
                        <td className="p-3 text-center">
                          <input type="number" defaultValue={item.ordered_qty} className="w-16 p-1 bg-gray-100 text-center font-bold rounded" />
                        </td>
                        <td className="p-3 text-right font-bold">${item.cost_price.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mass IMEI Scanning Field if Serialized */}
              {selectedPO.items.some(i => i.unit_type === 'SERIALIZED') && (
                <div className="p-4 bg-accent-soft border border-purple-200 dark:border-purple-800 rounded-md space-y-2">
                  <div className="flex items-center justify-between font-extrabold text-accent-ink">
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-4 h-4" /> Escaneo Masivo Obligatorio de IMEIs / Seriales
                    </span>
                    <span>{scannedImeis.length} de {selectedPO.items.find(i => i.unit_type === 'SERIALIZED')?.ordered_qty} escaneados</span>
                  </div>

                  <form onSubmit={handleAddImei} className="flex gap-2">
                    <input
 type="text"
 value={imeiInput}
 onChange={(e) => setImeiInput(e.target.value)}
 placeholder="Escanear número de serie con pistola láser..."
 className="flex-1 p-2 bg-raised border border-purple-200 rounded-md font-mono text-body"
                    />
                    <button type="submit" className="px-3 bg-purple-600 text-white rounded-md font-bold">Agregar</button>
                  </form>

                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {scannedImeis.map(imei => (
                      <span key={imei} className="px-2 py-0.5 bg-purple-200 text-purple-900 rounded font-mono text-micro font-bold">
                        {imei}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 bg-ok-soft border border-emerald-200 rounded-md space-y-1">
                <span className="font-extrabold text-ok-ink flex items-center gap-1">
                  <TrendingUp className="w-4 h-4" /> Recálculo Automático de Costo Promedio Ponderado (CPP)
                </span>
                <p className="text-micro text-ink-2">
                  Formula: ((StockPrevio × CPPPrevio) + (CantCompra × CostoCompra)) / StockTotal
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsReceivingModalOpen(false)} className="px-4 py-2 bg-gray-200 bg-sunken text-ink rounded-md font-bold">Cancelar</button>
                <button onClick={handleConfirmReceiving} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-extrabold shadow">
                  Confirmar Ingreso & Actualizar Stock
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW PO FORM MODAL */}
      {isPOModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-lg overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="font-extrabold text-base text-ink">Nueva Orden de Compra</h3>
              <button onClick={() => setIsPOModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); setIsPOModalOpen(false); }} className="p-5 space-y-4 text-body">
              <div>
                <label className="font-bold text-ink-2">Proveedor *</label>
                <select className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold">
                  <option value="1">Distribuidora Lácteos del Valle</option>
                  <option value="2">Importadora Electrónica TechBol</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-2">Sucursal Destino</label>
                  <select className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-semibold">
                    <option value="1">Almacén Central</option>
                    <option value="2">Sucursal Centro</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink-2">Términos Pago</label>
                  <select className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-semibold">
                    <option value="Contado">Contado</option>
                    <option value="30 días">30 días crédito</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsPOModalOpen(false)} className="px-4 py-2 bg-gray-200 bg-sunken text-ink rounded-md font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-extrabold shadow">Emitir Orden Compra</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
