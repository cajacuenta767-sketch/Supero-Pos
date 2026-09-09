import { usePersistentState } from '../store/persist';
import { useAuthStore } from '../store/useAuthStore';
import { useSalesStore } from '../store/useSalesStore';
import { toCents, fromCents } from '../utils/money';
import React, { useMemo, useState } from 'react';
import {
  CreditCard,
  DollarSign,
  Building2,
  QrCode,
  ArrowRightLeft,
  ShieldCheck,
  Lock,
  Unlock,
} from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Money,
  PageHeader,
  Select,
  StatTile,
  Tabs,
  Toolbar,
  ToolbarSelect,
  useToast,
} from '../ui';
import { formatDateTime } from '../utils/dates';
import { useViewShortcuts } from '../hooks/useViewShortcuts';
import { useDebounced } from '../hooks/useDebounced';
import type { Column, TabItem } from '../ui';

type SubTab = 'treasury' | 'drawers' | 'banks';

const TABS: TabItem[] = [
  { id: 'treasury', label: 'Consolidado', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'drawers', label: 'Cajas físicas', icon: <DollarSign className="w-4 h-4" /> },
  { id: 'banks', label: 'Bancos y QR', icon: <Building2 className="w-4 h-4" /> },
];

/* Los enums de base de datos no se muestran crudos al usuario. */
const OPERATION_LABEL: Record<FinancialTransaction['operation_type'], string> = {
  DEPOSIT_CASH_TO_BANK: 'Depósito a banco',
  /* Era «Venta con tarjeta» para todo cobro, así que un pago por QR y uno en
     efectivo aparecían como tarjeta. La columna de origen y destino ya dice por
     dónde entró el dinero; la etiqueta solo tiene que decir qué es. */
  POS_SALE_CREDIT: 'Cobro de venta',
  PETTY_CASH_EXPENSE: 'Gasto de caja chica',
  FEE_COMMISSION: 'Comisión',
};

const OPERATION_TONE: Record<
  FinancialTransaction['operation_type'],
  'accent' | 'success' | 'warning' | 'neutral'
> = {
  DEPOSIT_CASH_TO_BANK: 'accent',
  POS_SALE_CREDIT: 'success',
  PETTY_CASH_EXPENSE: 'warning',
  FEE_COMMISSION: 'neutral',
};

const ACCOUNT_LABEL: Record<PaymentAccount['type'], string> = {
  CASH_DRAWER: 'Caja física',
  BANK_ACCOUNT: 'Cuenta bancaria',
  QR_GATEWAY: 'Pasarela QR',
};

const ACCOUNT_STATUS: Record<PaymentAccount['status'], string> = {
  OPEN: 'Abierta',
  LOCKED: 'Bloqueada',
  RECONCILIATION_PENDING: 'Pendiente de conciliar',
};

interface PaymentAccount {
  id: string;
  name: string;
  type: 'CASH_DRAWER' | 'BANK_ACCOUNT' | 'QR_GATEWAY';
  account_number?: string;
  /* No hay campo de moneda: la terminal opera en una sola, la de los ajustes.
     Estaba declarado, sembrado a 'USD' —con la interfaz mostrando bolivianos— y
     no lo leía nadie. */
  balance: number;
  status: 'OPEN' | 'LOCKED' | 'RECONCILIATION_PENDING';
  fee_percentage?: number;
  in_transit_balance?: number;
  branch: string;
}

interface FinancialTransaction {
  id: string; // TX-9001
  /** Instante en ISO. Ordenar por el texto «14/08/2026» pone el 14 de agosto
   *  antes que el 2 de septiembre. */
  at: string;
  source_account: string;
  dest_account: string;
  amount: number;
  fee_deducted: number;
  operation_type:
    'DEPOSIT_CASH_TO_BANK' | 'POS_SALE_CREDIT' | 'PETTY_CASH_EXPENSE' | 'FEE_COMMISSION';
  voucher_number?: string;
  user_name: string;
}

