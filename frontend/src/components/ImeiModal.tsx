import React, { useState } from 'react';
import { Check, ShieldAlert } from 'lucide-react';
import { Button, Modal, ScanField } from '../ui';
import { imeiError } from '../utils/imei';

interface ImeiModalProps {
  isOpen: boolean;
  productName: string;
  onConfirm: (serial: string) => void;
  onClose: () => void;
}

/**
 * Un producto serializado no siempre es un teléfono: una batería o un motor
 * llevan número de serie del fabricante, sin estructura fija. Por eso el IMEI
 * solo se valida cuando el código parece uno —15 dígitos, con o sin el prefijo
 * `IMEI-`— y el resto pasa como serie genérica.
 */
const asImei = (raw: string): string | null => {
  const body = raw.trim().replace(/^IMEI[-\s]?/i, '');
  // Exactamente 15 dígitos. Con menos aún se está tecleando, o es la serie de
  // otra cosa: marcar en rojo el segundo dígito de un IMEI a medio escribir es
  // ruido, no ayuda.
  return /^\d{15}$/.test(body) ? body : null;
};

/** Se monta solo mientras el modal está abierto: cada apertura arranca con
 * el campo limpio sin necesidad de un efecto que resetee el estado. */
const ImeiForm: React.FC<{ onConfirm: (serial: string) => void }> = ({ onConfirm }) => {
  const [serial, setSerial] = useState('');
  const [error, setError] = useState('');

  const numeric = asImei(serial);
  const liveError = numeric !== null ? imeiError(numeric) : undefined;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (serial.trim().length < 5) {
      setError('Escanee o digite un IMEI/serie válido (mínimo 5 caracteres).');
      return;
    }
    if (liveError) {
      setError(liveError);
      return;
    }
    setError('');
    onConfirm(serial.trim());
  };

  return (
    <form id="imei-form" onSubmit={submit} className="space-y-4">
      <p className="text-base text-ink-2 leading-relaxed">
        Este producto requiere trazabilidad estricta por número de serie antes de entrar al ticket.
      </p>
      <ScanField
        label="Escanear con pistola, cámara o digitar el código"
        autoFocus
        value={serial}
        onChange={(value) => {
          setSerial(value);
          setError('');
        }}
        placeholder="354892019482910"
        error={error || liveError}
        hint={
          numeric !== null && !liveError
            ? 'IMEI válido: dígito de control correcto.'
            : 'Los IMEI de 15 dígitos se verifican solos; otras series se aceptan tal cual.'
        }
        inputSize="display"
      />
    </form>
  );
};

export const ImeiModal: React.FC<ImeiModalProps> = ({
  isOpen,
  productName,
  onConfirm,
  onClose,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    icon={<ShieldAlert className="w-4 h-4" />}
    title="Captura de IMEI / serie"
    subtitle={productName}
    size="md"
    footer={
      <>
        <Button variant="ghost" onClick={onClose}>
          Cancelar
        </Button>
        <Button form="imei-form" type="submit" icon={<Check className="w-4 h-4" />}>
          Confirmar
        </Button>
      </>
    }
  >
    {isOpen && <ImeiForm onConfirm={onConfirm} />}
  </Modal>
);
