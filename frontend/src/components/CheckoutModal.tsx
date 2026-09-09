import React, { useState } from 'react';
import { DollarSign, CreditCard, QrCode, Layers, CheckCircle2, X, AlertCircle } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { usePosStore } from '../store/usePosStore';
import { useSyncStore } from '../store/useSyncStore';
import { localDb, FourBlockSalePayload, BlockA, BlockB, BlockC, BlockD, BlockCPaymentItem, BlockDItem } from '../db/sqlite';
import { syncWorker } from '../services/syncWorker';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const {
    items,
    getSubtotal,
    getTotal,
    getDiscountAmount,
    paymentMethod,
    setPaymentMethod,
    cashGiven,
    setCashGiven,
    cashAmount,
    cardAmount,
    qrAmount,
    setMixedAmounts,
    getTotalPaid,
    getChange,
    isPaymentCovered,
    clearCart,
  } = useCartStore();

  const { selectedCustomer, manualDiscount, resetPosCycle, setPendingSyncCount } = usePosStore();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const customerDiscountRate = selectedCustomer?.discountPercentage || 0;
  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount(customerDiscountRate, manualDiscount);
  const total = getTotal(customerDiscountRate, manualDiscount);
  const totalPaid = getTotalPaid();
  const change = getChange(customerDiscountRate, manualDiscount);
  const isCovered = isPaymentCovered(customerDiscountRate, manualDiscount);

  const handleProcessPayment = () => {
    if (!isCovered) return;
    setIsProcessing(true);

    try {
      // 1. Generación de UUID inmutable (Regla de Oro)
      const transaction_id = generateUUID();
      const timestamp = new Date().toISOString();
      const branch_id = 'branch-01';
      const register_id = 'caja-1';
      const shift_id = 'shift-01';
      const cashier_id = 'user-01';
      const customer_id = selectedCustomer?.id && selectedCustomer.id !== 'default-public' ? String(selectedCustomer.id) : null;

      // 2. Construcción del Desglose de Pagos (Bloque C)
      let paymentBreakdown: BlockCPaymentItem[] = [];

      if (paymentMethod === 'CASH') {
        paymentBreakdown = [
          {
            payment_method: 'CASH',
            amount_received: cashGiven,
            change_given: change,
          },
        ];
      } else if (paymentMethod === 'CARD') {
        paymentBreakdown = [
          {
            payment_method: 'CARD',
            amount_received: total,
            change_given: 0,
          },
        ];
      } else if (paymentMethod === 'QR') {
        paymentBreakdown = [
          {
            payment_method: 'QR',
            amount_received: total,
            change_given: 0,
          },
        ];
      } else {
        if (cashAmount > 0) {
          paymentBreakdown.push({
            payment_method: 'CASH',
            amount_received: cashAmount,
            change_given: change,
          });
        }
        if (cardAmount > 0) {
          paymentBreakdown.push({
            payment_method: 'CARD',
            amount_received: cardAmount,
            change_given: 0,
          });
        }
        if (qrAmount > 0) {
          paymentBreakdown.push({
            payment_method: 'QR',
            amount_received: qrAmount,
            change_given: 0,
          });
        }
      }

      // 3. Construcción del Arreglo de Items (Bloque D)
      const formattedItems: BlockDItem[] = items.map((item) => {
        const serials = item.selected_serials && item.selected_serials.length > 0
          ? item.selected_serials
          : item.serial_number
          ? [item.serial_number]
          : [];

        return {
          product_id: String(item.id),
          quantity: item.quantity,
          unit_price: item.unit_price,
          line_subtotal: item.subtotal,
          serials_used: serials,
        };
      });

      // 4. Estructura Completa de Payload de 4 Bloques
      const block_a: BlockA = {
        transaction_id,
        timestamp,
        branch_id,
        register_id,
        shift_id,
        cashier_id,
        customer_id,
      };

      const block_b: BlockB = {
        subtotal,
        total_discount: discountAmount,
        grand_total: total,
      };

      const block_c: BlockC = {
        payment_breakdown: paymentBreakdown,
      };

      const block_d: BlockD = {
        items: formattedItems,
      };

      const salePayload: FourBlockSalePayload = {
        transaction_id,
        timestamp,
        branch_id,
        register_id,
        shift_id,
        cashier_id,
        customer_id,
        subtotal,
        total_discount: discountAmount,
        grand_total: total,
        payment_breakdown: paymentBreakdown,
        items: formattedItems,
        block_a,
        block_b,
        block_c,
        block_d,
      };

      // Execute Atomic ACID transaction in local SQLite database
      const result = localDb.processLocalSaleAtomic(salePayload);

      // Update Zustand sync queue state
      const pendingCount = localDb.getPendingCount();
      useSyncStore.getState().setPendingCount(pendingCount);
      setPendingSyncCount(pendingCount);

      console.log('Venta completada de forma atómica. Tx UUID:', result.saleId);

      // Trigger background sync worker to process FIFO queue if online
      syncWorker.triggerManualSync();

      setTimeout(() => {
        setIsProcessing(false);
        clearCart();
        resetPosCycle();
        onSuccess();
        onClose();
      }, 400);
    } catch (error: any) {
      alert('Error en la transacción local: ' + error.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#1F2833] pb-3">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">[F12 / F8] Procesar Cobro y Emisión de Ticket</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Cliente: <strong className="text-blue-500 font-semibold">{selectedCustomer.businessName}</strong> (NIT: {selectedCustomer.taxId})
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Method Selector Tabs */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Método de Pago Principal:</label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { id: 'CASH', label: 'Efectivo', icon: <DollarSign className="w-4 h-4" /> },
              { id: 'CARD', label: 'Tarjeta', icon: <CreditCard className="w-4 h-4" /> },
              { id: 'QR', label: 'Transfer QR', icon: <QrCode className="w-4 h-4" /> },
              { id: 'MIXED', label: 'Pago Mixto', icon: <Layers className="w-4 h-4" /> },
            ].map((method) => (
              <button
                key={method.id}
                type="button"
                onClick={() => setPaymentMethod(method.id as any)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-semibold transition-all ${
                  paymentMethod === method.id
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                    : 'bg-gray-50 dark:bg-[#0B0C10] border-gray-200 dark:border-[#1F2833] text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {method.icon}
                <span className="mt-1">{method.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Single Payment Mode vs Mixed Payment Mode */}
        {paymentMethod === 'CASH' && (
          <div className="space-y-3 bg-gray-50 dark:bg-[#0B0C10] p-4 rounded-xl border border-gray-200 dark:border-[#1F2833]">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Efectivo Recibido ($):</label>
              <input
                type="number"
                step="1"
                autoFocus
                value={cashGiven || ''}
                onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
                className="w-full text-center py-2 bg-white dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg text-2xl font-bold font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Quick Cash Suggestions */}
            <div className="flex space-x-2 pt-1">
              {[total, Math.ceil(total / 10) * 10, Math.ceil(total / 50) * 50, Math.ceil(total / 100) * 100].map((amt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCashGiven(amt)}
                  className="flex-1 py-1 bg-gray-200 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-xs font-mono font-bold text-gray-800 dark:text-gray-200 rounded"
                >
                  ${amt}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-800 pt-3">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Vuelto / Cambio:</span>
              <span className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                ${change.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {paymentMethod === 'MIXED' && (
          <div className="space-y-3 bg-gray-50 dark:bg-[#0B0C10] p-4 rounded-xl border border-gray-200 dark:border-[#1F2833]">
            <h4 className="text-xs font-bold text-gray-900 dark:text-white mb-1">Desglose de Pago Mixto:</h4>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1 font-medium">💵 Efectivo ($):</label>
                <input
                  type="number"
                  step="0.01"
                  value={cashAmount || ''}
                  onChange={(e) => setMixedAmounts(parseFloat(e.target.value) || 0, cardAmount, qrAmount)}
                  placeholder="0.00"
                  className="w-full p-2 bg-white dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg font-mono font-bold text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1 font-medium">💳 Tarjeta ($):</label>
                <input
                  type="number"
                  step="0.01"
                  value={cardAmount || ''}
                  onChange={(e) => setMixedAmounts(cashAmount, parseFloat(e.target.value) || 0, qrAmount)}
                  placeholder="0.00"
                  className="w-full p-2 bg-white dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg font-mono font-bold text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-600 dark:text-gray-400 mb-1 font-medium">📲 Transfer QR ($):</label>
                <input
                  type="number"
                  step="0.01"
                  value={qrAmount || ''}
                  onChange={(e) => setMixedAmounts(cashAmount, cardAmount, parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-2 bg-white dark:bg-[#121212] border border-gray-300 dark:border-gray-700 rounded-lg font-mono font-bold text-gray-900 dark:text-white text-center focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-800 text-xs">
              <span className="text-gray-600 dark:text-gray-400">Cubierto / Deuda Restante:</span>
              <span className={`font-mono font-bold ${isCovered ? 'text-emerald-500' : 'text-rose-500'}`}>
                ${totalPaid.toFixed(2)} / ${total.toFixed(2)}
                {!isCovered && ` (Falta $${(total - totalPaid).toFixed(2)})`}
              </span>
            </div>
          </div>
        )}

        {/* Total Summary */}
        <div className="space-y-1 text-sm border-t border-gray-200 dark:border-[#1F2833] pt-3">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>Subtotal Bruto:</span>
            <span className="font-mono">${subtotal.toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-red-500 font-medium">
              <span>
                Descuento Total ({customerDiscountRate}% Cliente + {manualDiscount}% Manual):
              </span>
              <span className="font-mono">-${discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-[#1F2833]">
            <span>TOTAL A COBRAR:</span>
            <span className="font-mono text-2xl text-emerald-500 dark:text-emerald-400">${total.toFixed(2)}</span>
          </div>
        </div>

        {!isCovered && (
          <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 flex items-center text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
            <span>Monto recibido insuficiente. El botón 'Finalizar Venta' se habilitará al cubrir la deuda total.</span>
          </div>
        )}

        {/* Submit Actions */}
        <div className="flex space-x-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-3 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={isProcessing || !isCovered}
            onClick={handleProcessPayment}
            className="w-2/3 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/25 transition-transform active:scale-[0.99]"
          >
            {isProcessing ? (
              <span>Procesando Venta...</span>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>FINALIZAR VENTA (ENTER)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
