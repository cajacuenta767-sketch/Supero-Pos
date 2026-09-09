import React, { useState } from 'react';
import { ShoppingCart, Plus, Truck, Cpu, ArrowDownRight, Eye } from 'lucide-react';
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
  Tabs,
  Toolbar,
  ToolbarSelect,
  useToast,
} from '../ui';
import type { Column, TabItem } from '../ui';

type SubTab = 'orders' | 'receivings' | 'returns';

const TABS: TabItem[] = [
  { id: 'orders', label: 'Órdenes', icon: <ShoppingCart className="w-4 h-4" /> },
  { id: 'receivings', label: 'Recepciones', icon: <Truck className="w-4 h-4" /> },
  { id: 'returns', label: 'Devoluciones', icon: <ArrowDownRight className="w-4 h-4" /> },
];

/* Vocabulario de producto: el estado no se muestra como enum. */
const STATUS_LABEL: Record<PurchaseOrder['status'], string> = {
  PENDING: 'Pendiente de recibir',
  PARTIAL_RECEIVED: 'Recibida en parte',
  COMPLETED: 'Completada',
  CANCELLED: 'Anulada',
};

const STATUS_TONE: Record<PurchaseOrder['status'], 'warning' | 'accent' | 'success' | 'danger'> = {
  PENDING: 'warning',
  PARTIAL_RECEIVED: 'accent',
  COMPLETED: 'success',
  CANCELLED: 'danger',
};

interface PurchaseOrder {
  id: string; // PO-2001
  date: string;
  supplier_name: string;
  supplier_tax_id: string;
  branch: string;
  items_count: number;
  total: number;
  status: 'PENDING' | 'PARTIAL_RECEIVED' | 'COMPLETED' | 'CANCELLED';
  payment_terms: string;
  items: POItem[];
}

interface POItem {
  id: number;
  sku: string;
  name: string;
  ordered_qty: number;
  received_qty: number;
  cost_price: number;
  unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
  serials?: string[];
}

