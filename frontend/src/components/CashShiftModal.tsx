import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Eye, Lock, Unlock } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { useSalesStore } from '../store/useSalesStore';
import { Badge, Button, ImageUpload, Input, Modal, Money, Textarea, cn } from '../ui';

interface CashShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashShiftModal: React.FC<CashShiftModalProps> = ({ isOpen, onClose }) => {
  const { cashShift, openCashShift, closeCashShift } = usePosStore();
  const [openingAmount, setOpeningAmount] = useState('200.00');
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [countPhoto, setCountPhoto] = useState<string | null>(null);
  // El arqueo es ciego hasta aquí: el esperado no existe en pantalla mientras
  // se cuenta. Revelarlo antes convierte el conteo en una copia del sistema.
  const [revealed, setRevealed] = useState(false);

  const isShiftOpen = cashShift !== null;

  const counted = parseFloat(closingAmount) || 0;
  /* El efectivo del turno sale de los tickets, no de la cola de
     sincronización: la cola se vacía al sincronizar, así que en cuanto las
     ventas subían al servidor el esperado caía y el cierre acusaba al cajero de
     un faltante que era la recaudación entera. */
  const cashSince = useSalesStore((state) => state.cashSince);
  const cashSales = isShiftOpen ? cashSince(cashShift.openedAt) : 0;
  const expected = isShiftOpen ? cashShift.initialFloat + cashSales : 0;
  const difference = counted - expected;
  const isBalanced = Math.abs(difference) < 0.01;

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    openCashShift(parseFloat(openingAmount) || 200.0);
    onClose();
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revealed) {
      setRevealed(true);
      return;
    }
    closeCashShift(counted, notes);
    setRevealed(false);
    setClosingAmount('');
    setCountPhoto(null);
    setNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<Clock className="w-4 h-4" />}
      title="Turno y arqueo de caja"
      /* Con el turno cerrado el modal es un bloqueo, no un aviso. */
      dismissable={isShiftOpen}
      size="md"
      footer={
        isShiftOpen ? (
          <Button
            form="shift-close"
            type="submit"
            variant={revealed ? 'danger' : 'primary'}
            disabled={closingAmount.trim() === ''}
            icon={revealed ? <Lock className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          >
            {revealed ? 'Confirmar cierre' : 'Ver descuadre'}
          </Button>
        ) : (
          <Button
            form="shift-open"
            type="submit"
            variant="success"
            size="lg"
            icon={<CheckCircle2 className="w-4 h-4" />}
          >
            Abrir turno
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between px-4 h-12 rounded-md bg-sunken border border-line">
          <span className="text-base text-ink-2">Estado del turno</span>
          {isShiftOpen ? (
            <Badge tone="success" size="md" icon={<Unlock className="w-3.5 h-3.5" />}>
              Abierta · <Money value={cashShift.initialFloat} size="body" />
            </Badge>
          ) : (
            <Badge tone="danger" size="md" icon={<Lock className="w-3.5 h-3.5" />}>
              Cerrado
            </Badge>
          )}
        </div>

        {!isShiftOpen ? (
          <form id="shift-open" onSubmit={handleOpenShift} className="space-y-4">
            <p className="text-base text-ink-2 leading-relaxed">
              Declare el fondo de caja inicial con el que abre la atención en esta terminal.
            </p>
            <Input
              label="Fondo inicial de efectivo"
              type="number"
              step="0.01"
              required
              autoFocus
              value={openingAmount}
              onChange={(e) => setOpeningAmount(e.target.value)}
              inputSize="display"
              className="[&_input]:text-center"
            />
          </form>
        ) : (
          <form id="shift-close" onSubmit={handleCloseShift} className="space-y-4">
            <Input
              label="Conteo físico final (arqueo ciego)"
              hint={
                revealed
                  ? 'Cifra bloqueada: se declaró antes de ver el esperado.'
                  : 'Cuente el efectivo antes de ver el total esperado del sistema.'
              }
              type="number"
              step="0.01"
              required
              autoFocus
              /* Una vez revelado el esperado, el conteo queda fijo. Si se pudiera
                 retocar aquí, el arqueo dejaría de ser ciego en la práctica. */
              readOnly={revealed}
              placeholder="0.00"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              inputSize="display"
              className={cn('[&_input]:text-center', revealed && '[&_input]:text-ink-2')}
            />
            <ImageUpload
              value={countPhoto}
              onChange={setCountPhoto}
              label="Foto del efectivo contado"
              hint="Un descuadre se discute días después; la foto, no."
              preview="lg"
              maxSize={1200}
            />

            {revealed && (
              <div className="space-y-2 p-4 rounded-lg bg-sunken border border-line">
                <p className="text-micro uppercase text-ink-2">Desglose esperado</p>
                <div className="flex justify-between text-body text-ink-2">
                  <span>Fondo inicial</span>
                  <Money value={cashShift.initialFloat} size="body" className="text-ink-2" />
                </div>
                <div className="flex justify-between text-body text-ink-2">
                  <span>Ventas en efectivo del turno</span>
                  <Money value={cashSales} size="body" className="text-ink-2" />
                </div>
                <div className="flex justify-between text-body pt-2 border-t border-line">
                  <span className="text-ink-2">Esperado en gaveta</span>
                  <Money value={expected} size="body" className="text-ink" />
                </div>
                <div className="flex justify-between text-body">
                  <span className="text-ink-2">Contado</span>
                  <Money value={counted} size="body" className="text-ink" />
                </div>
                <div className="flex items-end justify-between gap-3 pt-2 border-t border-line-strong">
                  <span
                    className={cn(
                      'text-micro uppercase pb-1.5',
                      isBalanced ? 'text-ink-2' : 'text-danger',
                    )}
                  >
                    {isBalanced ? 'Cuadra' : difference > 0 ? 'Sobrante' : 'Faltante'}
                  </span>
                  <Money
                    value={difference}
                    size="title"
                    className={isBalanced ? 'text-ok' : 'text-danger'}
                  />
                </div>
                {!isBalanced && (
                  <p className="flex items-start gap-1.5 text-body text-danger">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Explique el descuadre en las observaciones antes de confirmar.
                  </p>
                )}
              </div>
            )}

            <Textarea
              label="Observaciones del cierre"
              rows={3}
              required={revealed && !isBalanced}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Cierre de turno sin novedades…"
            />
          </form>
        )}
      </div>
    </Modal>
  );
};
