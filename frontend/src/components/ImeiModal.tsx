import React, { useState } from 'react';
import { ShieldAlert, QrCode, Check } from 'lucide-react';

interface ImeiModalProps {
  isOpen: boolean;
  productName: string;
  onConfirm: (serial: string) => void;
  onClose: () => void;
}

export const ImeiModal: React.FC<ImeiModalProps> = ({ isOpen, productName, onConfirm, onClose }) => {
  const [serialInput, setSerialInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serialInput.trim() || serialInput.length < 5) {
      setError('Debe ingresar o escanear un IMEI/Serie válido (mínimo 5 caracteres)');
      return;
    }
    setError('');
    onConfirm(serialInput.trim());
    setSerialInput('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400 border-b border-gray-200 dark:border-[#1F2833] pb-3">
          <ShieldAlert className="w-6 h-6" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Captura Obligatoria de IMEI / Serie</h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          El producto <strong className="text-gray-900 dark:text-white">{productName}</strong> requiere trazabilidad estricta por número de serie antes de agregarlo al ticket.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Escanear con Pistola o Digitar Código IMEI:
            </label>
            <div className="relative">
              <QrCode className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={serialInput}
                onChange={(e) => setSerialInput(e.target.value)}
                placeholder="Ej. IMEI-354892019482910"
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
            {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-black flex items-center space-x-1"
            >
              <Check className="w-4 h-4 mr-1" /> Confirmar IMEI
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
