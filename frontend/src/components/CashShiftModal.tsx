import React, { useState } from 'react';
import { Clock, Lock, Unlock, CheckCircle2, X } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';

interface CashShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashShiftModal: React.FC<CashShiftModalProps> = ({ isOpen, onClose }) => {
  const { cashShift, openCashShift, closeCashShift } = usePosStore();
  const [openingAmount, setOpeningAmount] = useState('200.00');
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const isShiftOpen = cashShift !== null;

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(openingAmount) || 200.00;
    openCashShift(amount);
    onClose();
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(closingAmount) || 0;
    closeCashShift(amount, notes);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#1F2833] pb-3">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <Clock className="w-5 h-5" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Gestión de Turno y Arqueo de Caja</h3>
          </div>
          {isShiftOpen && (
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Current Status Indicator */}
        <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833]">
          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Estado del Turno Actual:</span>
          {isShiftOpen ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              <Unlock className="w-3.5 h-3.5 mr-1" /> CAJA ABIERTA (${cashShift.initialFloat.toFixed(2)})
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
              <Lock className="w-3.5 h-3.5 mr-1" /> TURNO CERRADO
            </span>
          )}
        </div>

        {/* Opening Form */}
        {!isShiftOpen ? (
          <form onSubmit={handleOpenShift} className="space-y-4">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Ingrese el fondo de caja inicial (sencillo) con el que se inicia la atención en la terminal de venta.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Fondo Inicial de Efectivo en Caja ($ / Bs.):
              </label>
              <input
                type="number"
                step="0.01"
                required
                autoFocus
                value={openingAmount}
                onChange={(e) => setOpeningAmount(e.target.value)}
                className="w-full text-center py-2 bg-gray-50 dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-lg text-2xl font-bold font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-1 shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.99]"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" /> Abrir Turno de Caja
            </button>
          </form>
        ) : (
          /* Closing Audit Form */
          <form onSubmit={handleCloseShift} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Declarar Conteo Físico Final (Arqueo Ciego $):
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="0.00"
                value={closingAmount}
                onChange={(e) => setClosingAmount(e.target.value)}
                className="w-full text-center py-2 bg-gray-50 dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-lg text-2xl font-extrabold font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Notas u Observaciones del Cierre:
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Cierre de turno sin novedades..."
                className="w-full p-2 bg-gray-50 dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm flex items-center justify-center space-x-1 shadow-lg shadow-rose-500/25"
            >
              <Lock className="w-4 h-4 mr-1" /> Finalizar y Cerrar Turno
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
