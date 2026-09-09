import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Printer, 
  RotateCcw, 
  Eye, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  DollarSign, 
  QrCode, 
  Layers, 
  User, 
  Lock, 
  AlertTriangle
} from 'lucide-react';

import { useAuthStore } from '../store/useAuthStore';
import { hasPermission } from '../utils/permissions';

interface SoldItem {
 id: number;
 sku: string;
 name: string;
 quantity: number;
 unit_price: number;
 subtotal: number;
 serials?: string[];
 unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
}

interface SaleTicket {
 id: string; // Correlative ticket number e.g. TK-10024
 timestamp: string;
 cashier_name: string;
 payment_method: 'CASH' | 'CARD' | 'QR' | 'MIXED';
 total: number;
 cash_given: number;
 change: number;
 status: 'COMPLETED' | 'CANCELLED';
 items: SoldItem[];
 cancellation_reason?: string;
 cancelled_at?: string;
 cancelled_by?: string;
}

export const SalesHistoryView: React.FC = () => {
 const { user } = useAuthStore();
 const userRole = user?.role || 'ADMIN';
 const canVoidSaleDirect = hasPermission(userRole, 'can_void_sale');

 const [searchQuery, setSearchQuery] = useState('');
 const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
 const [dateFilter, setDateFilter] = useState('TODAY');

  // Modals
 const [selectedTicket, setSelectedTicket] = useState<SaleTicket | null>(null);
 const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
 const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  
  // Void Form State
 const [voidReason, setVoidReason] = useState('');
 const [supervisorPin, setSupervisorPin] = useState('');
 const [voidError, setVoidError] = useState('');

  // Mock Master Sales Tickets Data
 const [tickets, setTickets] = useState<SaleTicket[]>([
    {
 id: 'TK-10024',
 timestamp: '14/08/2026 14:15:22',
 cashier_name: 'Juan Pérez',
 payment_method: 'CASH',
 total: 864.00,
 cash_given: 900.00,
 change: 36.00,
 status: 'COMPLETED',
 items: [
        { id: 1, sku: 'SKU-1001', name: 'Coca Cola 2 Litros Retornable', quantity: 2, unit_price: 12.00, subtotal: 24.00, unit_type: 'UNIT' },
        { id: 3, sku: 'SKU-1003', name: 'Smartphone Samsung Galaxy A54 128GB', quantity: 1, unit_price: 1850.00, subtotal: 1850.00, serials: ['IMEI-358492019482712'], unit_type: 'SERIALIZED' }
      ]
    },
    {
 id: 'TK-10023',
 timestamp: '14/08/2026 13:40:10',
 cashier_name: 'María Gómez',
 payment_method: 'QR',
 total: 145.00,
 cash_given: 145.00,
 change: 0.00,
 status: 'COMPLETED',
 items: [
        { id: 2, sku: 'SKU-1002', name: 'Queso Criollo San Javier (Kg)', quantity: 3.220, unit_price: 45.00, subtotal: 145.00, unit_type: 'FRACTION' }
      ]
    },
    {
 id: 'TK-10022',
 timestamp: '14/08/2026 11:20:05',
 cashier_name: 'Juan Pérez',
 payment_method: 'CARD',
 total: 35.00,
 cash_given: 35.00,
 change: 0.00,
 status: 'CANCELLED',
 cancellation_reason: 'Error de tipeo en producto a solicitud del cliente',
 cancelled_at: '14/08/2026 11:25:00',
 cancelled_by: 'Administrador (Pin 1234)',
 items: [
        { id: 4, sku: 'SKU-1004', name: 'Galletas Wafer Chocolate 150g', quantity: 7, unit_price: 5.00, subtotal: 35.00, unit_type: 'UNIT' }
      ]
    }
  ]);

 const filteredTickets = tickets.filter(t => {
 const matchesSearch = t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
 t.cashier_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 t.payment_method.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
 return matchesSearch && matchesStatus;
  });

 const handlePrintReceipt = (ticket: SaleTicket) => {
 alert(`🖨️ Enviando ticket ${ticket.id} a la impresora térmica ESC/POS (80mm)...`);
  };

 const handleConfirmVoidTicket = (e: React.FormEvent) => {
 e.preventDefault();
 if (!voidReason) {
 setVoidError('Debe ingresar un motivo obligatorio para la anulación.');
 return;
    }
 if (supervisorPin !== '1234' && supervisorPin !== '0000') {
 setVoidError('PIN de supervisor incorrecto (Pruebe PIN: 1234).');
 return;
    }

 if (selectedTicket) {
      // 1. Update ticket status to CANCELLED
 setTickets(prev => prev.map(t => t.id === selectedTicket.id ? {
        ...t,
 status: 'CANCELLED',
 cancellation_reason: voidReason,
 cancelled_at: new Date().toLocaleString('es-ES'),
 cancelled_by: 'Supervisor (PIN Autorizado)'
      } : t));

      // 2. Revert inventory stock & free IMEIs automatically in log
 console.log(`[KARDEX] Devolución atómica de inventario ejecutada para el ticket ${selectedTicket.id}`);
 alert(`✅ Ticket ${selectedTicket.id} ANULADO correctamente. Stock devuelto a almacén y seriales/IMEIs liberados a IN_STOCK.`);
    }

 setIsVoidModalOpen(false);
 setVoidReason('');
 setSupervisorPin('');
 setVoidError('');
  };

 return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <History className="w-7 h-7 text-accent" />
            Historial de Ventas, Tickets & Anulaciones
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Registro inalterable de transacciones, trazabilidad de IMEIs, reimpresión térmica y reversión atómica de stock
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
 value={statusFilter}
 onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
 className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-bold focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="COMPLETED">Ventas Completadas</option>
            <option value="CANCELLED">Tickets Anulados</option>
          </select>

          <select
 value={dateFilter}
 onChange={(e) => setDateFilter(e.target.value)}
 className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-bold focus:outline-none"
          >
            <option value="TODAY">Jornada de Hoy</option>
            <option value="WEEK">Esta Semana</option>
            <option value="MONTH">Este Mes</option>
          </select>
        </div>
      </div>

      {/* 2. Interactive Search Toolbar */}
      <div className="bg-raised p-4 rounded-md border border-line shadow-e1">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
          <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar por # Ticket, Cajero o Método de pago..."
 className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-md text-body text-ink focus:border-accent font-semibold"
          />
        </div>
      </div>

      {/* 3. Results Data Table */}
      <div className="bg-raised rounded-md border border-line shadow-e1 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
              <th className="p-4"># Ticket Correlativo</th>
              <th className="p-4">Fecha & Hora Emisión</th>
              <th className="p-4">Cajero / Operador</th>
              <th className="p-4">Método de Pago</th>
              <th className="p-4 font-mono">Monto Total ($)</th>
              <th className="p-4 text-center">Estado Transaccional</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-body">
            {filteredTickets.map((t) => {
 const isCancelled = t.status === 'CANCELLED';
 const paymentBadge = {
                CASH: { label: 'Efectivo', color: 'bg-ok-soft text-ok-ink dark:bg-ok-soft border-ok/30', icon: <DollarSign className="w-3 h-3" /> },
                CARD: { label: 'Tarjeta POS', color: 'bg-accent-soft text-accent-ink dark:bg-accent-soft border-accent/30', icon: <CreditCard className="w-3 h-3" /> },
                QR: { label: 'Transfer QR', color: 'bg-accent-soft text-accent-ink dark:bg-accent-soft border-accent/30', icon: <QrCode className="w-3 h-3" /> },
                MIXED: { label: 'Pago Mixto', color: 'bg-warn-soft text-warn-ink dark:bg-warn-soft border-warn/30', icon: <Layers className="w-3 h-3" /> },
              }[t.payment_method];

 return (
                <tr key={t.id} className="hover:bg-sunken transition-colors">
                  <td className="p-4 font-mono font-extrabold text-accent text-base">
                    {t.id}
                  </td>
                  <td className="p-4 font-mono text-ink-2">
                    {t.timestamp}
                  </td>
                  <td className="p-4 font-bold text-ink flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-ink-3" />
                    {t.cashier_name}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-micro font-bold border flex items-center gap-1 w-fit ${paymentBadge.color}`}>
                      {paymentBadge.icon}
                      {paymentBadge.label}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-black text-base text-ink">
                    ${t.total.toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-md text-micro font-bold border flex items-center justify-center gap-1 mx-auto w-fit ${
 isCancelled 
                        ? 'bg-danger-soft text-danger-ink dark:bg-danger-soft border-danger/30' 
 : 'bg-ok-soft text-ok-ink dark:bg-ok-soft border-ok/30'
                    }`}>
                      {isCancelled ? <XCircle className="w-3 h-3 text-danger" /> : <CheckCircle2 className="w-3 h-3 text-ok" />}
                      {isCancelled ? 'ANULADO' : 'COMPLETADO'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-1">
                    <button
 onClick={() => {
 setSelectedTicket(t);
 setIsDetailModalOpen(true);
                      }}
 className="p-1.5 text-accent hover:bg-accent-soft rounded-md"
 title="Ver Detalle de Ticket & Trazabilidad IMEI"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
 onClick={() => handlePrintReceipt(t)}
 className="p-1.5 text-ok hover:bg-ok-soft rounded-md"
 title="Reimprimir Comprobante Térmico ESC/POS"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {!isCancelled && (
                      <button
 onClick={() => {
 setSelectedTicket(t);
 setIsVoidModalOpen(true);
                        }}
 className="p-1.5 text-danger hover:bg-danger-soft rounded-md"
 title="Anular Ticket & Devolver Stock"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* TICKET DETAIL MODAL */}
      {isDetailModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                  Detalle del Ticket: <span className="font-mono text-accent">{selectedTicket.id}</span>
                </h3>
                <p className="text-body text-ink-3">{selectedTicket.timestamp} • Cajero: {selectedTicket.cashier_name}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-ink-3 hover:text-ink-2">✕</button>
            </div>

            <div className="p-5 space-y-4 text-body">
              {/* Status Warning if Cancelled */}
              {selectedTicket.status === 'CANCELLED' && (
                <div className="p-3 bg-danger-soft border border-danger/30 dark:border-danger/30 rounded-md text-danger-ink space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="w-4 h-4" /> TICKET ANULADO OPERATIVAMENTE
                  </div>
                  <p className="text-micro">Motivo: {selectedTicket.cancellation_reason}</p>
                  <span className="text-micro text-ink-3 font-mono block">Anulado el {selectedTicket.cancelled_at} por {selectedTicket.cancelled_by}</span>
                </div>
              )}

              {/* Items Breakdown Table */}
              <div className="border border-line rounded-md overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-sunken text-micro font-extrabold text-ink-3 uppercase">
                    <tr>
                      <th className="p-3">Producto / SKU</th>
                      <th className="p-3 text-center">Cant.</th>
                      <th className="p-3">P.Unit</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line text-body">
                    {selectedTicket.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3">
                          <p className="font-bold text-ink">{item.name}</p>
                          <span className="text-ink-3 font-mono text-micro">SKU: {item.sku}</span>
                          {item.serials && item.serials.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.serials.map(s => (
                                <span key={s} className="px-1.5 py-0.5 bg-warn-soft text-warn-ink dark:bg-warn-soft dark:text-warn-ink rounded font-mono text-micro font-bold">
                                  IMEI: {s}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-center font-mono font-bold">{item.quantity}</td>
                        <td className="p-3 font-mono">${item.unit_price.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold">${item.subtotal.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary */}
              <div className="p-4 bg-sunken rounded-md border border-line space-y-1 text-body">
                <div className="flex justify-between text-ink-3">
                  <span>Efectivo Recibido:</span>
                  <span className="font-mono">${selectedTicket.cash_given.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-ink-3">
                  <span>Cambio Entregado:</span>
                  <span className="font-mono">${selectedTicket.change.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-ink pt-1 border-t border-line">
                  <span>Monto Total Cobrado:</span>
                  <span className="font-mono text-ok">${selectedTicket.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VOID TICKET MODAL (Zona Crítica) */}
      {isVoidModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border-2 border-rose-500/50 shadow-e3 w-full max-w-md overflow-hidden space-y-4">
            <div className="p-5 bg-rose-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Anulación Crítica de Ticket</span>
              </div>
              <button onClick={() => setIsVoidModalOpen(false)} className="text-white hover:opacity-80">✕</button>
            </div>

            <form onSubmit={handleConfirmVoidTicket} className="p-5 space-y-4 text-body">
              <p className="text-ink-2 font-semibold">
                Está a punto de anular el ticket <strong className="font-mono text-danger">{selectedTicket.id}</strong> por un total de <strong>${selectedTicket.total.toFixed(2)}</strong>.
              </p>

              <div>
                <label className="font-bold text-ink">Motivo Obligatorio de Cancelación *</label>
                <textarea
 required
 rows={2}
 value={voidReason}
 onChange={(e) => setVoidReason(e.target.value)}
 placeholder="Ej. Devolución de mercadería por falla de fábrica / Error en registro"
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md text-ink"
                />
              </div>

              <div>
                <label className="font-bold text-ink flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-warn" /> PIN de Validación Supervisor / Admin *
                  {!canVoidSaleDirect && (
                    <span className="text-micro text-danger font-semibold ml-1">(Rol {userRole} requiere aprobación)</span>
                  )}
                </label>
                <input
 type="password"
 required
 value={supervisorPin}
 onChange={(e) => setSupervisorPin(e.target.value)}
 placeholder="Ingrese PIN supervisor (Pruebe: 1234)"
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-mono text-center font-bold text-title"
                />
              </div>

              {voidError && (
                <div className="p-2 bg-danger-soft text-danger-ink rounded-md text-micro font-bold">
                  {voidError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
 type="button"
 onClick={() => setIsVoidModalOpen(false)}
 className="px-4 py-2 bg-sunken text-ink rounded-md font-bold"
                >
                  Cancelar
                </button>
                <button
 type="submit"
 className="px-4 py-2 bg-danger hover:opacity-90 text-white rounded-md font-black shadow-e2"
                >
                  Confirmar Anulación & Devolver Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
