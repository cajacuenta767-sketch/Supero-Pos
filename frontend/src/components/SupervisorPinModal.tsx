import React, { useEffect, useState } from 'react';
import { Check, Lock, ShieldCheck } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { Button, Input, Modal } from '../ui';

interface SupervisorPinModalProps {
  isOpen: boolean;
  targetDiscountPercentage: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen, targetDiscountPercentage, onClose, onSuccess,
}) => {
  const { setManualDiscount } = usePosStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError('');
    }
  }, [isOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = setManualDiscount(targetDiscountPercentage, pin);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setError('');
    onSuccess();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<ShieldCheck className="w-4 h-4" />}
      title="Autorización de supervisor"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button form="pin-form" type="submit" variant="danger" icon={<Check className="w-4 h-4" />}>
            Autorizar
          </Button>
        </>
      }
    >
      <form id="pin-form" onSubmit={submit} className="space-y-4">
        <p className="text-base text-ink-2 leading-relaxed">
          El descuento solicitado (<strong className="font-mono tnum text-danger">{targetDiscountPercentage}%</strong>)
          supera el límite del 10% permitido a cajeros.
        </p>
        <Input
          label="PIN de supervisor"
          hint="PIN por defecto en modo demo: 1234"
          type="password"
          maxLength={6}
          autoFocus
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          leading={<Lock className="w-4 h-4" />}
          placeholder="••••"
          error={error || undefined}
          inputSize="lg"
          className="[&_input]:text-center [&_input]:font-mono [&_input]:tracking-[0.4em]"
        />
      </form>
    </Modal>
  );
};
