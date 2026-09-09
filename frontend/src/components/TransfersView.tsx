import React, { useState } from 'react';
import { 
  ArrowLeftRight, 
  Plus, 
  Search, 
  Truck, 
  Printer, 
  Eye
} from 'lucide-react';

interface TransferItem {
 id: number;
 sku: string;
 name: string;
 source_stock: number;
 qty: number;
 unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
 serials?: string[];
}

interface TransferGuide {
 id: string; // TR-3001
 date: string;
 source_branch: string;
 destination_branch: string;
 items_count: number;
 status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
 notes?: string;
 items: TransferItem[];
}

export const TransfersView: React.FC = () => {
 const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'reception' | 'discrepancies'>('catalog');

  // Search & Filters
 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState('ALL');
 const [sourceFilter] = useState('ALL');

  // Modals
 const [isNewTransferModalOpen, setIsNewTransferModalOpen] = useState(false);
 const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
 const [, setIsDetailModalOpen] = useState(false);
 const [selectedTransfer, setSelectedTransfer] = useState<TransferGuide | null>(null);

  // New Transfer Form State
 const [sourceBranch, setSourceBranch] = useState('Almacén Central');
 const [destBranch, setDestBranch] = useState('Sucursal Centro');
 const [transferNotes, setTransferNotes] = useState('');

  // Mock Transfer Guides Data
 const [transfers, setTransfers] = useState<TransferGuide[]>([
    {
 id: 'TR-3001',
 date: '14/08/2026 10:15',
 source_branch: 'Almacén Central',
 destination_branch: 'Sucursal Centro',
 items_count: 2,
 status: 'IN_TRANSIT',
 notes: 'Reabastecimiento urgente por alta demanda en fin de semana',
 items: [
        { id: 1, sku: 'SKU-1001', name: 'Coca Cola 2 Litros Retornable', source_stock: 120, qty: 30, unit_type: 'UNIT' },
        { id: 3, sku: 'SKU-1003', name: 'Smartphone Samsung Galaxy A54 128GB', source_stock: 8, qty: 2, unit_type: 'SERIALIZED', serials: ['IMEI-358492019482710', 'IMEI-358492019482711'] }
      ]
    },
    {
 id: 'TR-3002',
 date: '11/08/2026 16:30',
 source_branch: 'Sucursal Norte',
 destination_branch: 'Almacén Central',
 items_count: 1,
 status: 'COMPLETED',
 notes: 'Devolución de excedente de inventario',
 items: [
        { id: 2, sku: 'SKU-1002', name: 'Queso Criollo San Javier (Kg)', source_stock: 15, qty: 5.500, unit_type: 'FRACTION' }
      ]
    }
  ]);

 const filteredTransfers = transfers.filter(tr => {
 const matchesSearch = tr.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
 tr.source_branch.toLowerCase().includes(searchQuery.toLowerCase()) ||
 tr.destination_branch.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesStatus = statusFilter === 'ALL' || tr.status === statusFilter;
 const matchesSource = sourceFilter === 'ALL' || tr.source_branch === sourceFilter;
 return matchesSearch && matchesStatus && matchesSource;
  });

 const handleConfirmReception = () => {
 if (!selectedTransfer) return;

 setTransfers(prev => prev.map(t => t.id === selectedTransfer.id ? {
      ...t,
 status: 'COMPLETED'
    } : t));

 alert(`✅ Transferencia ${selectedTransfer.id} RECIBIDA y auditada al 100%. Stock incrementado en ${selectedTransfer.destination_branch} y seriales/IMEIs liberados a inventario activo.`);
 setIsReceptionModalOpen(false);
  };

 return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header & Tab Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <ArrowLeftRight className="w-7 h-7 text-accent" />
            Transferencias de Existencias y Traspasos
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Control de traspasos de stock entre depósitos, guías de remisión y auditoría física de recepción
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center bg-sunken p-1.5 rounded-md border border-line">
          <button
 onClick={() => setActiveSubTab('catalog')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeSubTab === 'catalog' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            Historial Traspasos
          </button>
          <button
 onClick={() => setActiveSubTab('reception')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeSubTab === 'reception' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <Truck className="w-4 h-4" />
            Entradas Pendientes
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: CATALOG & TRANSFERS LIST */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-raised p-4 rounded-md border border-line shadow-e1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar por # Guía, Origen o Destino..."
 className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-md text-body text-ink focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value)}
 className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:outline-none"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="IN_TRANSIT">En Tránsito</option>
                <option value="COMPLETED">Completadas</option>
                <option value="CANCELLED">Anuladas</option>
              </select>

              <button
 onClick={() => setIsNewTransferModalOpen(true)}
 className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-body font-extrabold flex items-center gap-2 shadow-e1 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nueva Transferencia
              </button>
            </div>
          </div>

          <div className="bg-raised rounded-md border border-line shadow-e1 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                  <th className="p-4"># Guía Traspaso</th>
                  <th className="p-4">Fecha & Hora Emission</th>
                  <th className="p-4">Almacén Origen → Destino</th>
                  <th className="p-4 font-mono">Ítems Trasladados</th>
                  <th className="p-4 text-center">Estado Logístico</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-body">
                {filteredTransfers.map((tr) => {
 const statusBadge = {
                    PENDING: { label: 'PENDIENTE SALIDA', color: 'bg-warn-soft text-warn-ink dark:bg-warn-soft border-warn/30' },
                    IN_TRANSIT: { label: 'EN TRÁNSITO (EN RUTA)', color: 'bg-accent-soft text-accent-ink dark:bg-accent-soft border-accent/30' },
                    COMPLETED: { label: 'RECIBIDO (COMPLETADO)', color: 'bg-ok-soft text-ok-ink dark:bg-ok-soft border-ok/30' },
                    CANCELLED: { label: 'ANULADA', color: 'bg-danger-soft text-danger-ink dark:bg-danger-soft border-danger/30' },
                  }[tr.status];

 return (
                    <tr key={tr.id} className="hover:bg-sunken">
                      <td className="p-4 font-mono font-extrabold text-accent">
                        {tr.id}
                      </td>
                      <td className="p-4 font-mono text-ink-2">
                        {tr.date}
                      </td>
                      <td className="p-4 font-bold text-ink">
                        <span className="text-ink-3 font-normal">{tr.source_branch}</span>
                        <span className="mx-2 text-accent">→</span>
                        <span className="text-accent font-extrabold">{tr.destination_branch}</span>
                      </td>
                      <td className="p-4 font-mono font-bold">
                        {tr.items_count} productos
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-md text-micro font-bold border ${statusBadge.color}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <button
 onClick={() => {
 setSelectedTransfer(tr);
 setIsDetailModalOpen(true);
                          }}
 className="p-1.5 text-accent hover:bg-accent-soft rounded-md" title="Ver Guía de Remisión"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-ok hover:bg-ok-soft rounded-md" title="Imprimir Comprobante">
                          <Printer className="w-4 h-4" />
                        </button>
                        {tr.status === 'IN_TRANSIT' && (
                          <button
 onClick={() => {
 setSelectedTransfer(tr);
 setIsReceptionModalOpen(true);
                            }}
 className="p-1.5 text-accent hover:bg-accent-soft rounded-md font-bold flex items-center gap-1 inline-flex" title="Confirmar Recepción"
                          >
                            <Truck className="w-4 h-4" /> Recibir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NEW TRANSFER FORM MODAL (TransferOrderForm) */}
      {isNewTransferModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="font-extrabold text-base text-ink">Emisión de Nueva Transferencia de Stock</h3>
              <button onClick={() => setIsNewTransferModalOpen(false)} className="text-ink-3 hover:text-ink-2">✕</button>
            </div>

            <form onSubmit={(e) => {
 e.preventDefault();
 if (sourceBranch === destBranch) {
 alert('⚠️ La sucursal de origen y destino no pueden ser la misma.');
 return;
              }
 const newTr: TransferGuide = {
 id: 'TR-3003',
 date: new Date().toLocaleString('es-ES'),
 source_branch: sourceBranch,
 destination_branch: destBranch,
 items_count: 1,
 status: 'IN_TRANSIT',
 notes: transferNotes,
 items: [{ id: 1, sku: 'SKU-1001', name: 'Coca Cola 2 Litros Retornable', source_stock: 120, qty: 10, unit_type: 'UNIT' }]
              };
 setTransfers(prev => [newTr, ...prev]);
 setIsNewTransferModalOpen(false);
            }} className="p-5 space-y-4 text-body">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-2">Sucursal / Almacén Origen *</label>
                  <select
 value={sourceBranch}
 onChange={(e) => setSourceBranch(e.target.value)}
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold"
                  >
                    <option value="Almacén Central">Almacén Central</option>
                    <option value="Sucursal Centro">Sucursal Centro</option>
                    <option value="Sucursal Norte">Sucursal Norte</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink-2">Sucursal / Almacén Destino *</label>
                  <select
 value={destBranch}
 onChange={(e) => setDestBranch(e.target.value)}
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold"
                  >
                    <option value="Sucursal Centro">Sucursal Centro</option>
                    <option value="Sucursal Norte">Sucursal Norte</option>
                    <option value="Almacén Central">Almacén Central</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-ink-2">Motivo / Notas del Traspaso</label>
                <textarea
 rows={2}
 value={transferNotes}
 onChange={(e) => setTransferNotes(e.target.value)}
 placeholder="Ej. Redistribución por reabastecimiento urgente de stock"
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsNewTransferModalOpen(false)} className="px-4 py-2 bg-sunken text-ink rounded-md font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md font-extrabold shadow">
                  Emitir Guía de Remisión & Descontar Stock Origen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEPTION AUDIT MODAL (TransferReception) */}
      {isReceptionModalOpen && selectedTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-ink">Auditoría Física de Entrada: {selectedTransfer.id}</h3>
                <p className="text-body text-ink-3">Destino: {selectedTransfer.destination_branch}</p>
              </div>
              <button onClick={() => setIsReceptionModalOpen(false)} className="text-ink-3 hover:text-ink-2">✕</button>
            </div>

            <div className="p-5 space-y-4 text-body">
              <div className="border border-line rounded-md overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-sunken text-micro font-bold uppercase text-ink-3">
                    <tr>
                      <th className="p-3">Producto / SKU</th>
                      <th className="p-3 text-center">Cant. Despachada</th>
                      <th className="p-3 text-center">Cant. Recibida Físicamente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono">
                    {selectedTransfer.items.map(item => (
                      <tr key={item.id}>
                        <td className="p-3 font-sans font-bold text-ink">
                          {item.name}
                          <span className="block text-micro text-ink-3 font-mono">SKU: {item.sku}</span>
                        </td>
                        <td className="p-3 text-center font-bold">{item.qty}</td>
                        <td className="p-3 text-center">
                          <input type="number" defaultValue={item.qty} className="w-16 p-1 bg-sunken text-center font-bold rounded" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsReceptionModalOpen(false)} className="px-4 py-2 bg-sunken text-ink rounded-md font-bold">Cancelar</button>
                <button onClick={handleConfirmReception} className="px-4 py-2 bg-ok hover:opacity-90 text-white rounded-md font-extrabold shadow">
                  Aprobar Ingreso al Stock Destino
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
