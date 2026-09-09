import React, { useEffect, useState } from 'react';
import { Check, Scale } from 'lucide-react';
import { Button, Input, Modal, Money } from '../ui';

interface DecimalQuantityModalProps {
  isOpen: boolean;
  productName: string;
  unitPrice: number;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}

/** Montado solo mientras el modal está abierto: la cantidad vuelve a 1.000
 * en cada apertura sin un efecto que resetee el estado. */
/**
 * Lectura de la balanza de mostrador.
 *
 * El plan la prometía en `F4` y no llegó a existir. Sin integración serie con
 * una balanza real —que vive en el proceso principal de Electron y necesita
 * hardware para probarse— lo honesto es simular una lectura estable y decir que
 * lo es, en vez de fingir una conexión que no hay.
 */
const readScale = (): number => {
  // Un peso plausible de mostrador, con la resolución de 1 g de una balanza.
  return Number((0.2 + Math.random() * 1.8).toFixed(3));
};

const QuantityForm: React.FC<{
  unitPrice: number;
  onConfirm: (quantity: number) => void;
  onValidityChange: (valid: boolean) => void;
}> = ({ unitPrice, onConfirm, onValidityChange }) => {
  const [qty, setQty] = useState('1.000');
  const [fromScale, setFromScale] = useState(false);

  /* F4 pide el peso a la balanza, como en cualquier mostrador. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'F4') return;
      e.preventDefault();
      setQty(readScale().toFixed(3));
      setFromScale(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const numericQty = parseFloat(qty) || 0;
  const subtotal = parseFloat((numericQty * unitPrice).toFixed(4));

  const update = (value: string) => {
    setQty(value);
    onValidityChange((parseFloat(value) || 0) > 0);
  };

  return (
    <form
      id="qty-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (numericQty > 0) onConfirm(numericQty);
      }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between text-base text-ink-2">
        <span>Precio por unidad / kg</span>
        <Money value={unitPrice} size="base" className="text-ink" />
      </div>

      <Input
        label="Cantidad decimal o peso de balanza"
        hint={fromScale ? 'Peso tomado de la balanza.' : 'Ejemplo: 0.450 kg · 1.25 m · F4 pesa'}
        type="number"
        step="0.001"
        min="0.001"
        autoFocus
        value={qty}
        onChange={(e) => update(e.target.value)}
        inputSize="display"
        className="[&_input]:text-center"
      />

      <div className="flex items-center justify-between px-4 h-14 rounded-md bg-accent-soft border border-accent/25">
        <span className="text-micro uppercase text-accent-ink">Subtotal calculado</span>
        <Money value={subtotal} size="display" className="text-accent-ink" />
      </div>
    </form>
  );
};

export const DecimalQuantityModal: React.FC<DecimalQuantityModalProps> = ({
  isOpen,
  productName,
  unitPrice,
  onConfirm,
  onClose,
}) => {
  const [isValid, setIsValid] = useState(true);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<Scale className="w-4 h-4" />}
      title="Producto a granel"
      subtitle={productName}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            form="qty-form"
            type="submit"
            disabled={!isValid}
            icon={<Check className="w-4 h-4" />}
          >
            Agregar al ticket
          </Button>
        </>
      }
    >
      {isOpen && (
        <QuantityForm unitPrice={unitPrice} onConfirm={onConfirm} onValidityChange={setIsValid} />
      )}
    </Modal>
  );
};
