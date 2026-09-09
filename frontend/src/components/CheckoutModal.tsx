import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, CreditCard, DollarSign, Layers, QrCode } from 'lucide-react';
import { useCartStore } from '../store/useCartStore';
import { useCatalogStore } from '../store/useCatalogStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { usePosStore } from '../store/usePosStore';
import { useSyncStore } from '../store/useSyncStore';
import {
  localDb,
  FourBlockSalePayload,
  BlockA,
  BlockB,
  BlockC,
  BlockD,
  BlockCPaymentItem,
  BlockDItem,
} from '../db/sqlite';
import { syncWorker } from '../services/syncWorker';
import {
  cartItemsToTicketLines,
  openCashDrawer,
  printSaleTicket,
  isPrintingAvailable,
} from '../services/printing';
import { Badge, Button, Input, Modal, Money, SignaturePad, cn, useToast } from '../ui';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/** A partir de este importe, una venta a empresa exige conforme firmado. */
const SIGNATURE_THRESHOLD = 500;

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
  const toast = useToast();
  const applyMovements = useCatalogStore((state) => state.applyMovements);
  const settings = useSettingsStore();
  const [isProcessing, setIsProcessing] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);

  /* Al abrir el cobro se siembran los importes desde el total vigente. El
     estado inicial del carrito ya no trae efectivo precargado —eran 900 fijos
     de la demostración—, así que sin esto el campo abría en cero y «Finalizar
     venta» salía deshabilitado hasta teclear el importe a mano. */
  useEffect(() => {
    if (isOpen) setPaymentMethod(paymentMethod);
    // Solo al abrir: cambiar de método ya reasigna los importes por su cuenta.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const customerDiscountRate = selectedCustomer?.discountPercentage || 0;
  const subtotal = getSubtotal();
  const discountAmount = getDiscountAmount(customerDiscountRate, manualDiscount);
  const total = getTotal(customerDiscountRate, manualDiscount);
  const totalPaid = getTotalPaid();
  const change = getChange(customerDiscountRate, manualDiscount);
  const isCovered = isPaymentCovered(customerDiscountRate, manualDiscount);

  // El conforme se pide cuando la venta sale a nombre de una empresa: es la que
  // puede reclamar después. Al público general no se le pide firma por 20 Bs.
  const isNamedCustomer = Boolean(selectedCustomer?.id && selectedCustomer.id !== 'default-public');
  const needsSignature = isNamedCustomer && total >= SIGNATURE_THRESHOLD;
  const canFinish = isCovered && (!needsSignature || Boolean(signature));

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
      const customer_id =
        selectedCustomer?.id && selectedCustomer.id !== 'default-public'
          ? String(selectedCustomer.id)
          : null;

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
        const serials =
          item.selected_serials && item.selected_serials.length > 0
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
        customer_signature: signature ?? undefined,
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

      /* Las existencias bajan al vender, con su asiento en el kardex local. */
      applyMovements(
        items.map((item) => ({
          productId: item.id,
          type: 'SALE' as const,
          quantity: -item.quantity,
          reference: transaction_id.slice(0, 8).toUpperCase(),
        })),
      );

      // Update Zustand sync queue state
      const pendingCount = localDb.getPendingCount();
      useSyncStore.getState().setPendingCount(pendingCount);
      setPendingSyncCount(pendingCount);

      console.log('Venta completada de forma atómica. Tx UUID:', result.saleId);

      // Trigger background sync worker to process FIFO queue if online
      syncWorker.triggerManualSync();

      /* La impresión va después de que la venta esté registrada y nunca la
         revierte: si la impresora falla, el cobro sigue siendo válido y lo que
         se dice es que no salió el ticket, no que la venta se perdió. */
      if (isPrintingAvailable()) {
        void (async () => {
          const outcome = await printSaleTicket({
            ticketNumber: transaction_id.slice(0, 8).toUpperCase(),
            dateText: new Date(timestamp).toLocaleString('es-BO'),
            companyName: settings.companyName,
            companyNit: settings.companyNit,
            customerName:
              selectedCustomer.id !== 'default-public' ? selectedCustomer.businessName : undefined,
            paperWidth: settings.paperWidth,
            items: cartItemsToTicketLines(items),
            subtotal,
            discount: discountAmount,
            total,
            payments: paymentBreakdown.map((p) => ({
              method: p.payment_method,
              amountReceived: p.amount_received,
              changeGiven: p.change_given,
            })),
          });

          if (!outcome.printed) {
            toast(`Venta registrada, pero no se imprimió el ticket: ${outcome.reason}`, 'warning');
          } else if (paymentBreakdown.some((p) => p.payment_method === 'CASH')) {
            await openCashDrawer();
          }
        })();
      }

      setTimeout(() => {
        setIsProcessing(false);
        clearCart();
        resetPosCycle();
        setSignature(null);
        onSuccess();
        onClose();
      }, 400);
    } catch (error) {
      /* Antes esto era un `alert()` del navegador: bloquea la terminal, no se
         puede leer con el cajón abierto y en modo quiosco parece que la
         aplicación se ha roto. El sistema de avisos ya existía. */
      const reason = error instanceof Error ? error.message : String(error);
      console.error('Fallo al registrar la venta local:', error);
      toast(`No se pudo registrar la venta: ${reason}`, 'danger');
      setIsProcessing(false);
    }
  };

  const METHODS = [
    { id: 'CASH', label: 'Efectivo', icon: <DollarSign className="w-4 h-4" /> },
    { id: 'CARD', label: 'Tarjeta', icon: <CreditCard className="w-4 h-4" /> },
    { id: 'QR', label: 'QR', icon: <QrCode className="w-4 h-4" /> },
    { id: 'MIXED', label: 'Mixto', icon: <Layers className="w-4 h-4" /> },
  ] as const;

  const quickCash = Array.from(
    new Set([
      total,
      Math.ceil(total / 10) * 10,
      Math.ceil(total / 50) * 50,
      Math.ceil(total / 100) * 100,
    ]),
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<CreditCard className="w-4 h-4" />}
      title="Procesar cobro"
      subtitle={`${selectedCustomer.businessName} · NIT ${selectedCustomer.taxId}`}
      size="lg"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="success"
            size="lg"
            loading={isProcessing}
            disabled={!canFinish}
            onClick={handleProcessPayment}
            icon={!isProcessing ? <CheckCircle2 className="w-4 h-4" /> : undefined}
          >
            {isProcessing ? 'Procesando…' : 'Finalizar venta'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Total dominante: es la cifra que decide la acción */}
        <div className="p-4 rounded-lg bg-sunken border border-line space-y-1.5">
          <div className="flex justify-between text-body text-ink-2">
            <span>Subtotal bruto</span>
            <Money value={subtotal} size="body" className="text-ink-2" />
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-body text-danger">
              <span>
                Descuento ({customerDiscountRate}% cliente + {manualDiscount}% manual)
              </span>
              <Money value={-discountAmount} size="body" />
            </div>
          )}
          <div className="flex items-end justify-between gap-3 pt-2 border-t border-line-strong">
            <span className="text-micro uppercase text-ink-2 pb-1.5">Total a cobrar</span>
            <Money value={total} size="display" className="text-ink" />
          </div>
        </div>

        {/* El panel de firma queda por debajo del pliegue en una pantalla de
            portátil: sin este aviso arriba, «Finalizar venta» aparece
            deshabilitado sin motivo visible. */}
        {needsSignature && !signature && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-warn-soft border border-warn/30 text-body text-warn-ink">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            Venta a empresa sobre 500 Bs: pida el conforme firmado más abajo antes de finalizar.
          </div>
        )}

        {/* Método de pago */}
        <div className="space-y-2">
          <p className="text-micro uppercase text-ink-2">Método de pago</p>
          <div className="grid grid-cols-4 gap-2">
            {METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaymentMethod(m.id)}
                className={cn(
                  'h-16 flex flex-col items-center justify-center gap-1 rounded-md border',
                  'text-body font-semibold transition-colors duration-fast ease-ease',
                  paymentMethod === m.id
                    ? 'bg-accent-soft border-accent/40 text-accent-ink'
                    : 'bg-raised border-line text-ink-2 hover:border-line-strong hover:text-ink',
                )}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'CASH' && (
          <div className="space-y-3 p-4 rounded-lg bg-sunken border border-line">
            <Input
              label="Efectivo recibido"
              type="number"
              step="1"
              autoFocus
              value={cashGiven || ''}
              onChange={(e) => setCashGiven(parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              inputSize="display"
              className="[&_input]:text-center"
            />

            <div className="grid grid-cols-4 gap-2">
              {quickCash.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setCashGiven(amt)}
                  className="h-touch rounded-md bg-raised border border-line-strong font-mono tnum text-base font-bold text-ink-2 hover:border-accent hover:text-accent transition-colors duration-fast ease-ease"
                >
                  ${amt}
                </button>
              ))}
            </div>

            <div className="flex items-end justify-between gap-3 pt-3 border-t border-line-strong">
              <span className="text-micro uppercase text-ink-2 pb-1.5">Vuelto</span>
              <Money
                value={change}
                size="display"
                className={change > 0 ? 'text-ok' : 'text-ink'}
              />
            </div>
          </div>
        )}

        {paymentMethod === 'MIXED' && (
          <div className="space-y-3 p-4 rounded-lg bg-sunken border border-line">
            <div className="grid grid-cols-3 gap-2">
              <Input
                label="Efectivo"
                type="number"
                step="0.01"
                value={cashAmount || ''}
                onChange={(e) =>
                  setMixedAmounts(parseFloat(e.target.value) || 0, cardAmount, qrAmount)
                }
                placeholder="0.00"
                className="[&_input]:text-center [&_input]:font-mono"
              />
              <Input
                label="Tarjeta"
                type="number"
                step="0.01"
                value={cardAmount || ''}
                onChange={(e) =>
                  setMixedAmounts(cashAmount, parseFloat(e.target.value) || 0, qrAmount)
                }
                placeholder="0.00"
                className="[&_input]:text-center [&_input]:font-mono"
              />
              <Input
                label="QR"
                type="number"
                step="0.01"
                value={qrAmount || ''}
                onChange={(e) =>
                  setMixedAmounts(cashAmount, cardAmount, parseFloat(e.target.value) || 0)
                }
                placeholder="0.00"
                className="[&_input]:text-center [&_input]:font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-line-strong text-body">
              <span className="text-ink-2">Cubierto</span>
              <span className={cn('font-semibold', isCovered ? 'text-ok' : 'text-danger')}>
                <Money value={totalPaid} size="body" /> / <Money value={total} size="body" />
                {!isCovered && (
                  <>
                    {' '}
                    · falta <Money value={total - totalPaid} size="body" />
                  </>
                )}
              </span>
            </div>
          </div>
        )}

        {isNamedCustomer && (
          <div className="space-y-2 p-4 rounded-lg bg-sunken border border-line">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-micro uppercase text-ink-2">Conforme de entrega</p>
              <Badge tone={needsSignature ? 'warning' : 'neutral'}>
                {needsSignature ? 'Obligatorio' : 'Opcional'}
              </Badge>
            </div>
            <SignaturePad
              value={signature}
              onChange={setSignature}
              label={`Firma de ${selectedCustomer.businessName}`}
              hint={
                needsSignature
                  ? 'Sobre 500 Bs a nombre de una empresa, la firma queda con el ticket. Sin ella no se puede finalizar.'
                  : 'Queda archivada con el ticket si el cliente firma.'
              }
            />
          </div>
        )}

        {!isCovered && (
          <div className="flex items-start gap-2 p-3 rounded-md bg-warn-soft border border-warn/30 text-body text-warn-ink">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            Monto insuficiente. Finalizar venta se habilita al cubrir el total.
          </div>
        )}
      </div>
    </Modal>
  );
};
