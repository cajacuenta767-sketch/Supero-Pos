import React, { useState } from 'react';
import { ShieldCheck, Lock, Check } from 'lucide-react';
import { usePosStore } from '../store/usePosStore';

interface SupervisorPinModalProps {
  isOpen: boolean;
  targetDiscountPercentage: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen,
  targetDiscountPercentage,
  onClose,
  onSuccess,
}) => {
  const { setManualDiscount } = usePosStore();
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = setManualDiscount(targetDiscountPercentage, pinInput);
    if (!result.success) {
      setErrorMsg(result.message);
      return;
    }
    setErrorMsg('');
    setPinInput('');
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 border-b border-gray-200 dark:border-[#1F2833] pb-3">
          <ShieldCheck className="w-6 h-6" />
          <h3 className="font-bold text-lg text-gray-900 dark:text-white">Autorización de Supervisor</h3>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-300">
          El descuento manual solicitado (
          <strong className="text-rose-500 font-mono text-sm">{targetDiscountPercentage}%</strong>) supera el límite
          permitido para cajeros (10%).
          <br />
          Ingrese el PIN de Supervisor para autorizar.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              PIN de Supervisor (Por defecto: 1234):
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="password"
                maxLength={6}
                autoFocus
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                placeholder="••••"
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-xl text-center text-lg font-bold font-mono tracking-widest text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            {errorMsg && <p className="text-xs text-rose-500 mt-1 font-semibold">{errorMsg}</p>}
          </div>

          <div className="flex space-x-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="w-1/2 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center space-x-1"
            >
              <Check className="w-4 h-4 mr-1" /> Autorizar PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
