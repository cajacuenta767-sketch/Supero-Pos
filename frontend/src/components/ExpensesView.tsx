import { usePersistentState } from '../store/persist';
import React, { useState } from 'react';
import { DollarSign, Plus, TrendingDown, Lock, RefreshCw } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Input,
  Meter,
  ImageUpload,
  Modal,
  Money,
  PhotoThumb,
  PageHeader,
  Select,
  StatTile,
  Tabs,
  Textarea,
  Toolbar,
  ToolbarSelect,
  useToast,
} from '../ui';
import { formatDateTime } from '../utils/dates';
import { useViewShortcuts } from '../hooks/useViewShortcuts';
import { useDebounced } from '../hooks/useDebounced';
import type { Column, TabItem } from '../ui';

type SubTab = 'expenses' | 'petty-cash';

const TABS: TabItem[] = [
  { id: 'expenses', label: 'Gastos', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'petty-cash', label: 'Caja chica', icon: <RefreshCw className="w-4 h-4" /> },
];

const CATEGORIES: Array<OperationalExpense['category']> = [
  'Servicios Básicos',
  'Alquileres',
  'Mantenimiento',
  'Suministros',
  'Publicidad',
];

const ACCOUNTS: Array<OperationalExpense['account']> = [
  'Caja Chica',
  'Banco Central',
  'Transferencia QR',
];

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
  /** Foto del comprobante. `receipt_attached` decía que existía; esto lo guarda. */
  receipt_photo?: string;
}

