import React, { useState } from 'react';
import { Scale, Check } from 'lucide-react';

interface DecimalQuantityModalProps {
  isOpen: boolean;
  productName: string;
  unitPrice: number;
  onConfirm: (quantity: number) => void;
  onClose: () => void;
}

export const DecimalQuantityModal: React.FC<DecimalQuantityModalProps> = ({
  isOpen, productName, unitPrice, onConfirm, onClose
}) => {
  const [qtyInput, setQtyInput] = useState('1.000');

  if (!isOpen) return null;

  const numericQty = parseFloat(qtyInput) || 0;
  const calculatedSubtotal = parseFloat((numericQty * unitPrice).toFixed(4));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (numericQty <= 0) return;
    onConfirm(numericQty);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-xl max-w-md w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 border-b border-gray-200 dark:border-[#1F2833] pb-3">
          <Scale className="w-6 h-6" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Ingreso de Producto Fraccionado (A Granel)</h3>
        </div>

        <p className="text-sm text-gray-600 dark:text-gray-300">
          Producto: <strong className="text-gray-900 dark:text-white">{productName}</strong>
          <br />
          Precio por Unidad/Kg: <span className="font-mono text-blue-600 dark:text-blue-400">${unitPrice.toFixed(2)}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Cantidad Decimal / Peso Balanza (Ej. 0.450 kg o 1.25 m):
            </label>
            <input
              type="number"
              step="0.001"
              min="0.001"
              autoFocus
              value={qtyInput}
              onChange={(e) => setQtyInput(e.target.value)}
              className="w-full text-center py-3 bg-gray-50 dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-lg text-2xl font-bold font-mono text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-lg flex items-center justify-between border border-blue-100 dark:border-blue-900/50">
            <span className="text-xs font-semibold text-blue-900 dark:text-blue-200">Subtotal Calculado:</span>
            <span className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">${calculatedSubtotal.toFixed(2)}</span>
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
              className="px-5 py-2 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-1"
            >
              <Check className="w-4 h-4 mr-1" /> Agregar al Carrito
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