export const PurchasesView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'orders' | 'receivings' | 'returns'>('orders');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  // Receiving IMEI Scanning State
  const [scannedImeis, setScannedImeis] = useState<string[]>([]);
  const [imeiInput, setImeiInput] = useState('');

  // Mock Purchase Orders List
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([
    {
      id: 'PO-2001',
      date: '12/08/2026',
      supplier_name: 'Distribuidora Lácteos del Valle',
      supplier_tax_id: '904837201',
      branch: 'Almacén Central',
      items_count: 3,
      total: 12450.0,
      status: 'PENDING',
      payment_terms: '30 días',
      items: [
        {
          id: 1,
          sku: 'SKU-1001',
          name: 'Coca Cola 2 Litros Retornable',
          ordered_qty: 100,
          received_qty: 0,
          cost_price: 8.5,
          unit_type: 'UNIT',
        },
        {
          id: 2,
          sku: 'SKU-1002',
          name: 'Queso Criollo San Javier (Kg)',
          ordered_qty: 50.0,
          received_qty: 0,
          cost_price: 32.0,
          unit_type: 'FRACTION',
        },
      ],
    },
    {
      id: 'PO-2002',
      date: '10/08/2026',
      supplier_name: 'Importadora Electrónica TechBol',
      supplier_tax_id: '803928102',
      branch: 'Sucursal Central',
      items_count: 5,
      total: 9250.0,
      status: 'COMPLETED',
      payment_terms: 'Contado',
      items: [
        {
          id: 3,
          sku: 'SKU-1003',
          name: 'Smartphone Samsung Galaxy A54 128GB',
          ordered_qty: 5,
          received_qty: 5,
          cost_price: 1400.0,
          unit_type: 'SERIALIZED',
          serials: ['IMEI-358492019482710', 'IMEI-358492019482711'],
        },
      ],
    },
  ]);

  const toast = useToast();

  const filteredOrders = purchaseOrders.filter((po) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      po.id.toLowerCase().includes(q) ||
      po.supplier_name.toLowerCase().includes(q) ||
      po.supplier_tax_id.includes(searchQuery);
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const receiveOrder = (po: PurchaseOrder) => {
    setPurchaseOrders((prev) =>
      prev.map((p) => (p.id === po.id ? { ...p, status: 'COMPLETED' as const } : p)),
    );
    setIsReceivingModalOpen(false);
    setScannedImeis([]);
    toast(`Orden ${po.id} recibida`, 'success');
  };

  const columns: Array<Column<PurchaseOrder>> = [
    {
      key: 'id',
      header: 'N.º orden',
      width: '120px',
      render: (po) => <span className="font-mono text-body text-ink">{po.id}</span>,
    },
    {
      key: 'supplier',
      header: 'Proveedor',
      card: 'title',
      render: (po) => (
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink truncate">{po.supplier_name}</p>
          <p className="font-mono text-micro text-ink-3">NIT {po.supplier_tax_id}</p>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Fecha',
      width: '120px',
      render: (po) => <span className="font-mono tnum text-body text-ink-2">{po.date}</span>,
    },
    {
      key: 'branch',
      header: 'Destino',
      width: '180px',
      render: (po) => <span className="text-body text-ink-2 truncate">{po.branch}</span>,
    },
    {
      key: 'items',
      header: 'Ítems',
      align: 'right',
      width: '90px',
      render: (po) => <span className="font-mono tnum text-ink-2">{po.items_count}</span>,
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      width: '140px',
      render: (po) => <Money value={po.total} size="base" className="text-ink" />,
    },
    {
      key: 'status',
      header: 'Estado',
      card: 'meta',
      width: '180px',
      render: (po) => <Badge tone={STATUS_TONE[po.status]}>{STATUS_LABEL[po.status]}</Badge>,
    },
    {
      key: 'actions',
      header: '',
      card: 'hidden',
      align: 'right',
      width: '110px',
      render: (po) => (
        <div className="flex items-center justify-end gap-0.5">
          <IconButton label={`Ver orden ${po.id}`} tone="accent" onClick={() => setSelectedPO(po)}>
            <Eye className="w-4 h-4" />
          </IconButton>
          {po.status !== 'COMPLETED' && po.status !== 'CANCELLED' && (
            <IconButton
              label={`Recibir orden ${po.id}`}
              onClick={() => {
                setSelectedPO(po);
                setIsReceivingModalOpen(true);
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
          title="Compras"
          subtitle="Órdenes a proveedores, recepción de mercadería y devoluciones."
          actions={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsPOModalOpen(true)}>
              Nueva orden
            </Button>
          }
          tabs={
            <Tabs
              items={TABS}
              value={activeSubTab}
              onChange={(id) => setActiveSubTab(id as SubTab)}
              label="Secciones de compras"
            />
          }
        />

        <Toolbar
          search={searchQuery}
          onSearchChange={setSearchQuery}
          searchPlaceholder="Buscar por número de orden, proveedor o NIT…"
          filters={
            <ToolbarSelect
              aria-label="Estado"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">Todos los estados</option>
              {(Object.keys(STATUS_LABEL) as Array<PurchaseOrder['status']>).map((k) => (
                <option key={k} value={k}>
                  {STATUS_LABEL[k]}
                </option>
              ))}
            </ToolbarSelect>
          }
        />

        <DataTable
          columns={columns}
          rows={filteredOrders}
          rowKey={(po) => po.id}
          empty={
            <EmptyState
              icon={<ShoppingCart className="w-6 h-6" />}
              title="Sin órdenes que coincidan"
              hint="Ajuste la búsqueda o el filtro de estado."
              action={
                <Button
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsPOModalOpen(true)}
                >
                  Nueva orden
                </Button>
              }
            />
          }
        />
      </div>

      {/* Detalle de la orden */}
      <Modal
        isOpen={!!selectedPO && !isReceivingModalOpen}
        onClose={() => setSelectedPO(null)}
        icon={<ShoppingCart className="w-4 h-4" />}
        title={selectedPO ? `Orden ${selectedPO.id}` : ''}
        subtitle={selectedPO?.supplier_name}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setSelectedPO(null)}>
            Cerrar
          </Button>
        }
      >
        {selectedPO && (
          <div className="space-y-5">
            <DescriptionList
              items={[
                { label: 'Fecha', value: <span className="font-mono">{selectedPO.date}</span> },
                { label: 'Destino', value: selectedPO.branch },
                { label: 'Condición de pago', value: selectedPO.payment_terms },
                {
                  label: 'Estado',
                  value: (
                    <Badge tone={STATUS_TONE[selectedPO.status]}>
                      {STATUS_LABEL[selectedPO.status]}
                    </Badge>
                  ),
                },
              ]}
            />
            <div className="space-y-2">
              <p className="text-micro uppercase text-ink-3">Líneas de la orden</p>
              <div className="divide-y divide-line border border-line rounded-md">
                {selectedPO.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-base text-ink truncate">{it.name}</p>
                      <p className="font-mono text-micro text-ink-3">{it.sku}</p>
                    </div>
                    <span className="font-mono tnum text-body text-ink-2">
                      {it.ordered_qty} {it.unit_type === 'FRACTION' ? 'kg' : 'u.'}
                    </span>
                    <Money
                      value={it.cost_price * it.ordered_qty}
                      size="base"
                      className="text-ink w-28 text-right"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Recepción */}
      <Modal
        isOpen={isReceivingModalOpen}
        onClose={() => {
          setIsReceivingModalOpen(false);
          setScannedImeis([]);
        }}
        icon={<Truck className="w-4 h-4" />}
        title="Recibir mercadería"
        subtitle={selectedPO ? `${selectedPO.id} · ${selectedPO.supplier_name}` : undefined}
        size="lg"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setIsReceivingModalOpen(false);
                setScannedImeis([]);
              }}
            >
              Cancelar
            </Button>
            <Button variant="success" onClick={() => selectedPO && receiveOrder(selectedPO)}>
              Confirmar recepción
            </Button>
          </>
        }
      >
        {selectedPO && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-micro uppercase text-ink-3">Cantidades recibidas</p>
              <div className="divide-y divide-line border border-line rounded-md">
                {selectedPO.items.map((it) => (
                  <div key={it.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                    <div className="flex-1 min-w-[180px]">
                      <p className="text-base text-ink truncate">{it.name}</p>
                      <p className="font-mono text-micro text-ink-3">
                        pedido {it.ordered_qty} {it.unit_type === 'FRACTION' ? 'kg' : 'u.'}
                      </p>
                    </div>
                    <Input
                      label="Recibido"
                      type="number"
                      max={it.ordered_qty}
                      min={0}
                      defaultValue={it.ordered_qty}
                      className="w-32 [&_input]:font-mono [&_input]:text-center"
                    />
                  </div>
                ))}
              </div>
            </div>

            {selectedPO.items.some((i) => i.unit_type === 'SERIALIZED') && (
              <div className="space-y-2">
                <Input
                  label="Escanear IMEI de los equipos"
                  leading={<Cpu className="w-4 h-4" />}
                  value={imeiInput}
                  onChange={(e) => setImeiInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && imeiInput.trim()) {
                      e.preventDefault();
                      setScannedImeis((p) => [...p, imeiInput.trim()]);
                      setImeiInput('');
                    }
                  }}
                  placeholder="Escanee y pulse Enter"
                />
                {scannedImeis.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {scannedImeis.map((s) => (
                      <Badge key={s} tone="warning">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Alta de orden */}
      <Modal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        icon={<Plus className="w-4 h-4" />}
        title="Nueva orden de compra"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsPOModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsPOModalOpen(false)}>Crear orden</Button>
          </>
        }
      >
        <p className="text-base text-ink-2 leading-relaxed">
          El alta de órdenes se conecta al módulo de compras del backend. Los campos y su validación
          se migran junto con el resto del módulo.
        </p>
      </Modal>
    </div>
  );
};
