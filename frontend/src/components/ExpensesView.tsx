import React, { useState } from 'react';
import {
  DollarSign,
  Plus,
  Search,
  TrendingDown,
  Lock,
  Printer,
  Eye,
  RefreshCw,
} from 'lucide-react';

interface OperationalExpense {
  id: string; // EXP-5001
  date: string;
  category: 'Servicios Básicos' | 'Alquileres' | 'Mantenimiento' | 'Suministros' | 'Publicidad';
  description: string;
  account: 'Caja Chica' | 'Banco Central' | 'Transferencia QR';
  amount: number;
  ref_number?: string;
  user_name: string;
  receipt_attached: boolean;
}

export const ExpensesView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'petty-cash'>('expenses');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [, setIsTopUpModalOpen] = useState(false);
  const [, setSelectedExpense] = useState<OperationalExpense | null>(null);

  // Form State
  const [category, setCategory] = useState<
    'Servicios Básicos' | 'Alquileres' | 'Mantenimiento' | 'Suministros' | 'Publicidad'
  >('Servicios Básicos');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [account, setAccount] = useState<'Caja Chica' | 'Banco Central' | 'Transferencia QR'>(
    'Caja Chica',
  );
  const [refNumber, setRefNumber] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');

  // Petty Cash Fund State
  const [fixedFund] = useState(500.0);

  // Mock Expenses Data
  const [expenses, setExpenses] = useState<OperationalExpense[]>([
    {
      id: 'EXP-5001',
      date: '14/08/2026 10:30',
      category: 'Servicios Básicos',
      description: 'Pago mensual de servicio de internet de alta velocidad',
      account: 'Caja Chica',
      amount: 180.0,
      ref_number: 'REC-90482',
      user_name: 'Juan Pérez',
      receipt_attached: true,
    },
    {
      id: 'EXP-5002',
      date: '12/08/2026 15:10',
      category: 'Suministros',
      description: 'Compra de bolsas biodegradables y papel para tickets térmicos',
      account: 'Caja Chica',
      amount: 65.5,
      ref_number: 'FAC-30219',
      user_name: 'María Gómez',
      receipt_attached: true,
    },
    {
      id: 'EXP-5003',
      date: '08/08/2026 09:00',
      category: 'Alquileres',
      description: 'Alquiler mensual del local comercial sucursal central',
      account: 'Banco Central',
      amount: 3500.0,
      ref_number: 'TRANS-884920',
      user_name: 'Administrador',
      receipt_attached: true,
    },
  ]);

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch =
      exp.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      exp.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || exp.category === categoryFilter;
    const matchesAccount = accountFilter === 'ALL' || exp.account === accountFilter;
    return matchesSearch && matchesCategory && matchesAccount;
  });

  const totalPettyCashSpent = expenses
    .filter((e) => e.account === 'Caja Chica')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const availablePettyCash = fixedFund - (totalPettyCashSpent % fixedFund);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount) return;
    if (supervisorPin !== '1234' && supervisorPin !== '0000') {
      alert('⚠️ PIN de supervisor incorrecto (Pruebe PIN: 1234)');
      return;
    }

    const newExp: OperationalExpense = {
      id: `EXP-${Math.floor(5000 + Math.random() * 900)}`,
      date: new Date().toLocaleString('es-ES'),
      category,
      description,
      account,
      amount: parseFloat(amount),
      ref_number: refNumber || 'REC-AUTOGET',
      user_name: 'Juan Pérez (Cajero)',
      receipt_attached: true,
    };

    setExpenses((prev) => [newExp, ...prev]);
    setIsExpenseModalOpen(false);
    setDescription('');
    setAmount('');
    setRefNumber('');
    setSupervisorPin('');
    alert(
      `✅ Gasto registrado correctamente. Monto -$${newExp.amount.toFixed(2)} descontado síncronamente de ${newExp.account}.`,
    );
  };

  return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <DollarSign className="w-7 h-7 text-accent" />
            Gastos y Egresos Operativos ERP
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Registro de egresos operativos, categorización de pérdidas/ganancias y control de fondo
            fijo de caja chica
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center bg-sunken p-1.5 rounded-md border border-line">
          <button
            onClick={() => setActiveSubTab('expenses')}
            className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'expenses' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <TrendingDown className="w-4 h-4" />
            Historial de Gastos
          </button>
          <button
            onClick={() => setActiveSubTab('petty-cash')}
            className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'petty-cash' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Fondo Fijo Caja Chica
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: EXPENSES LIST */}
      {activeSubTab === 'expenses' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-raised p-4 rounded-md border border-line shadow-e1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por # Folio o Descripción..."
                className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-md text-body text-ink focus:border-accent font-semibold"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:outline-none"
              >
                <option value="ALL">Todas las Categorías</option>
                <option value="Servicios Básicos">Servicios Básicos</option>
                <option value="Alquileres">Alquileres</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Suministros">Suministros</option>
                <option value="Publicidad">Publicidad</option>
              </select>

              <select
                value={accountFilter}
                onChange={(e) => setAccountFilter(e.target.value)}
                className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:outline-none"
              >
                <option value="ALL">Todas las Cuentas</option>
                <option value="Caja Chica">Caja Chica</option>
                <option value="Banco Central">Banco Central</option>
                <option value="Transferencia QR">Transferencia QR</option>
              </select>

              <button
                onClick={() => setIsExpenseModalOpen(true)}
                className="px-4 py-2 bg-danger hover:opacity-90 text-white rounded-md text-body font-extrabold flex items-center gap-2 shadow-e1 transition-all"
              >
                <Plus className="w-4 h-4" />
                Nuevo Gasto
              </button>
            </div>
          </div>

          <div className="bg-raised rounded-md border border-line shadow-e1 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                  <th className="p-4"># Folio Gasto</th>
                  <th className="p-4">Fecha & Hora</th>
                  <th className="p-4">Categoría Contable</th>
                  <th className="p-4">Descripción del Egreso</th>
                  <th className="p-4">Cuenta de Origen</th>
                  <th className="p-4 font-mono text-right">Monto ($)</th>
                  <th className="p-4 text-right">Registrado Por</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-body">
                {filteredExpenses.map((exp) => {
                  const categoryBadge = {
                    'Servicios Básicos':
                      'bg-accent-soft text-accent-ink dark:bg-accent-soft border-accent/30',
                    Alquileres:
                      'bg-accent-soft text-accent-ink dark:bg-accent-soft border-accent/30',
                    Mantenimiento: 'bg-warn-soft text-warn-ink dark:bg-warn-soft border-warn/30',
                    Suministros: 'bg-ok-soft text-ok-ink dark:bg-ok-soft border-ok/30',
                    Publicidad: 'bg-pink-100 text-pink-800 dark:bg-pink-950 border-pink-200',
                  }[exp.category];

                  return (
                    <tr key={exp.id} className="hover:bg-sunken">
                      <td className="p-4 font-mono font-extrabold text-accent">
                        {exp.id}
                        <span className="block text-micro text-ink-3 font-normal">
                          Ref: {exp.ref_number}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-ink-2">{exp.date}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded-md text-micro font-bold border ${categoryBadge}`}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-ink max-w-xs truncate">
                        {exp.description}
                      </td>
                      <td className="p-4 font-bold text-ink-2">{exp.account}</td>
                      <td className="p-4 font-mono font-black text-danger text-right text-base">
                        -${exp.amount.toFixed(2)}
                      </td>
                      <td className="p-4 text-right font-bold text-ink-2">{exp.user_name}</td>
                      <td className="p-4 text-right space-x-1">
                        <button
                          onClick={() => setSelectedExpense(exp)}
                          className="p-1.5 text-accent hover:bg-accent-soft rounded-md"
                          title="Ver Comprobante Adjunto"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-1.5 text-ok hover:bg-ok-soft rounded-md"
                          title="Imprimir Recibo"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PETTY CASH MANAGER */}
      {activeSubTab === 'petty-cash' && (
        <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-ok" /> Control y Reposición de Fondo Fijo de Caja
                Chica
              </h3>
              <p className="text-body text-ink-3">
                Administración de recargas y rendimiento de vales auxiliares
              </p>
            </div>
            <button
              onClick={() => setIsTopUpModalOpen(true)}
              className="px-4 py-2 bg-ok hover:opacity-90 text-white rounded-md font-bold text-body flex items-center gap-2 shadow"
            >
              <Plus className="w-4 h-4" /> Solicitar Reposición de Fondo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 bg-sunken rounded-md border border-line">
              <span className="text-body text-ink-3 font-bold">Fondo Fijo Asignado</span>
              <p className="font-mono font-black text-display text-accent mt-1">
                ${fixedFund.toFixed(2)}
              </p>
            </div>

            <div className="p-5 bg-sunken rounded-md border border-line">
              <span className="text-body text-ink-3 font-bold">Egresos Ejecutados en el Turno</span>
              <p className="font-mono font-black text-display text-danger mt-1">
                -${totalPettyCashSpent.toFixed(2)}
              </p>
            </div>

            <div className="p-5 bg-ok-soft rounded-md border border-ok/30 dark:border-ok/30">
              <span className="text-body text-ok-ink font-bold">
                Saldo Disponible para Reposición
              </span>
              <p className="font-mono font-black text-display text-ok mt-1">
                ${availablePettyCash.toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* EXPENSE FORM MODAL (ExpenseFormModal) */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-lg overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-danger" /> Registro de Nuevo Gasto Operativo
              </h3>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="text-ink-3 hover:text-ink-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="p-5 space-y-4 text-body">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-2">Categoría Contable *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as typeof category)}
                    className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold"
                  >
                    <option value="Servicios Básicos">Servicios Básicos</option>
                    <option value="Alquileres">Alquileres</option>
                    <option value="Mantenimiento">Mantenimiento</option>
                    <option value="Suministros">Suministros</option>
                    <option value="Publicidad">Publicidad</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-ink-2">Cuenta de Origen *</label>
                  <select
                    value={account}
                    onChange={(e) => setAccount(e.target.value as typeof account)}
                    className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold"
                  >
                    <option value="Caja Chica">Caja Chica</option>
                    <option value="Banco Central">Banco Central</option>
                    <option value="Transferencia QR">Transferencia QR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-ink-2">Descripción del Egreso *</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ej. Pago de factura de internet o insumos de oficina"
                  className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-2">Monto del Egreso ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-mono font-bold text-base text-danger"
                  />
                </div>

                <div>
                  <label className="font-bold text-ink-2"># Recibo / Factura</label>
                  <input
                    type="text"
                    value={refNumber}
                    onChange={(e) => setRefNumber(e.target.value)}
                    placeholder="FAC-10092"
                    className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-ink-2 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-warn" /> PIN Autorización Supervisor *
                </label>
                <input
                  type="password"
                  required
                  value={supervisorPin}
                  onChange={(e) => setSupervisorPin(e.target.value)}
                  placeholder="PIN Supervisor (1234)"
                  className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-mono text-center font-bold text-base"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="px-4 py-2 bg-sunken text-ink rounded-md font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-danger hover:opacity-90 text-white rounded-md font-extrabold shadow"
                >
                  Confirmar & Descontar Egreso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