export const ExpensesView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'expenses' | 'petty-cash'>('expenses');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  /* El filtro corría en cada pulsación sobre la lista entera. */
  const searchQueryDebounced = useDebounced(searchQuery);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [accountFilter, setAccountFilter] = useState('ALL');

  // Modals
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [, setIsTopUpModalOpen] = useState(false);

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
  const [receiptPhoto, setReceiptPhoto] = useState<string | null>(null);
  const [supervisorPin, setSupervisorPin] = useState('');

  // Petty Cash Fund State
  const [fixedFund] = useState(500.0);

  // Mock Expenses Data
  const [expenses, setExpenses] = usePersistentState<OperationalExpense[]>('gastos', [
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

  const toast = useToast();

  /* F2 lleva el foco al buscador, «N» abre el alta. */
  useViewShortcuts({ onNew: () => setIsExpenseModalOpen(true) });

  const filteredExpenses = expenses.filter((exp) => {
    const q = searchQueryDebounced.toLowerCase();
    const matchesSearch =
      exp.id.toLowerCase().includes(q) ||
      exp.description.toLowerCase().includes(q) ||
      exp.user_name.toLowerCase().includes(q);
    const matchesCategory = categoryFilter === 'ALL' || exp.category === categoryFilter;
    const matchesAccount = accountFilter === 'ALL' || exp.account === accountFilter;
    return matchesSearch && matchesCategory && matchesAccount;
  });

  const total = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const pettySpent = expenses
    .filter((e) => e.account === 'Caja Chica')
    .reduce((s, e) => s + e.amount, 0);
  const pettyRemaining = Math.max(0, fixedFund - pettySpent);

  /* Desglose por categoría: la barra dice qué pesa más antes de leer cifras. */
  const byCategory = CATEGORIES.map((c) => ({
    category: c,
    amount: expenses.filter((e) => e.category === c).reduce((s, e) => s + e.amount, 0),
  })).sort((a, b) => b.amount - a.amount);
  const maxCategory = Math.max(1, ...byCategory.map((c) => c.amount));
  const topCategory = byCategory[0];

  const saveExpense = () => {
    const value = parseFloat(amount) || 0;
    if (!description.trim() || value <= 0) return;
    setExpenses((prev) => [
      {
        id: `EXP-${5000 + prev.length + 1}`,
        date: formatDateTime(new Date()),
        category,
        description: description.trim(),
        account,
        amount: value,
        ref_number: refNumber || undefined,
        user_name: 'Administrador',
        receipt_attached: !!refNumber || !!receiptPhoto,
        receipt_photo: receiptPhoto ?? undefined,
      },
      ...prev,
    ]);
    setDescription('');
    setAmount('');
    setRefNumber('');
    setReceiptPhoto(null);
    setSupervisorPin('');
    setIsExpenseModalOpen(false);
    toast('Gasto registrado', 'success');
  };

  const columns: Array<Column<OperationalExpense>> = [
    {
      key: 'date',
      sortValue: (e) => e.date,
      header: 'Fecha',
      width: '170px',
      render: (e) => <span className="font-mono tnum text-body text-ink-2">{e.date}</span>,
    },
    {
      key: 'concept',
      header: 'Concepto',
      card: 'title',
      render: (e) => (
        <div className="min-w-0">
          <p className="text-base text-ink truncate">{e.description}</p>
          <p className="font-mono text-micro text-ink-3">{e.id}</p>
        </div>
      ),
    },
    {
      key: 'category',
      sortValue: (e) => e.category,
      header: 'Categoría',
      width: '180px',
      render: (e) => <Badge tone="accent">{e.category}</Badge>,
    },
    {
      key: 'account',
      header: 'Cuenta',
      width: '170px',
      render: (e) => <span className="text-body text-ink-2 truncate">{e.account}</span>,
    },
    {
      key: 'user',
      header: 'Responsable',
      width: '150px',
      render: (e) => <span className="text-body text-ink-2 truncate">{e.user_name}</span>,
    },
    {
      key: 'amount',
      sortValue: (e) => e.amount,
      header: 'Importe',
      card: 'meta',
      align: 'right',
      width: '130px',
      render: (e) => <Money value={e.amount} size="base" className="text-ink" />,
    },
    {
      key: 'receipt',
      header: 'Comprobante',
      align: 'right',
      width: '140px',
      card: 'meta',
      render: (e) =>
        e.receipt_attached ? (
          <span className="inline-flex items-center gap-2">
            <span className="font-mono text-body text-ink-3">{e.ref_number ?? '—'}</span>
            <PhotoThumb src={e.receipt_photo} alt={`Comprobante de ${e.description}`} />
          </span>
        ) : (
          <Badge tone="warning">Sin adjuntar</Badge>
        ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-canvas select-none">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        <PageHeader
          title="Gastos"
          subtitle="Egresos operativos por categoría y control del fondo de caja chica."
          actions={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsExpenseModalOpen(true)}>
              Registrar gasto
            </Button>
          }
          tabs={
            <Tabs
              items={TABS}
              value={activeSubTab}
              onChange={(id) => setActiveSubTab(id as SubTab)}
              label="Secciones de gastos"
            />
          }
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatTile
            label="Total del periodo"
            value={<Money value={total} size="display" />}
            hint={`${filteredExpenses.length} registros`}
            icon={<TrendingDown className="w-4 h-4" />}
            tone="warning"
          />
          <StatTile
            label="Mayor categoría"
            value={<Money value={topCategory?.amount ?? 0} size="display" />}
            hint={topCategory?.category}
            icon={<DollarSign className="w-4 h-4" />}
          />
          <StatTile
            label="Caja chica disponible"
            value={<Money value={pettyRemaining} size="display" />}
            hint={`de ${fixedFund.toFixed(2)} de fondo fijo`}
            icon={<RefreshCw className="w-4 h-4" />}
            tone={pettyRemaining < fixedFund * 0.2 ? 'danger' : 'success'}
          />
        </div>

        {activeSubTab === 'expenses' ? (
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5 items-start">
            <div className="space-y-4 min-w-0">
              <Toolbar
                search={searchQuery}
                onSearchChange={setSearchQuery}
                searchPlaceholder="Buscar por concepto, número o responsable…"
                filters={
                  <>
                    <ToolbarSelect
                      aria-label="Categoría"
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                    >
                      <option value="ALL">Todas las categorías</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </ToolbarSelect>
                    <ToolbarSelect
                      aria-label="Cuenta"
                      value={accountFilter}
                      onChange={(e) => setAccountFilter(e.target.value)}
                    >
                      <option value="ALL">Todas las cuentas</option>
                      {ACCOUNTS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </ToolbarSelect>
                  </>
                }
              />
              <DataTable
                caption="Gastos operativos por fecha, categoría y cuenta"
                columns={columns}
                rows={filteredExpenses}
                pageSize={25}
                rowKey={(e) => e.id}
                empty={
                  <EmptyState
                    icon={<DollarSign className="w-6 h-6" />}
                    title="Sin gastos que coincidan"
                    hint="Ajuste la búsqueda o los filtros."
                  />
                }
              />
            </div>

            <Card title="Peso por categoría" icon={<TrendingDown className="w-4 h-4" />}>
              <div className="space-y-4">
                {byCategory.map((c) => (
                  <Meter
                    key={c.category}
                    value={c.amount}
                    max={maxCategory}
                    label={c.category}
                    showLabel
                    hint={<Money value={c.amount} size="body" />}
                    tone={c === topCategory ? 'warning' : 'accent'}
                  />
                ))}
              </div>
            </Card>
          </div>
        ) : (
          <Card title="Fondo de caja chica" icon={<RefreshCw className="w-4 h-4" />}>
            <div className="space-y-4 max-w-xl">
              <Meter
                value={pettyRemaining}
                max={fixedFund}
                label="Disponible del fondo fijo"
                showLabel
                hint={
                  <>
                    <Money value={pettyRemaining} size="body" /> de{' '}
                    <Money value={fixedFund} size="body" />
                  </>
                }
                tone={pettyRemaining < fixedFund * 0.2 ? 'danger' : 'success'}
              />
              <p className="text-body text-ink-2 leading-relaxed">
                Al reponer el fondo se registra un movimiento de banco a caja chica en el módulo de
                cuentas, para que el saldo cuadre en ambos sitios.
              </p>
              <Button
                variant="secondary"
                icon={<RefreshCw className="w-4 h-4" />}
                onClick={() => setIsTopUpModalOpen(true)}
              >
                Reponer fondo
              </Button>
            </div>
          </Card>
        )}
      </div>

      {/* Alta de gasto */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        icon={<Plus className="w-4 h-4" />}
        title="Registrar gasto"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsExpenseModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!description.trim() || !(parseFloat(amount) > 0)}
              onClick={saveExpense}
            >
              Registrar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Categoría"
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
            <Select
              label="Cuenta de origen"
              value={account}
              onChange={(e) => setAccount(e.target.value as typeof account)}
            >
              {ACCOUNTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </div>

          <Textarea
            label="Concepto"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Qué se pagó y a quién…"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Importe"
              type="number"
              step="0.01"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="[&_input]:font-mono [&_input]:text-right"
            />
            <Input
              label="N.º de comprobante"
              hint="Opcional, pero recomendable para el arqueo."
              value={refNumber}
              onChange={(e) => setRefNumber(e.target.value)}
              className="[&_input]:font-mono"
            />
          </div>

          <ImageUpload
            value={receiptPhoto}
            onChange={setReceiptPhoto}
            label="Foto del comprobante"
            hint="El papel térmico se borra en meses; la foto no."
            preview="lg"
            maxSize={1200}
          />

          {account === 'Caja Chica' && parseFloat(amount) > pettyRemaining && (
            <p className="flex items-start gap-1.5 text-body text-danger">
              <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              El importe supera el saldo disponible de caja chica.
            </p>
          )}

          <Input
            label="PIN de supervisor"
            type="password"
            maxLength={6}
            value={supervisorPin}
            onChange={(e) => setSupervisorPin(e.target.value)}
            leading={<Lock className="w-4 h-4" />}
            placeholder="••••"
            className="[&_input]:font-mono [&_input]:tracking-[0.3em]"
          />
        </div>
      </Modal>
    </div>
  );
};
