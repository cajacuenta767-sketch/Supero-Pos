import React, { useState } from 'react';
import {
  History,
  Printer,
  RotateCcw,
  Eye,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  CreditCard,
  DollarSign,
  QrCode,
  Layers,
  Lock,
  AlertTriangle,
} from 'lucide-react';

import { useAuthStore } from '../store/useAuthStore';
import { hasPermission } from '../utils/permissions';
import {
  Badge,
  Button,
  DataTable,
  DescriptionList,
  EmptyState,
  IconButton,
  Input,
  Modal,
  Money,
  PageHeader,
  StatTile,
  Textarea,
  Toolbar,
  ToolbarSelect,
  useToast,
} from '../ui';
import { formatDateTime } from '../utils/dates';
import { useViewShortcuts } from '../hooks/useViewShortcuts';
import { useDebounced } from '../hooks/useDebounced';
import type { Column } from '../ui';
import { buildCsv, downloadCsv } from '../utils/exportCsv';
import { useCatalogStore } from '../store/useCatalogStore';
import { authorizeSupervisor } from '../utils/supervisorPin';
import { useSalesStore } from '../store/useSalesStore';
import { useSettingsStore } from '../store/useSettingsStore';
import { usePosStore } from '../store/usePosStore';
import type { SaleTicket } from '../store/useSalesStore';

const METHOD_LABEL: Record<SaleTicket['payment_method'], string> = {
  CASH: 'Efectivo',
  CARD: 'Tarjeta',
  QR: 'QR',
  MIXED: 'Mixto',
};

const METHOD_ICON: Record<SaleTicket['payment_method'], React.ReactNode> = {
  CASH: <DollarSign className="w-3.5 h-3.5" />,
  CARD: <CreditCard className="w-3.5 h-3.5" />,
  QR: <QrCode className="w-3.5 h-3.5" />,
  MIXED: <Layers className="w-3.5 h-3.5" />,
};

