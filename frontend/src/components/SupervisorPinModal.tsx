import React, { useState } from 'react';
import { Check, Lock, ShieldCheck } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';
import { Button, Input, Modal } from '../ui';

interface SupervisorPinModalProps {
  isOpen: boolean;
  targetDiscountPercentage: number;
  onClose: () => void;
  onSuccess: () => void;
}

/** Montado solo mientras el modal está abierto: el PIN nunca sobrevive a un
 * cierre, sin necesidad de un efecto que limpie el estado. */
const PinForm: React.FC<{
  targetDiscountPercentage: number;
  onAuthorized: () => void;
}> = ({ targetDiscountPercentage, onAuthorized }) => {
  const { setManualDiscount } = usePosStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = setManualDiscount(targetDiscountPercentage, pin);
    if (!result.success) {
      setError(result.message);
      return;
    }
    setError('');
    onAuthorized();
  };

  return (
    <form id="pin-form" onSubmit={submit} className="space-y-4">
      <p className="text-base text-ink-2 leading-relaxed">
        El descuento solicitado (
        <strong className="font-mono tnum text-danger">{targetDiscountPercentage}%</strong>) supera
        el límite del 10% permitido a cajeros.
      </p>
      <Input
        label="PIN de supervisor"
        hint="Lo custodia el responsable de tienda."
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
  );
};

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen,
  targetDiscountPercentage,
  onClose,
  onSuccess,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    icon={<ShieldCheck className="w-4 h-4" />}
    title="Autorización de supervisor"
    size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button form="pin-form" type="submit" variant="danger" icon={<Check className="w-4 h-4" />}>
          Autorizar
        </Button>
      </>
    }
  >
    {isOpen && (
      <PinForm
        targetDiscountPercentage={targetDiscountPercentage}
        onAuthorized={() => {
          onSuccess();
          onClose();
        }}
      />
    )}
  </Modal>
);
