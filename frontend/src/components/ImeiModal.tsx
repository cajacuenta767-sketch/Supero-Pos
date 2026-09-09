import React, { useState } from 'react';
import { Check, ShieldAlert } from 'lucide-react';
import { Button, Modal, ScanField } from '../ui';
import { imeiError } from '../utils/imei';
import { useCatalogStore } from '../store/useCatalogStore';

interface ImeiModalProps {
  isOpen: boolean;
  productName: string;
  /** Producto del catálogo: la serie se comprueba contra su inventario. */
  productId: number;
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
const ImeiForm: React.FC<{ productId: number; onConfirm: (serial: string) => void }> = ({
  productId,
  onConfirm,
}) => {
  const [serial, setSerial] = useState('');
  const [error, setError] = useState('');
  const checkSerial = useCatalogStore((state) => state.checkSerial);
  const available = useCatalogStore((state) => state.availableSerials(productId));

  const numeric = asImei(serial);
  const liveError = numeric !== null ? imeiError(numeric) : undefined;
  /* Validar la forma no basta: había que comprobar que el aparato existe y está
     disponible, o se podía vender dos veces el mismo, o uno que nunca entró. */
  const stockError = numeric && !liveError ? checkSerial(productId, numeric) : undefined;

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
    const problem = checkSerial(productId, numeric ?? serial.trim());
    if (problem) {
      setError(problem);
      return;
    }
    setError('');
    onConfirm(numeric ?? serial.trim());
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
        error={error || liveError || stockError}
        hint={
          numeric !== null && !liveError && !stockError
            ? 'Serie válida y disponible en el almacén.'
            : `${available.length} ${available.length === 1 ? 'unidad disponible' : 'unidades disponibles'} de este producto.`
        }
        inputSize="display"
      />

      {/* Las series disponibles a la vista: teclear quince dígitos cuando quedan
          tres unidades es trabajo que nadie tiene por qué hacer. */}
      {available.length > 0 && available.length <= 8 && (
        <div className="space-y-1.5">
          <p className="text-micro uppercase text-ink-3">En almacén</p>
          <div className="flex flex-wrap gap-1.5">
            {available.map((s) => (
              <button
                key={s.serialNumber}
                type="button"
                onClick={() => {
                  setSerial(s.serialNumber);
                  setError('');
                }}
                className="px-2 h-7 rounded-sm border border-line bg-raised font-mono text-body text-ink-2 hover:border-accent hover:text-accent transition-colors duration-[--t-fast]"
              >
                {s.serialNumber}
              </button>
            ))}
          </div>
        </div>
      )}
    </form>
  );
};

export const ImeiModal: React.FC<ImeiModalProps> = ({
  isOpen,
  productName,
  productId,
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
    {isOpen && <ImeiForm productId={productId} onConfirm={onConfirm} />}
  </Modal>
);