export const SalesHistoryView: React.FC = () => {
  const toast = useToast();
  const catalog = useCatalogStore((state) => state.products);
  const applyMovements = useCatalogStore((state) => state.applyMovements);
  const releaseSerials = useCatalogStore((state) => state.releaseSerials);

  /* F2 lleva el foco al buscador. */
  useViewShortcuts({});
  const { user } = useAuthStore();
  const userRole = user?.role || 'ADMIN';
  const canVoidSaleDirect = hasPermission(userRole, 'can_void_sale');
  /* Exigir PIN para anular se configura en Ajustes · Seguridad. */
  const requirePinForVoids = useSettingsStore((state) => state.requirePinForVoids);
  /* La caja desde la que se pide: el servidor bloquea por terminal tras cinco
     intentos, y sin identificarla el bloqueo sería global. */
  const registerName = usePosStore((state) => state.cashShift?.registerName ?? 'sin-turno');

  const [searchQuery, setSearchQuery] = useState('');
  /* El filtro corría en cada pulsación sobre la lista entera. */
  const searchQueryDebounced = useDebounced(searchQuery);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [dateFilter, setDateFilter] = useState('TODAY');

  // Modals
  const [selectedTicket, setSelectedTicket] = useState<SaleTicket | null>(null);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);

  // Void Form State
  const [voidReason, setVoidReason] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [voidError, setVoidError] = useState('');

  /* El historial es el mismo que alimenta el cobro. Antes esta vista llevaba
     su propia lista de tres ventas de agosto que nunca ocurrieron, y las ventas
     reales de la jornada no aparecían aquí jamás. */
  const tickets = useSalesStore((state) => state.tickets);
  const voidTicket = useSalesStore((state) => state.voidTicket);

  const handleConfirmVoidTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!voidReason) {
      setVoidError('Debe ingresar un motivo obligatorio para la anulación.');
      return;
    }
    /* El PIN solo se pide a quien no tiene el permiso: con `can_void_sale` el
       campo ni siquiera se dibuja. Se comprobaba igual, así que el PIN vacío
       fallaba y un administrador —el único autorizado a anular sin PIN— no
       podía anular nada, sin ningún mensaje que lo explicara.

       Antes esta vista comparaba con '1234' escrito aquí mismo y el mensaje de
       error anunciaba el PIN. La comprobación pasa por el único punto que la
       tiene, igual que los descuentos del punto de venta. */
    /* Quien decide es el servidor, que compara contra el hash del PIN. Antes se
       comparaba aquí contra un valor del bundle. */
    let authorizedBy: string | undefined;
    if (!canVoidSaleDirect && requirePinForVoids) {
      const check = await authorizeSupervisor(supervisorPin, 'void_sale', registerName);
      if (!check.authorized) {
        setVoidError(check.message);
        return;
      }
      authorizedBy = check.authorizedBy;
    }

    if (selectedTicket) {
      /* Anular es un solo hecho: cambia el estado del ticket y devuelve la
         mercancía. Si el ticket ya estaba anulado, el store lo rechaza y no se
         devuelve nada dos veces. */
      const voided = voidTicket(
        selectedTicket.id,
        voidReason,
        authorizedBy
          ? `${user?.name ?? 'Operador'} · autorizado por ${authorizedBy}`
          : (user?.name ?? 'Supervisor'),
      );

      if (!voided) {
        setVoidError('Este ticket ya estaba anulado.');
        return;
      }

      /* Devolución real al inventario. Antes esto escribía en consola
         «Devolución atómica de inventario ejecutada» y el aviso decía «stock
         devuelto», sin devolver nada: la mercancía anulada quedaba descontada
         para siempre. Y buscaba el producto por SKU contra un catálogo donde
         ninguno de esos SKU existía, así que nunca encontraba nada. */
      const returned = applyMovements(
        voided.items
          .map((item) => {
            /* El identificador del catálogo es lo fiable; el SKU y el nombre
               son el respaldo para tickets antiguos. */
            const product =
              catalog.find((p) => p.id === item.id) ??
              catalog.find((p) => p.sku === item.sku || p.name === item.name);
            return product
              ? {
                  productId: product.id,
                  type: 'SALE_RETURN' as const,
                  quantity: item.quantity,
                  reference: voided.id,
                  reason: voidReason,
                }
              : null;
          })
          .filter((m): m is NonNullable<typeof m> => m !== null),
      );

      // Las series vuelven a estar disponibles: el aparato no salió de la tienda.
      const serials = voided.items.flatMap((item) => item.serials ?? []);
      if (serials.length > 0) releaseSerials(serials);

      const perdidas = voided.items.length - returned.length;
      toast(
        returned.length > 0
          ? `Ticket ${voided.id} anulado · ${returned.length} ${returned.length === 1 ? 'línea devuelta' : 'líneas devueltas'} al inventario` +
              (perdidas > 0 ? ` · ${perdidas} sin equivalencia en el catálogo` : '')
          : `Ticket ${voided.id} anulado · ninguna línea coincide con el catálogo actual`,
        perdidas > 0 || returned.length === 0 ? 'warning' : 'success',
      );
      setSelectedTicket(null);
    }

    setIsVoidModalOpen(false);
    setVoidReason('');
    setSupervisorPin('');
    setVoidError('');
  };

  /* Dos ejes de filtro distintos: periodo y estado. Antes se mezclaban en una
     sola fila, como si fueran opciones del mismo conjunto. */
  /* El selector de periodo existía y no filtraba nada: se elegía «Hoy» y la
     tabla seguía mostrando el histórico completo. */
  const periodStart = (() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    if (dateFilter === 'TODAY') return from.getTime();
    if (dateFilter === 'WEEK') return from.getTime() - 6 * 24 * 3600 * 1000;
    if (dateFilter === 'MONTH') return from.getTime() - 29 * 24 * 3600 * 1000;
    return 0;
  })();

  const filteredTickets = tickets.filter((t) => {
    const q = searchQueryDebounced.toLowerCase();
    const matchesSearch =
      t.id.toLowerCase().includes(q) ||
      t.cashier_name.toLowerCase().includes(q) ||
      (t.customer_name ?? '').toLowerCase().includes(q) ||
      t.items.some((i) => i.name.toLowerCase().includes(q));
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const at = new Date(t.at).getTime();
    const matchesPeriod = Number.isNaN(at) || at >= periodStart;
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const completed = filteredTickets.filter((t) => t.status === 'COMPLETED');
  const revenue = completed.reduce((s, t) => s + t.total, 0);
  const avgTicket = completed.length > 0 ? revenue / completed.length : 0;
  const voided = filteredTickets.length - completed.length;

  /**
   * Exporta lo que se está viendo, ya filtrado.
   *
   * Antes este botón no tenía `onClick`: se pulsaba y no ocurría nada.
   */
  const exportTickets = () => {
    const csv = buildCsv<SaleTicket>(
      [
        { header: 'Ticket', value: (t) => t.id },
        { header: 'Fecha y hora', value: (t) => formatDateTime(t.at) },
        { header: 'Cajero', value: (t) => t.cashier_name },
        { header: 'Método de pago', value: (t) => METHOD_LABEL[t.payment_method] },
        { header: 'Total', value: (t) => t.total.toFixed(2) },
        { header: 'Recibido', value: (t) => t.cash_given.toFixed(2) },
        { header: 'Cambio', value: (t) => t.change.toFixed(2) },
        { header: 'Estado', value: (t) => (t.status === 'COMPLETED' ? 'Completada' : 'Anulada') },
        { header: 'Motivo de anulación', value: (t) => t.cancellation_reason },
        { header: 'Anulada por', value: (t) => t.cancelled_by },
        { header: 'Artículos', value: (t) => t.items.length },
      ],
      filteredTickets,
    );

    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`informe-ventas-${stamp}.csv`, csv);
    toast(
      `${filteredTickets.length} ${filteredTickets.length === 1 ? 'ticket exportado' : 'tickets exportados'}`,
      'success',
    );
  };

  const columns: Array<Column<SaleTicket>> = [
    {
      key: 'id',
      header: 'Ticket',
      card: 'title',
      width: '120px',
      render: (t) => <span className="font-mono text-body text-ink">{t.id}</span>,
    },
    {
      key: 'date',
      header: 'Fecha y hora',
      width: '170px',
      /* Se ordena por el instante, no por el texto: «14/08/2026» ordenado como
         cadena pone el 14 de agosto antes que el 2 de septiembre. */
      sortValue: (t) => t.at,
      render: (t) => (
        <span className="font-mono tnum text-body text-ink-2">{formatDateTime(t.at)}</span>
      ),
    },
    {
      key: 'cashier',
      header: 'Cajero',
      width: '170px',
      render: (t) => <span className="text-body text-ink-2 truncate">{t.cashier_name}</span>,
    },
    {
      key: 'items',
      header: 'Ítems',
      align: 'right',
      width: '90px',
      render: (t) => <span className="font-mono tnum text-ink-2">{t.items.length}</span>,
    },
    {
      key: 'method',
      header: 'Método',
      width: '140px',
      render: (t) => (
        <Badge icon={METHOD_ICON[t.payment_method]}>{METHOD_LABEL[t.payment_method]}</Badge>
      ),
    },
    {
      key: 'total',
      sortValue: (t) => t.total,
      header: 'Total',
      card: 'meta',
      align: 'right',
      width: '130px',
      render: (t) => (
        <Money
          value={t.total}
          size="base"
          className={t.status === 'CANCELLED' ? 'text-ink-3 line-through' : 'text-ink'}
        />
      ),
    },
    {
      key: 'status',
      sortValue: (t) => t.status,
      header: 'Estado',
      width: '130px',
      render: (t) => (
        <Badge tone={t.status === 'COMPLETED' ? 'success' : 'danger'}>
          {t.status === 'COMPLETED' ? 'Completada' : 'Anulada'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      card: 'hidden',
      align: 'right',
      width: '110px',
      render: (t) => (
        <div className="flex items-center justify-end gap-0.5">
          <IconButton
            label={`Ver ticket ${t.id}`}
            tone="accent"
            onClick={() => setSelectedTicket(t)}
          >
            <Eye className="w-4 h-4" />
          </IconButton>
          {t.status === 'COMPLETED' && (
            <IconButton
              label={`Anular ticket ${t.id}`}
              tone="danger"
              onClick={() => {
                setSelectedTicket(t);
                setIsVoidModalOpen(true);
              }}
            >
              <RotateCcw className="w-4 h-4" />
            </IconButton>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-canvas select-none">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        <PageHeader
          title="Informes"
          subtitle="Historial de ventas, anulaciones y desglose por método de pago."
          actions={
            <Button
              variant="secondary"
              icon={<Printer className="w-4 h-4" />}
              disabled={filteredTickets.length === 0}
              onClick={exportTickets}
            >
              Exportar {filteredTickets.length > 0 && `(${filteredTickets.length})`}
            </Button>
          }
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
          <StatTile
            label="Ventas del periodo"
            value={<Money value={revenue} size="display" />}
            hint={`${completed.length} tickets`}
            icon={<History className="w-4 h-4" />}
            tone="success"
          />
          <StatTile
            label="Ticket promedio"
            value={<Money value={avgTicket} size="display" />}
            hint="por venta completada"
            icon={<CheckCircle2 className="w-4 h-4" />}
          />
          <StatTile
            label="Anulaciones"
            value={voided}
            hint="requieren PIN de supervisor"
            icon={<XCircle className="w-4 h-4" />}
            tone={voided > 0 ? 'danger' : 'neutral'}
          />
        </div>

        <Toolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por ticket, cajero o producto…"
          filters={
            <>
              <ToolbarSelect
                aria-label="Periodo"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              >
                <option value="TODAY">Hoy</option>
                <option value="WEEK">Esta semana</option>
                <option value="MONTH">Este mes</option>
                <option value="ALL">Todo el histórico</option>
              </ToolbarSelect>
              <ToolbarSelect
                aria-label="Estado"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              >
                <option value="ALL">Todos los estados</option>
                <option value="COMPLETED">Completadas</option>
                <option value="CANCELLED">Anuladas</option>
              </ToolbarSelect>
            </>
          }
        />

        <DataTable
          caption="Tickets emitidos, con su método de pago, total y estado"
          columns={columns}
          rows={filteredTickets}
          pageSize={25}
          rowKey={(t) => t.id}
          empty={
            <EmptyState
              icon={<History className="w-6 h-6" />}
              title="Sin tickets que coincidan"
              hint="Ajuste la búsqueda, el periodo o el estado."
            />
          }
        />
      </div>

      {/* Detalle del ticket */}
      <Modal
        isOpen={!!selectedTicket && !isVoidModalOpen}
        onClose={() => setSelectedTicket(null)}
        icon={<History className="w-4 h-4" />}
        title={selectedTicket ? `Ticket ${selectedTicket.id}` : ''}
        subtitle={selectedTicket ? formatDateTime(selectedTicket.at) : undefined}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setSelectedTicket(null)}>
            Cerrar
          </Button>
        }
      >
        {selectedTicket && (
          <div className="space-y-5">
            <DescriptionList
              items={[
                { label: 'Cajero', value: selectedTicket.cashier_name },
                {
                  label: 'Método de pago',
                  value: (
                    <Badge icon={METHOD_ICON[selectedTicket.payment_method]}>
                      {METHOD_LABEL[selectedTicket.payment_method]}
                    </Badge>
                  ),
                },
                { label: 'Recibido', value: <Money value={selectedTicket.cash_given} /> },
                { label: 'Cambio', value: <Money value={selectedTicket.change} /> },
                ...(selectedTicket.status === 'CANCELLED'
                  ? [
                      {
                        label: 'Motivo de anulación',
                        value: selectedTicket.cancellation_reason ?? '—',
                        wide: true,
                      },
                      {
                        label: 'Anulado por',
                        value: `${selectedTicket.cancelled_by ?? '—'} · ${selectedTicket.cancelled_at ?? ''}`,
                        wide: true,
                      },
                    ]
                  : []),
              ]}
            />

            <div className="space-y-2">
              <p className="text-micro uppercase text-ink-3">Líneas del ticket</p>
              <div className="divide-y divide-line border border-line rounded-md">
                {selectedTicket.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-ink truncate">{it.name}</p>
                      <p className="font-mono text-micro text-ink-3">
                        {it.sku}
                        {it.serials?.length ? ` · ${it.serials.join(', ')}` : ''}
                      </p>
                    </div>
                    <span className="font-mono tnum text-body text-ink-2">
                      {it.quantity} {it.unit_type === 'FRACTION' ? 'kg' : 'u.'}
                    </span>
                    <Money value={it.subtotal} size="base" className="text-ink w-28 text-right" />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-micro uppercase text-ink-2">Total</span>
                <Money value={selectedTicket.total} size="title" className="text-ink" />
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Anulación */}
      <Modal
        isOpen={isVoidModalOpen}
        onClose={() => {
          setIsVoidModalOpen(false);
          setVoidError('');
        }}
        icon={<ShieldAlert className="w-4 h-4" />}
        title="Anular ticket"
        subtitle={selectedTicket?.id}
        size="md"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsVoidModalOpen(false);
                setVoidError('');
              }}
            >
              Cancelar
            </Button>
            <Button variant="danger" onClick={handleConfirmVoidTicket}>
              Anular ticket
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-3 rounded-md bg-danger-soft border border-danger/25 flex items-start gap-2 text-body text-danger-ink">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            La anulación devuelve el stock al almacén, libera los IMEI vendidos y queda registrada
            en el historial de auditoría. No se puede deshacer.
          </div>

          <Textarea
            label="Motivo de la anulación"
            rows={3}
            value={voidReason}
            onChange={(e) => setVoidReason(e.target.value)}
            placeholder="Por qué se anula este ticket…"
            error={voidError && !voidReason ? voidError : undefined}
          />

          {!canVoidSaleDirect && requirePinForVoids && (
            <Input
              label="PIN de supervisor"
              type="password"
              maxLength={6}
              value={supervisorPin}
              onChange={(e) => setSupervisorPin(e.target.value)}
              leading={<Lock className="w-4 h-4" />}
              placeholder="••••"
              error={voidError && voidReason ? voidError : undefined}
              className="[&_input]:font-mono [&_input]:tracking-[0.3em]"
            />
          )}
        </div>
      </Modal>
    </div>
  );
};
