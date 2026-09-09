import React, { useState } from 'react';
import { CheckCircle2, Clock, Lock, Unlock } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { Badge, Button, Input, Modal, Money, Textarea } from '../ui';

interface CashShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CashShiftModal: React.FC<CashShiftModalProps> = ({ isOpen, onClose }) => {
  const { cashShift, openCashShift, closeCashShift } = usePosStore();
  const [openingAmount, setOpeningAmount] = useState('200.00');
  const [closingAmount, setClosingAmount] = useState('');
  const [notes, setNotes] = useState('');

  const isShiftOpen = cashShift !== null;

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    openCashShift(parseFloat(openingAmount) || 200.0);
    onClose();
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    closeCashShift(parseFloat(closingAmount) || 0, notes);
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
          <Button form="shift-close" type="submit" variant="danger" icon={<Lock className="w-4 h-4" />}>
            Cerrar turno
          </Button>
        ) : (
          <Button form="shift-open" type="submit" variant="success" size="lg" icon={<CheckCircle2 className="w-4 h-4" />}>
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
            <Badge tone="danger" size="md" icon={<Lock className="w-3.5 h-3.5" />}>Cerrado</Badge>
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
              hint="Cuente el efectivo antes de ver el total esperado del sistema."
              type="number"
              step="0.01"
              required
              autoFocus
              placeholder="0.00"
              value={closingAmount}
              onChange={(e) => setClosingAmount(e.target.value)}
              inputSize="display"
              className="[&_input]:text-center"
            />
            <Textarea
              label="Observaciones del cierre"
              rows={3}
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
