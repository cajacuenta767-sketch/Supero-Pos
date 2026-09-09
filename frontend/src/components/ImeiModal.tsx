import React, { useEffect, useState } from 'react';
import { Check, QrCode, ShieldAlert } from 'lucide-react';
import { Button, Input, Modal } from '../ui';

interface ImeiModalProps {
  isOpen: boolean;
  productName: string;
  onConfirm: (serial: string) => void;
  onClose: () => void;
}

export const ImeiModal: React.FC<ImeiModalProps> = ({ isOpen, productName, onConfirm, onClose }) => {
  const [serial, setSerial] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSerial('');
      setError('');
    }
  }, [isOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (serial.trim().length < 5) {
      setError('Escanee o digite un IMEI/serie válido (mínimo 5 caracteres).');
      return;
    }
    setError('');
    onConfirm(serial.trim());
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<ShieldAlert className="w-4 h-4" />}
      title="Captura de IMEI / serie"
      subtitle={productName}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button form="imei-form" type="submit" icon={<Check className="w-4 h-4" />}>Confirmar</Button>
        </>
      }
    >
      <form id="imei-form" onSubmit={submit} className="space-y-4">
        <p className="text-base text-ink-2 leading-relaxed">
          Este producto requiere trazabilidad estricta por número de serie antes de entrar al ticket.
        </p>
        <Input
          label="Escanear con pistola o digitar el código"
          leading={<QrCode className="w-4 h-4" />}
          autoFocus
          value={serial}
          onChange={(e) => setSerial(e.target.value)}
          placeholder="IMEI-354892019482910"
          error={error || undefined}
          inputSize="display"
        />
      </form>
    </Modal>
  );
};
