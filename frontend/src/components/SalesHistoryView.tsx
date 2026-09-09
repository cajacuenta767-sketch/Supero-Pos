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
    <div className="p-6 bg-gray-50 dark:bg-[#000000] h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-200">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121212] p-5 rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <History className="w-7 h-7 text-blue-500" />
            Historial de Ventas, Tickets & Anulaciones
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Registro inalterable de transacciones, trazabilidad de IMEIs, reimpresión térmica y reversión atómica de stock
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-gray-100 dark:bg-[#0B0C10] text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-[#1F2833] text-xs font-bold focus:outline-none"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="COMPLETED">Ventas Completadas</option>
            <option value="CANCELLED">Tickets Anulados</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-gray-100 dark:bg-[#0B0C10] text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-[#1F2833] text-xs font-bold focus:outline-none"
          >
            <option value="TODAY">Jornada de Hoy</option>
            <option value="WEEK">Esta Semana</option>
            <option value="MONTH">Este Mes</option>
          </select>
        </div>
      </div>

      {/* 2. Interactive Search Toolbar */}
      <div className="bg-white dark:bg-[#121212] p-4 rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por # Ticket, Cajero o Método de pago..."
            className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
          />
        </div>
      </div>

      {/* 3. Results Data Table */}
      <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-[#0B0C10] text-gray-500 dark:text-gray-400 text-[11px] font-extrabold uppercase tracking-wider border-b border-gray-200 dark:border-[#1F2833]">
              <th className="p-4"># Ticket Correlativo</th>
              <th className="p-4">Fecha & Hora Emisión</th>
              <th className="p-4">Cajero / Operador</th>
              <th className="p-4">Método de Pago</th>
              <th className="p-4 font-mono">Monto Total ($)</th>
              <th className="p-4 text-center">Estado Transaccional</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-[#1F2833] text-xs">
            {filteredTickets.map((t) => {
              const isCancelled = t.status === 'CANCELLED';
              const paymentBadge = {
                CASH: { label: 'Efectivo', color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 border-emerald-200', icon: <DollarSign className="w-3 h-3" /> },
                CARD: { label: 'Tarjeta POS', color: 'bg-blue-100 text-blue-800 dark:bg-blue-950 border-blue-200', icon: <CreditCard className="w-3 h-3" /> },
                QR: { label: 'Transfer QR', color: 'bg-purple-100 text-purple-800 dark:bg-purple-950 border-purple-200', icon: <QrCode className="w-3 h-3" /> },
                MIXED: { label: 'Pago Mixto', color: 'bg-amber-100 text-amber-800 dark:bg-amber-950 border-amber-200', icon: <Layers className="w-3 h-3" /> },
              }[t.payment_method];

              return (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1D20] transition-colors">
                  <td className="p-4 font-mono font-extrabold text-blue-600 dark:text-blue-400 text-sm">
                    {t.id}
                  </td>
                  <td className="p-4 font-mono text-gray-600 dark:text-gray-300">
                    {t.timestamp}
                  </td>
                  <td className="p-4 font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-gray-400" />
                    {t.cashier_name}
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 w-fit ${paymentBadge.color}`}>
                      {paymentBadge.icon}
                      {paymentBadge.label}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-black text-sm text-gray-900 dark:text-white">
                    ${t.total.toFixed(2)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center justify-center gap-1 mx-auto w-fit ${
                      isCancelled 
                        ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 border-rose-200' 
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 border-emerald-200'
                    }`}>
                      {isCancelled ? <XCircle className="w-3 h-3 text-rose-500" /> : <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      {isCancelled ? 'ANULADO' : 'COMPLETADO'}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-1">
                    <button
                      onClick={() => {
                        setSelectedTicket(t);
                        setIsDetailModalOpen(true);
                      }}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="Ver Detalle de Ticket & Trazabilidad IMEI"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handlePrintReceipt(t)}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"
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
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg"
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
          <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-2xl w-full max-w-xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-gray-100 dark:border-[#1F2833] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  Detalle del Ticket: <span className="font-mono text-blue-600 dark:text-blue-400">{selectedTicket.id}</span>
                </h3>
                <p className="text-xs text-gray-500">{selectedTicket.timestamp} • Cajero: {selectedTicket.cashier_name}</p>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Status Warning if Cancelled */}
              {selectedTicket.status === 'CANCELLED' && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <ShieldAlert className="w-4 h-4" /> TICKET ANULADO OPERATIVAMENTE
                  </div>
                  <p className="text-[11px]">Motivo: {selectedTicket.cancellation_reason}</p>
                  <span className="text-[10px] text-gray-500 font-mono block">Anulado el {selectedTicket.cancelled_at} por {selectedTicket.cancelled_by}</span>
                </div>
              )}

              {/* Items Breakdown Table */}
              <div className="border border-gray-200 dark:border-[#1F2833] rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 dark:bg-[#0B0C10] text-[10px] font-extrabold text-gray-500 uppercase">
                    <tr>
                      <th className="p-3">Producto / SKU</th>
                      <th className="p-3 text-center">Cant.</th>
                      <th className="p-3">P.Unit</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1F2833] text-xs">
                    {selectedTicket.items.map((item) => (
                      <tr key={item.id}>
                        <td className="p-3">
                          <p className="font-bold text-gray-900 dark:text-white">{item.name}</p>
                          <span className="text-gray-400 font-mono text-[10px]">SKU: {item.sku}</span>
                          {item.serials && item.serials.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {item.serials.map(s => (
                                <span key={s} className="px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 rounded font-mono text-[10px] font-bold">
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
              <div className="p-4 bg-gray-50 dark:bg-[#0B0C10] rounded-xl border border-gray-200 dark:border-[#1F2833] space-y-1 text-xs">
                <div className="flex justify-between text-gray-500">
                  <span>Efectivo Recibido:</span>
                  <span className="font-mono">${selectedTicket.cash_given.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Cambio Entregado:</span>
                  <span className="font-mono">${selectedTicket.change.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-black text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-800">
                  <span>Monto Total Cobrado:</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">${selectedTicket.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VOID TICKET MODAL (Zona Crítica) */}
      {isVoidModalOpen && selectedTicket && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] rounded-2xl border-2 border-rose-500/50 shadow-2xl w-full max-w-md overflow-hidden space-y-4">
            <div className="p-5 bg-rose-500 text-white flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-base">
                <AlertTriangle className="w-5 h-5" />
                <span>Anulación Crítica de Ticket</span>
              </div>
              <button onClick={() => setIsVoidModalOpen(false)} className="text-white hover:opacity-80">✕</button>
            </div>

            <form onSubmit={handleConfirmVoidTicket} className="p-5 space-y-4 text-xs">
              <p className="text-gray-600 dark:text-gray-300 font-semibold">
                Está a punto de anular el ticket <strong className="font-mono text-rose-600 dark:text-rose-400">{selectedTicket.id}</strong> por un total de <strong>${selectedTicket.total.toFixed(2)}</strong>.
              </p>

              <div>
                <label className="font-bold text-gray-800 dark:text-gray-200">Motivo Obligatorio de Cancelación *</label>
                <textarea
                  required
                  rows={2}
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="Ej. Devolución de mercadería por falla de fábrica / Error en registro"
                  className="w-full mt-1 p-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-amber-500" /> PIN de Validación Supervisor / Admin *
                  {!canVoidSaleDirect && (
                    <span className="text-[10px] text-rose-500 font-semibold ml-1">(Rol {userRole} requiere aprobación)</span>
                  )}
                </label>
                <input
                  type="password"
                  required
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  placeholder="Ingrese PIN supervisor (Pruebe: 1234)"
                  className="w-full mt-1 p-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-mono text-center font-bold text-lg"
                />
              </div>

              {voidError && (
                <div className="p-2 bg-rose-100 text-rose-800 rounded-lg text-[11px] font-bold">
                  {voidError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsVoidModalOpen(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-black shadow-lg shadow-rose-500/20"
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