export const FinanceView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'drawers' | 'banks' | 'deposits' | 'treasury'>(
    'treasury',
  );

  // Payment Accounts State
  /* Quien mueve dinero entre cuentas queda nombrado. Estaba escrito
     «Administrador» pasara lo que pasara. */
  const operator = useAuthStore((state) => state.user);
  const operatorName = operator?.name ?? operator?.username ?? 'Sin identificar';

  const [accounts, setAccounts] = usePersistentState<PaymentAccount[]>('cuentas', [
    {
      id: 'ACC-01',
      name: 'Caja 1 - Principal Mostrador',
      type: 'CASH_DRAWER',
      balance: 1028.5,
      status: 'OPEN',
      branch: 'Sucursal Central',
    },
    {
      id: 'ACC-02',
      name: 'Caja 2 - Expres Rápida',
      type: 'CASH_DRAWER',
      balance: 450.0,
      status: 'OPEN',
      branch: 'Sucursal Central',
    },
    {
      id: 'ACC-03',
      name: 'Banco Mercantil Santa Cruz (Cta Cte)',
      type: 'BANK_ACCOUNT',
      account_number: '4010-948201-92',
      balance: 42500.0,
      status: 'OPEN',
      branch: 'Oficina Central',
    },
    {
      id: 'ACC-04',
      name: 'Pasarela Digital QR BCP',
      type: 'QR_GATEWAY',
      account_number: 'QR-BCP-MERCHANT-88',
      balance: 3450.0,
      fee_percentage: 1.5,
      in_transit_balance: 450.0,
      status: 'OPEN',
      branch: 'Digital',
    },
    {
      id: 'ACC-05',
      name: 'Red Enlace Tarjetas POS',
      type: 'QR_GATEWAY',
      account_number: 'POS-REDENLACE-55',
      balance: 8900.0,
      fee_percentage: 2.0,
      in_transit_balance: 0.0,
      status: 'OPEN',
      branch: 'Digital',
    },
  ]);

  // Financial Audit Ledger (financial_transactions_log)
  const [transactions, setTransactions] = usePersistentState<FinancialTransaction[]>(
    'movimientos',
    [
      {
        id: 'TX-9004',
        at: '2026-08-14T12:10:00.000Z',
        source_account: 'Caja 1 - Principal Mostrador',
        dest_account: 'Banco Mercantil Santa Cruz',
        amount: 500.0,
        fee_deducted: 0,
        operation_type: 'DEPOSIT_CASH_TO_BANK',
        voucher_number: 'BOL-884920',
        user_name: 'Juan Pérez',
      },
      {
        id: 'TX-9003',
        at: '2026-08-14T11:45:00.000Z',
        source_account: 'Cliente Final',
        dest_account: 'Pasarela Digital QR BCP',
        amount: 145.0,
        fee_deducted: 2.18,
        operation_type: 'POS_SALE_CREDIT',
        voucher_number: 'QR-VAL-1029',
        user_name: 'María Gómez',
      },
      {
        id: 'TX-9002',
        at: '2026-08-14T09:30:00.000Z',
        source_account: 'Caja 1 - Principal Mostrador',
        dest_account: 'Proveedor Suministros',
        amount: 35.5,
        fee_deducted: 0,
        operation_type: 'PETTY_CASH_EXPENSE',
        voucher_number: 'REC-3011',
        user_name: 'Juan Pérez',
      },
    ],
  );

  // Deposit Form State (Caja -> Banco)
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [sourceAccountId, setSourceAccountId] = useState('ACC-01');
  const [destAccountId, setDestAccountId] = useState('ACC-03');
  const [depositAmount, setDepositAmount] = useState('');
  const [voucherNumber, setVoucherNumber] = useState('');

  // Toggle Remote Drawer Lock

  // Liquidity Aggregation

  const toast = useToast();

  /* F2 lleva el foco al buscador. */
  useViewShortcuts({});
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  /* El filtro corría en cada pulsación sobre la lista entera. */
  const searchDebounced = useDebounced(search);

  const cashTotal = accounts
    .filter((a) => a.type === 'CASH_DRAWER')
    .reduce((s, a) => s + a.balance, 0);
  const bankTotal = accounts
    .filter((a) => a.type === 'BANK_ACCOUNT')
    .reduce((s, a) => s + a.balance, 0);
  const gatewayTotal = accounts
    .filter((a) => a.type === 'QR_GATEWAY')
    .reduce((s, a) => s + a.balance, 0);
  /* El total líquido es la suma de los otros tres, no un dato aparte. */
  const liquidTotal = cashTotal + bankTotal + gatewayTotal;

  /* Las ventas cobradas por tarjeta y QR nunca llegaban aquí: se cobraba en la
     terminal y el libro de cuentas no se enteraba. Ahora se derivan de los
     tickets, con la comisión de la pasarela que corresponda, y se mezclan con
     los traspasos que sí nacen en esta pantalla. */
  const tickets = useSalesStore((state) => state.tickets);

  const saleCredits = useMemo<FinancialTransaction[]>(() => {
    const gateways = accounts.filter((a) => a.type === 'QR_GATEWAY');
    const qrAccount = gateways.find((a) => /qr/i.test(a.name)) ?? gateways[0];
    const cardAccount = gateways.find((a) => /tarjeta|enlace/i.test(a.name)) ?? gateways[0];
    const drawer = accounts.find((a) => a.type === 'CASH_DRAWER');

    return tickets
      .filter((t) => t.status === 'COMPLETED')
      .flatMap((t) =>
        t.payments.map((pay, index): FinancialTransaction => {
          const account =
            pay.method === 'QR' ? qrAccount : pay.method === 'CARD' ? cardAccount : drawer;
          const net = pay.amount_received - pay.change_given;
          const fee = account?.fee_percentage
            ? fromCents(Math.round(toCents(net) * (account.fee_percentage / 100)))
            : 0;
          return {
            id: `${t.id}-${index + 1}`,
            at: t.at,
            source_account: t.customer_name ?? 'Cliente final',
            dest_account: account?.name ?? 'Sin cuenta asignada',
            amount: net,
            fee_deducted: fee,
            operation_type: 'POS_SALE_CREDIT',
            voucher_number: t.id,
            user_name: t.cashier_name,
          };
        }),
      );
  }, [tickets, accounts]);

  /* Un solo libro, ordenado por instante. */
  const allTx = useMemo(
    () => [...transactions, ...saleCredits].sort((a, b) => b.at.localeCompare(a.at)),
    [transactions, saleCredits],
  );

  const filteredTx = allTx.filter((t) => {
    const q = searchDebounced.toLowerCase();
    const matchesSearch =
      t.id.toLowerCase().includes(q) ||
      t.source_account.toLowerCase().includes(q) ||
      t.dest_account.toLowerCase().includes(q) ||
      (t.voucher_number ?? '').toLowerCase().includes(q);
    const matchesType = typeFilter === 'ALL' || t.operation_type === typeFilter;
    return matchesSearch && matchesType;
  });

  const toggleDrawerLock = (id: string) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id ? { ...a, status: a.status === 'LOCKED' ? 'OPEN' : 'LOCKED' } : a,
      ),
    );
  };

  const confirmDeposit = () => {
    const value = parseFloat(depositAmount) || 0;
    if (value <= 0 || value > cashTotal) return;
    const source = accounts.find((a) => a.id === sourceAccountId);
    const dest = accounts.find((a) => a.id === destAccountId);
    setTransactions((prev) => [
      {
        id: `TX-${9000 + prev.length + 2}`,
        at: new Date().toISOString(),
        source_account: source?.name ?? '',
        dest_account: dest?.name ?? '',
        amount: value,
        fee_deducted: 0,
        operation_type: 'DEPOSIT_CASH_TO_BANK',
        voucher_number: voucherNumber || undefined,
        user_name: operatorName,
      },
      ...prev,
    ]);
    /* El traspaso movía el asiento y no el dinero: se depositaban Bs 500 en el
       banco, la operación aparecía en la lista y el efectivo en gavetas seguía
       exactamente igual. Un libro de cuentas que no cuadra consigo mismo. */
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.id === sourceAccountId)
          return { ...a, balance: fromCents(toCents(a.balance) - toCents(value)) };
        if (a.id === destAccountId)
          return { ...a, balance: fromCents(toCents(a.balance) + toCents(value)) };
        return a;
      }),
    );

    setDepositAmount('');
    setVoucherNumber('');
    setIsDepositModalOpen(false);
    toast(
      `Depósito de ${value.toFixed(2)} · ${source?.name ?? ''} → ${dest?.name ?? ''}`,
      'success',
    );
  };

  /* Anchos declarados: ninguna cabecera debe partirse en dos líneas. */
  const txColumns: Array<Column<FinancialTransaction>> = [
    {
      key: 'id',
      header: 'Transacción',
      width: '130px',
      render: (t) => <span className="font-mono text-body text-ink">{t.id}</span>,
    },
    {
      key: 'date',
      header: 'Fecha',
      width: '170px',
      sortValue: (t) => t.at,
      render: (t) => (
        <span className="font-mono tnum text-body text-ink-2">{formatDateTime(t.at)}</span>
      ),
    },
    {
      key: 'op',
      header: 'Operación',
      card: 'title',
      width: '200px',
      render: (t) => (
        <Badge tone={OPERATION_TONE[t.operation_type]}>{OPERATION_LABEL[t.operation_type]}</Badge>
      ),
    },
    {
      key: 'route',
      header: 'Origen y destino',
      render: (t) => (
        <div className="min-w-0">
          <p className="text-body text-ink-2 truncate">{t.source_account}</p>
          <p className="flex items-center gap-1.5 text-base text-ink truncate">
            <ArrowRightLeft className="w-3.5 h-3.5 shrink-0 text-ink-3" />
            {t.dest_account}
          </p>
        </div>
      ),
    },
    {
      key: 'amount',
      sortValue: (t) => t.amount,
      header: 'Monto',
      card: 'meta',
      align: 'right',
      width: '130px',
      render: (t) => <Money value={t.amount} size="base" className="text-ink" />,
    },
    {
      key: 'fee',
      header: 'Comisión',
      align: 'right',
      width: '120px',
      render: (t) =>
        t.fee_deducted > 0 ? (
          <Money value={-t.fee_deducted} size="body" className="text-danger" />
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
    {
      key: 'voucher',
      header: 'Comprobante',
      align: 'right',
      width: '150px',
      render: (t) => (
        <span className="font-mono text-body text-ink-3">{t.voucher_number ?? '—'}</span>
      ),
    },
  ];

  const accountColumns: Array<Column<PaymentAccount>> = [
    {
      key: 'name',
      header: 'Cuenta',
      render: (a) => (
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink truncate">{a.name}</p>
          <p className="text-body text-ink-3 truncate">{a.branch}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Tipo',
      width: '170px',
      render: (a) => <Badge>{ACCOUNT_LABEL[a.type]}</Badge>,
    },
    {
      key: 'status',
      header: 'Estado',
      width: '190px',
      render: (a) => (
        <Badge
          tone={a.status === 'OPEN' ? 'success' : a.status === 'LOCKED' ? 'danger' : 'warning'}
        >
          {ACCOUNT_STATUS[a.status]}
        </Badge>
      ),
    },
    {
      key: 'balance',
      header: 'Saldo',
      align: 'right',
      width: '150px',
      render: (a) => <Money value={a.balance} size="base" className="text-ink" />,
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '60px',
      render: (a) =>
        a.type === 'CASH_DRAWER' ? (
          <IconButton
            label={`${a.status === 'LOCKED' ? 'Desbloquear' : 'Bloquear'} ${a.name}`}
            tone={a.status === 'LOCKED' ? 'danger' : 'neutral'}
            onClick={() => toggleDrawerLock(a.id)}
          >
            {a.status === 'LOCKED' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </IconButton>
        ) : null,
    },
  ];

  const visibleAccounts =
    activeSubTab === 'drawers'
      ? accounts.filter((a) => a.type === 'CASH_DRAWER')
      : accounts.filter((a) => a.type !== 'CASH_DRAWER');

  return (
    <div className="h-full overflow-y-auto bg-canvas select-none">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        <PageHeader
          title="Cuentas"
          subtitle="Cajas físicas, cuentas bancarias y pasarelas digitales, con su libro de movimientos."
          actions={
            <Button
              icon={<ArrowRightLeft className="w-4 h-4" />}
              onClick={() => setIsDepositModalOpen(true)}
            >
              Depósito a banco
            </Button>
          }
          tabs={
            <Tabs
              items={TABS}
              value={activeSubTab}
              onChange={(id) => setActiveSubTab(id as SubTab)}
              label="Secciones de cuentas"
            />
          }
        />

        {/* Cuatro indicadores iguales: el destacado se marca con tono, no
            pintando la tarjeta entera del color de marca. */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatTile
            label="Efectivo en cajas"
            value={<Money value={cashTotal} size="display" />}
            hint="acumulado en gavetas"
            icon={<DollarSign className="w-4 h-4" />}
          />
          <StatTile
            label="Fondos en banco"
            value={<Money value={bankTotal} size="display" />}
            hint="acreditado"
            icon={<Building2 className="w-4 h-4" />}
          />
          <StatTile
            label="Pasarelas y QR"
            value={<Money value={gatewayTotal} size="display" />}
            hint="neto tras comisiones"
            icon={<QrCode className="w-4 h-4" />}
          />
          <StatTile
            label="Total líquido"
            value={<Money value={liquidTotal} size="display" />}
            hint="suma de las tres anteriores"
            icon={<ShieldCheck className="w-4 h-4" />}
            tone="accent"
          />
        </div>

        {activeSubTab === 'treasury' ? (
          <div className="space-y-4">
            <Toolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Buscar por transacción, cuenta o comprobante…"
              filters={
                <ToolbarSelect
                  aria-label="Tipo de operación"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="ALL">Todas las operaciones</option>
                  {(
                    Object.keys(OPERATION_LABEL) as Array<FinancialTransaction['operation_type']>
                  ).map((k) => (
                    <option key={k} value={k}>
                      {OPERATION_LABEL[k]}
                    </option>
                  ))}
                </ToolbarSelect>
              }
            />
            <DataTable
              caption="Cuentas de la empresa y su saldo disponible"
              columns={txColumns}
              rows={filteredTx}
              pageSize={25}
              rowKey={(t) => t.id}
              empty={
                <EmptyState
                  icon={<ArrowRightLeft className="w-6 h-6" />}
                  title="Sin movimientos que coincidan"
                  hint="Ajuste la búsqueda o el filtro de operación."
                />
              }
            />
          </div>
        ) : (
          <DataTable
            caption="Movimientos financieros por operación, cuenta e importe"
            columns={accountColumns}
            rows={visibleAccounts}
            rowKey={(a) => a.id}
            empty={
              <EmptyState
                icon={<CreditCard className="w-6 h-6" />}
                title="Sin cuentas registradas"
              />
            }
          />
        )}
      </div>

      {/* Depósito caja → banco */}
      <Modal
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        icon={<ArrowRightLeft className="w-4 h-4" />}
        title="Depósito de caja a banco"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsDepositModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={
                !depositAmount ||
                parseFloat(depositAmount) <= 0 ||
                parseFloat(depositAmount) > cashTotal
              }
              onClick={confirmDeposit}
            >
              Registrar depósito
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between px-4 h-12 rounded-md bg-sunken border border-line">
            <span className="text-base text-ink-2">Efectivo disponible</span>
            <Money value={cashTotal} size="base" className="text-ink" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Desde"
              value={sourceAccountId}
              onChange={(e) => setSourceAccountId(e.target.value)}
            >
              {accounts
                .filter((a) => a.type === 'CASH_DRAWER')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
            <Select
              label="Hacia"
              value={destAccountId}
              onChange={(e) => setDestAccountId(e.target.value)}
            >
              {accounts
                .filter((a) => a.type === 'BANK_ACCOUNT')
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </Select>
          </div>

          <Input
            label="Importe"
            type="number"
            step="0.01"
            min={0}
            max={cashTotal}
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            error={
              depositAmount && parseFloat(depositAmount) > cashTotal
                ? 'El importe supera el efectivo disponible.'
                : undefined
            }
            inputSize="display"
            className="[&_input]:text-center"
          />

          <Input
            label="Número de boleta"
            value={voucherNumber}
            onChange={(e) => setVoucherNumber(e.target.value)}
            placeholder="BOL-000000"
            className="[&_input]:font-mono"
          />
        </div>
      </Modal>
    </div>
  );
};
