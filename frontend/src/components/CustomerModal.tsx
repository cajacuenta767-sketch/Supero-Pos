import React, { useState } from 'react';
import { UserCheck, Plus, Search, Check, X } from 'lucide-react';
import { usePosStore, Customer, DEFAULT_CUSTOMER } from '../store/usePosStore';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SAMPLE_CUSTOMERS: Customer[] = [
  DEFAULT_CUSTOMER,
  { id: 'c-1', businessName: 'Comercial Bolivia S.R.L.', taxId: '1029384029', group: 'MAYORISTA', discountPercentage: 0 },
  { id: 'c-2', businessName: 'Tech Solutions Corp', taxId: '4920194821', group: 'VIP', discountPercentage: 5 },
  { id: 'c-3', businessName: 'Distribuidora Oriental', taxId: '7748192019', group: 'MAYORISTA', discountPercentage: 0 },
  { id: 'c-4', businessName: 'María Rodríguez (VIP)', taxId: '4829102', group: 'VIP', discountPercentage: 5 },
];

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose }) => {
  const { setCustomer, selectedCustomer } = usePosStore();
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    businessName: '',
    taxId: '',
    group: 'GENERAL' as 'GENERAL' | 'MAYORISTA' | 'VIP',
  });

  if (!isOpen) return null;

  const filtered = SAMPLE_CUSTOMERS.filter(
    (c) =>
      c.businessName.toLowerCase().includes(search.toLowerCase()) ||
      c.taxId.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = (customer: Customer) => {
    setCustomer(customer);
    onClose();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.businessName || !newCustomer.taxId) return;

    const discountRate = newCustomer.group === 'VIP' ? 5 : 0;
    const created: Customer = {
      id: `c-${Date.now()}`,
      businessName: newCustomer.businessName,
      taxId: newCustomer.taxId,
      group: newCustomer.group,
      discountPercentage: discountRate,
    };

    SAMPLE_CUSTOMERS.push(created);
    setCustomer(created);
    setIsCreating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#121212] border border-gray-200 dark:border-[#1F2833] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#1F2833] pb-3">
          <div className="flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <UserCheck className="w-5 h-5" />
            <h3 className="font-bold text-lg text-gray-900 dark:text-white">Selección / Alta Rápida de Cliente</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!isCreating ? (
          <>
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar cliente por NIT/RUC o Razón Social..."
                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-xl text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {/* Quick Add Button */}
            <button
              onClick={() => setIsCreating(true)}
              className="w-full py-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold flex items-center justify-center space-x-1 hover:bg-blue-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Registrar Nuevo Cliente Rápido</span>
            </button>

            {/* Customer List */}
            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(c)}
                  className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
                    selectedCustomer.id === c.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-gray-50 dark:bg-[#0B0C10] border-gray-200 dark:border-[#1F2833] text-gray-900 dark:text-white hover:border-blue-400'
                  }`}
                >
                  <div>
                    <div className="font-bold text-xs">{c.businessName}</div>
                    <div className="text-[11px] opacity-80">NIT/RUC: {c.taxId}</div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {c.group === 'VIP' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-400 text-black">
                        VIP 5%
                      </span>
                    )}
                    {c.group === 'MAYORISTA' && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-200 text-purple-900">
                        MAYORISTA
                      </span>
                    )}
                    {selectedCustomer.id === c.id && <Check className="w-4 h-4" />}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* New Customer Form */
          <form onSubmit={handleCreateSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Nombre / Razón Social:
              </label>
              <input
                type="text"
                required
                autoFocus
                value={newCustomer.businessName}
                onChange={(e) => setNewCustomer({ ...newCustomer, businessName: e.target.value })}
                placeholder="Ej. Distribuidora Central"
                className="w-full p-2 bg-gray-50 dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                NIT / RUC / Cédula:
              </label>
              <input
                type="text"
                required
                value={newCustomer.taxId}
                onChange={(e) => setNewCustomer({ ...newCustomer, taxId: e.target.value })}
                placeholder="Ej. 1029482019"
                className="w-full p-2 bg-gray-50 dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Grupo de Cliente:
              </label>
              <select
                value={newCustomer.group}
                onChange={(e) => setNewCustomer({ ...newCustomer, group: e.target.value as any })}
                className="w-full p-2 bg-gray-50 dark:bg-[#0B0C10] border border-gray-300 dark:border-gray-700 rounded-lg text-xs text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="GENERAL">General (Sin descuento)</option>
                <option value="MAYORISTA">Mayorista (Precios volumen)</option>
                <option value="VIP">VIP (5% descuento automático)</option>
              </select>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="w-1/2 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300"
              >
                Volver
              </button>
              <button
                type="submit"
                className="w-1/2 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              >
                Guardar Cliente
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
