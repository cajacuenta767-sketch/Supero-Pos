import { usePersistentState } from '../store/persist';
import { useCatalogStore } from '../store/useCatalogStore';
import { formatDateTime } from '../utils/dates';
import React, { useState } from 'react';
import { ArrowLeftRight, ArrowRight, Eye, Plus, Truck } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  DescriptionList,
  EmptyState,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Select,
  Tabs,
  Textarea,
  Toolbar,
  ToolbarSelect,
  useToast,
} from '../ui';
import { useViewShortcuts } from '../hooks/useViewShortcuts';
import { useDebounced } from '../hooks/useDebounced';
import type { Column, TabItem } from '../ui';

type SubTab = 'catalog' | 'reception';

const TABS: TabItem[] = [
  { id: 'catalog', label: 'Guías', icon: <ArrowLeftRight className="w-4 h-4" /> },
  { id: 'reception', label: 'Por recibir', icon: <Truck className="w-4 h-4" /> },
];

const STATUS_LABEL: Record<TransferGuide['status'], string> = {
  PENDING: 'Pendiente de envío',
  IN_TRANSIT: 'En tránsito',
  COMPLETED: 'Recibida',
  CANCELLED: 'Anulada',
};

const STATUS_TONE: Record<TransferGuide['status'], 'warning' | 'accent' | 'success' | 'danger'> = {
  PENDING: 'warning',
  IN_TRANSIT: 'accent',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

const BRANCHES = ['Almacén Central', 'Sucursal Centro', 'Sucursal Norte', 'Sucursal Sur'];

interface TransferItem {
  id: number;
  /** Producto del catálogo. El `id` identifica la línea de la guía. */
  product_id: number;
  sku: string;
  name: string;
  source_stock: number;
  qty: number;
  unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
  serials?: string[];
}

interface TransferGuide {
  id: string; // TR-3001
  /** Instante en ISO. Como texto «14/08/2026», ordenar pone el 14 de agosto
   *  antes que el 2 de septiembre. */
  at: string;
  source_branch: string;
  destination_branch: string;
  items_count: number;
  status: 'PENDING' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  items: TransferItem[];
}

export const TransfersView: React.FC = () => {
  /* Antes eran tres pestañas decorativas: se pulsaban, se iluminaban y mostraban
     la misma tabla. «Discrepancias» no tenía datos detrás. Quedan las dos que
     corresponden a un estado real de la guía. */
  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'reception'>('catalog');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  /* El filtro corría en cada pulsación sobre la lista entera. */
  const searchQueryDebounced = useDebounced(searchQuery);
  const [statusFilter, setStatusFilter] = useState('ALL');
  /* El filtro por almacén de origen existía como estado fijo en 'ALL' y sin
     ningún control que lo cambiara: filtraba siempre por todo. */
  const [sourceFilter, setSourceFilter] = useState('ALL');

  /* Los orígenes que existen de verdad en las guías: una lista escrita a mano
     se desincroniza en cuanto se crea un traslado desde otro almacén. */

  // Modals
  const [isNewTransferModalOpen, setIsNewTransferModalOpen] = useState(false);
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [, setIsDetailModalOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState<TransferGuide | null>(null);

  // New Transfer Form State
  const [sourceBranch, setSourceBranch] = useState('Almacén Central');
  const [destBranch, setDestBranch] = useState('Sucursal Centro');
  const [guideProductId, setGuideProductId] = useState(0);
  const [guideQty, setGuideQty] = useState(1);

  const catalog = useCatalogStore((state) => state.products);
  const applyMovements = useCatalogStore((state) => state.applyMovements);
  const guideProduct = catalog.find((p) => p.id === guideProductId);
  const [transferNotes, setTransferNotes] = useState('');

  // Mock Transfer Guides Data
  const [transfers, setTransfers] = usePersistentState<TransferGuide[]>('traslados', [
    {
      id: 'TR-3001',
      at: '2026-08-14T10:15:00.000Z',
      source_branch: 'Almacén Central',
      destination_branch: 'Sucursal Centro',
      items_count: 2,
      status: 'IN_TRANSIT',
      notes: 'Reabastecimiento urgente por alta demanda en fin de semana',
      items: [
        {
          id: 1,
          product_id: 107,
          sku: 'SKU-1001',
          name: 'Coca Cola 2 Litros Retornable',
          source_stock: 120,
          qty: 30,
          unit_type: 'UNIT',
        },
        {
          id: 3,
          product_id: 101,
          sku: 'SKU-1003',
          name: 'Smartphone Samsung Galaxy A54 128GB',
          source_stock: 8,
          qty: 2,
          unit_type: 'SERIALIZED',
          serials: ['IMEI-358492019482710', 'IMEI-358492019482711'],
        },
      ],
    },
    {
      id: 'TR-3002',
      at: '2026-08-11T16:30:00.000Z',
      source_branch: 'Sucursal Norte',
      destination_branch: 'Almacén Central',
      items_count: 1,
      status: 'COMPLETED',
      notes: 'Devolución de excedente de inventario',
      items: [
        {
          id: 2,
          product_id: 102,
          sku: 'SKU-1002',
          name: 'Queso Criollo San Javier (Kg)',
          source_stock: 15,
          qty: 5.5,
          unit_type: 'FRACTION',
        },
      ],
    },
  ]);

  const toast = useToast();

  /* F2 lleva el foco al buscador. */
  useViewShortcuts({});

  const sourceBranches = Array.from(new Set(transfers.map((t) => t.source_branch))).sort();

  const filteredTransfers = transfers.filter((t) => {
    const q = searchQueryDebounced.toLowerCase();
    const matchesSearch =
      t.id.toLowerCase().includes(q) ||
      t.source_branch.toLowerCase().includes(q) ||
      t.destination_branch.toLowerCase().includes(q);
    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    const matchesSource = sourceFilter === 'ALL' || t.source_branch === sourceFilter;
    // «Por recibir» son las que viajan: es lo que hay que atender hoy.
    const matchesTab = activeSubTab === 'reception' ? t.status === 'IN_TRANSIT' : true;
    return matchesSearch && matchesStatus && matchesSource && matchesTab;
  });

  const confirmReception = (t: TransferGuide) => {
    setTransfers((prev) =>
      prev.map((x) => (x.id === t.id ? { ...x, status: 'COMPLETED' as const } : x)),
    );

    /* La mercadería vuelve a estar disponible al llegar a destino. Mientras
       viaja no lo está, y por eso la salida ya la descontó al emitir la guía. */
    applyMovements(
      t.items.map((item) => ({
        productId: item.product_id,
        type: 'TRANSFER_IN' as const,
        quantity: item.qty,
        reference: t.id,
        reason: `Entrada en ${t.destination_branch}`,
      })),
    );

    setIsReceptionModalOpen(false);
    setSelectedTransfer(null);
    toast(`Guía ${t.id} recibida`, 'success');
  };

  /**
   * Emisión de la guía.
   *
   * Antes «Crear guía» solo cerraba el modal y mostraba un aviso: no creaba
   * nada. Ahora la registra y descuenta la salida, porque la mercadería en
   * tránsito deja de estar disponible en el origen.
   */
  const createGuide = () => {
    if (sourceBranch === destBranch || !guideProduct || guideQty <= 0) return;

    const id = `TR-${3000 + transfers.length + 1}`;
    setTransfers((prev) => [
      {
        id,
        at: new Date().toISOString(),
        source_branch: sourceBranch,
        destination_branch: destBranch,
        items_count: guideQty,
        status: 'IN_TRANSIT',
        items: [
          {
            id: 1,
            product_id: guideProduct.id,
            sku: guideProduct.sku,
            name: guideProduct.name,
            source_stock: guideProduct.stock,
            qty: guideQty,
            unit_type: guideProduct.unit_type,
          },
        ],
      },
      ...prev,
    ]);

    applyMovements([
      {
        productId: guideProduct.id,
        type: 'TRANSFER_OUT',
        quantity: -guideQty,
        reference: id,
        reason: `Salida de ${sourceBranch}`,
      },
    ]);

    setGuideProductId(0);
    setGuideQty(1);
    setIsNewTransferModalOpen(false);
    toast(`Guía ${id} emitida`, 'success');
  };

  const columns: Array<Column<TransferGuide>> = [
    {
      key: 'id',
      header: 'N.º guía',
      width: '120px',
      render: (t) => <span className="font-mono text-body text-ink">{t.id}</span>,
    },
    {
      key: 'route',
      header: 'Origen y destino',
      card: 'title',
      render: (t) => (
        <div className="min-w-0">
          <p className="text-body text-ink-2 truncate">{t.source_branch}</p>
          <p className="flex items-center gap-1.5 text-base font-semibold text-ink truncate">
            <ArrowRight className="w-3.5 h-3.5 shrink-0 text-ink-3" />
            {t.destination_branch}
          </p>
        </div>
      ),
    },
    {
      key: 'date',
      sortValue: (t) => t.at,
      header: 'Fecha de emisión',
      width: '160px',
      render: (t) => (
        <span className="font-mono tnum text-body text-ink-2">{formatDateTime(t.at)}</span>
      ),
    },
    {
      key: 'items',
      header: 'Ítems',
      align: 'right',
      width: '90px',
      render: (t) => <span className="font-mono tnum text-ink-2">{t.items_count}</span>,
    },
    {
      key: 'status',
      sortValue: (t) => t.status,
      header: 'Estado',
      card: 'meta',
      width: '180px',
      render: (t) => <Badge tone={STATUS_TONE[t.status]}>{STATUS_LABEL[t.status]}</Badge>,
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
            label={`Ver guía ${t.id}`}
            tone="accent"
            onClick={() => {
              setSelectedTransfer(t);
              setIsDetailModalOpen(true);
            }}
          >
            <Eye className="w-4 h-4" />
          </IconButton>
          {t.status === 'IN_TRANSIT' && (
            <IconButton
              label={`Recibir guía ${t.id}`}
              onClick={() => {
                setSelectedTransfer(t);
                setIsReceptionModalOpen(true);
              }}
            >
              <Truck className="w-4 h-4" />
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
          title="Transferencias"
          subtitle="Traslados de mercadería entre almacenes y sucursales."
          actions={
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsNewTransferModalOpen(true)}
            >
              Nueva guía
            </Button>
          }
          tabs={
            <Tabs
              items={TABS}
              value={activeSubTab}
              onChange={(id) => setActiveSubTab(id as SubTab)}
              label="Secciones de transferencias"
            />
          }
        />

        <Toolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por número de guía, origen o destino…"
          filters={
            <>
              <ToolbarSelect
                aria-label="Estado"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">Todos los estados</option>
                {(Object.keys(STATUS_LABEL) as Array<TransferGuide['status']>).map((k) => (
                  <option key={k} value={k}>
                    {STATUS_LABEL[k]}
                  </option>
                ))}
              </ToolbarSelect>
              <ToolbarSelect
                aria-label="Almacén de origen"
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value)}
              >
                <option value="ALL">Todos los orígenes</option>
                {sourceBranches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </ToolbarSelect>
            </>
          }
        />

        <DataTable
          caption="Guías de traslado entre almacenes, con origen y destino"
          columns={columns}
          rows={filteredTransfers}
          pageSize={25}
          rowKey={(t) => t.id}
          empty={
            <EmptyState
              icon={<ArrowLeftRight className="w-6 h-6" />}
              title="Sin guías que coincidan"
              hint="Ajuste la búsqueda o el filtro de estado."
              action={
                <Button
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsNewTransferModalOpen(true)}
                >
                  Nueva guía
                </Button>
              }
            />
          }
        />
      </div>

      {/* Detalle de la guía */}
      <Modal
        isOpen={!!selectedTransfer && !isReceptionModalOpen}
        onClose={() => setSelectedTransfer(null)}
        icon={<ArrowLeftRight className="w-4 h-4" />}
        title={selectedTransfer ? `Guía ${selectedTransfer.id}` : ''}
        subtitle={
          selectedTransfer
            ? `${selectedTransfer.source_branch} → ${selectedTransfer.destination_branch}`
            : undefined
        }
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setSelectedTransfer(null)}>
            Cerrar
          </Button>
        }
      >
        {selectedTransfer && (
          <div className="space-y-5">
            <DescriptionList
              items={[
                {
                  label: 'Fecha de emisión',
                  value: <span className="font-mono">{formatDateTime(selectedTransfer.at)}</span>,
                },
                {
                  label: 'Estado',
                  value: (
                    <Badge tone={STATUS_TONE[selectedTransfer.status]}>
                      {STATUS_LABEL[selectedTransfer.status]}
                    </Badge>
                  ),
                },
                { label: 'Origen', value: selectedTransfer.source_branch },
                { label: 'Destino', value: selectedTransfer.destination_branch },
                { label: 'Notas', value: selectedTransfer.notes || '—', wide: true },
              ]}
            />
            <div className="space-y-2">
              <p className="text-micro uppercase text-ink-3">Ítems trasladados</p>
              <div className="divide-y divide-line border border-line rounded-md">
                {selectedTransfer.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-ink truncate">{it.name}</p>
                      <p className="font-mono text-micro text-ink-3">{it.sku}</p>
                    </div>
                    <span className="font-mono tnum text-base text-ink">
                      {it.qty} {it.unit_type === 'FRACTION' ? 'kg' : 'u.'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Recepción */}
      <Modal
        isOpen={isReceptionModalOpen}
        onClose={() => setIsReceptionModalOpen(false)}
        icon={<Truck className="w-4 h-4" />}
        title="Confirmar recepción"
        subtitle={selectedTransfer ? `Guía ${selectedTransfer.id}` : undefined}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsReceptionModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="success"
              onClick={() => selectedTransfer && confirmReception(selectedTransfer)}
            >
              Confirmar
            </Button>
          </>
        }
      >
        {selectedTransfer && (
          <div className="space-y-4">
            <p className="text-base text-ink-2 leading-relaxed">
              Al confirmar, la mercadería se suma al stock de{' '}
              <strong className="text-ink">{selectedTransfer.destination_branch}</strong> y la guía
              queda cerrada.
            </p>
            <div className="divide-y divide-line border border-line rounded-md">
              {selectedTransfer.items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 px-3 py-2.5">
                  <span className="flex-1 text-base text-ink truncate">{it.name}</span>
                  <span className="font-mono tnum text-base text-ink">
                    {it.qty} {it.unit_type === 'FRACTION' ? 'kg' : 'u.'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Nueva guía */}
      <Modal
        isOpen={isNewTransferModalOpen}
        onClose={() => setIsNewTransferModalOpen(false)}
        icon={<Plus className="w-4 h-4" />}
        title="Nueva guía de traslado"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsNewTransferModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={sourceBranch === destBranch || !guideProduct || guideQty <= 0}
              onClick={createGuide}
            >
              Crear guía
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Antes la guía no pedía qué se trasladaba: se creaba «una guía» sin
              mercadería, y por eso no podía mover existencias. */}
          <Select
            label="Producto"
            value={guideProductId}
            onChange={(e) => setGuideProductId(Number(e.target.value))}
          >
            <option value={0}>Elija un producto…</option>
            {catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · quedan {p.stock}
              </option>
            ))}
          </Select>

          <Input
            label="Cantidad a trasladar"
            type="number"
            min={0.001}
            step="any"
            value={guideQty}
            onChange={(e) => setGuideQty(parseFloat(e.target.value) || 0)}
            hint={
              guideProduct
                ? `En tránsito deja de estar disponible: quedarán ${Number((guideProduct.stock - guideQty).toFixed(4))}`
                : 'Admite decimales para el granel.'
            }
            error={
              guideProduct && guideQty > guideProduct.stock
                ? 'Más de lo que hay en el origen.'
                : undefined
            }
            className="[&_input]:font-mono [&_input]:text-right"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Almacén de origen"
              value={sourceBranch}
              onChange={(e) => setSourceBranch(e.target.value)}
            >
              {BRANCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
            <Select
              label="Destino"
              value={destBranch}
              onChange={(e) => setDestBranch(e.target.value)}
              error={
                sourceBranch === destBranch ? 'Origen y destino no pueden coincidir.' : undefined
              }
            >
              {BRANCHES.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
          </div>
          <Textarea
            label="Notas"
            rows={3}
            value={transferNotes}
            onChange={(e) => setTransferNotes(e.target.value)}
            placeholder="Motivo del traslado, transportista, observaciones…"
          />
        </div>
      </Modal>
    </div>
  );
};
