import { usePersistentState } from '../store/persist';
import React, { useState } from 'react';
import { ShoppingCart, Plus, Truck, Eye, X, AlertCircle } from 'lucide-react';
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
  ScanField,
  Select,
  Tabs,
  Toolbar,
  ToolbarSelect,
  useToast,
} from '../ui';
import { useViewShortcuts } from '../hooks/useViewShortcuts';
import { useDebounced } from '../hooks/useDebounced';
import type { Column, TabItem } from '../ui';
import { imeiError, isValidImei } from '../utils/imei';
import { formatDateTime } from '../utils/dates';
import { useCatalogStore } from '../store/useCatalogStore';

/* Antes había tres pestañas y ninguna cambiaba nada: «Devoluciones» prometía un
   módulo que no existe, y prometer es peor que no ofrecer. Quedan las dos que
   corresponden a un estado real de la orden. */
type SubTab = 'orders' | 'receivings';

const TABS: TabItem[] = [
  { id: 'orders', label: 'Órdenes', icon: <ShoppingCart className="w-4 h-4" /> },
  { id: 'receivings', label: 'Recepciones', icon: <Truck className="w-4 h-4" /> },
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
  /** Instante en ISO. Como texto «14/08/2026», ordenar pone el 14 de agosto
   *  antes que el 2 de septiembre. */
  at: string;
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
  /** Producto del catálogo al que corresponde la línea. El `id` de arriba
   *  identifica la línea dentro de la orden, no el artículo. */
  product_id: number;
  sku: string;
  name: string;
  ordered_qty: number;
  received_qty: number;
  cost_price: number;
  unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
  serials?: string[];
}

export const PurchasesView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('orders');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  /* El filtro corría en cada pulsación sobre la lista entera. */
  const searchQueryDebounced = useDebounced(searchQuery);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poForm, setPoForm] = useState({
    supplier_name: '',
    supplier_tax_id: '',
    branch: 'Almacén Central',
    payment_terms: '30 días',
    productId: 0,
    quantity: 1,
  });
  const [poError, setPoError] = useState<string | undefined>();
  const [isReceivingModalOpen, setIsReceivingModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  /* Lo que se recibe de cada línea, por identificador de línea. El campo
     «Recibido» del modal no estaba controlado: se tecleaba «3 de 10» y la
     recepción sumaba las 10 igualmente y daba la orden por completada. El
     almacén quedaba con siete unidades de papel que nunca entraron. */
  const [receivedByLine, setReceivedByLine] = useState<Record<number, string>>({});

  // Receiving IMEI Scanning State
  const [scannedImeis, setScannedImeis] = useState<string[]>([]);
  const [imeiInput, setImeiInput] = useState('');
  const [imeiAddError, setImeiAddError] = useState<string | undefined>(undefined);

  // Mock Purchase Orders List
  const [purchaseOrders, setPurchaseOrders] = usePersistentState<PurchaseOrder[]>('compras', [
    {
      id: 'PO-2001',
      at: '2026-08-12T00:00:00.000Z',
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
          product_id: 107,
          sku: 'SKU-1001',
          name: 'Coca Cola 2 Litros Retornable',
          ordered_qty: 100,
          received_qty: 0,
          cost_price: 8.5,
          unit_type: 'UNIT',
        },
        {
          id: 2,
          product_id: 102,
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
      at: '2026-08-10T00:00:00.000Z',
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
          product_id: 101,
          sku: 'SKU-1003',
          name: 'Smartphone Samsung Galaxy A54 128GB',
          ordered_qty: 5,
          received_qty: 5,
          cost_price: 1400.0,
          unit_type: 'SERIALIZED',
          serials: ['358492019482717', '358492019482725'],
        },
      ],
    },
    {
      id: 'PO-2003',
      at: '2026-08-14T00:00:00.000Z',
      supplier_name: 'Importadora Electrónica TechBol',
      supplier_tax_id: '803928102',
      branch: 'Almacén Central',
      items_count: 3,
      total: 4350.0,
      status: 'PENDING',
      payment_terms: '15 días',
      items: [
        {
          id: 4,
          product_id: 105,
          sku: 'SKU-1005',
          name: 'Smartphone Xiaomi Redmi Note 13 256GB',
          ordered_qty: 3,
          received_qty: 0,
          cost_price: 1450.0,
          unit_type: 'SERIALIZED',
        },
      ],
    },
  ]);

  const toast = useToast();

  /* F2 lleva el foco al buscador, «N» abre el alta. */
  useViewShortcuts({ onNew: () => setIsPOModalOpen(true) });

  const filteredOrders = purchaseOrders.filter((po) => {
    const q = searchQueryDebounced.toLowerCase();
    const matchesSearch =
      po.id.toLowerCase().includes(q) ||
      po.supplier_name.toLowerCase().includes(q) ||
      po.supplier_tax_id.includes(searchQueryDebounced);
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    /* La pestaña acota por estado: pendientes de recibir frente a ya recibidas. */
    const matchesTab =
      activeSubTab === 'receivings'
        ? po.status === 'COMPLETED'
        : po.status !== 'COMPLETED' && po.status !== 'CANCELLED';
    return matchesSearch && matchesStatus && matchesTab;
  });

  /** Lo que falta por recibir de una línea. */
  const pendingOf = (item: POItem) => Math.max(0, item.ordered_qty - item.received_qty);

  /** Lo que el operario declara de esta línea, acotado a lo que falta. */
  const receivedNow = (item: POItem) => {
    const raw = receivedByLine[item.id];
    const value = raw === undefined || raw === '' ? pendingOf(item) : Number(raw);
    if (!Number.isFinite(value) || value < 0) return 0;
    return Math.min(value, pendingOf(item));
  };

  /* Los IMEI se cuentan contra lo que se está recibiendo ahora, no contra lo
     pedido: en una recepción parcial de 3 de 10 teléfonos se piden 3 IMEI. */
  const serializedQty = selectedPO
    ? selectedPO.items
        .filter((i) => i.unit_type === 'SERIALIZED')
        .reduce((sum, i) => sum + receivedNow(i), 0)
    : 0;

  /* Con dos líneas serializadas no se sabe a cuál pertenece cada IMEI leído.
     Antes se asignaban todos a la primera y la segunda entraba sin trazas. */
  const serializedLines = selectedPO
    ? selectedPO.items.filter((i) => i.unit_type === 'SERIALIZED' && receivedNow(i) > 0)
    : [];

  /** ¿Alguien ha tecleado más de lo que falta en alguna línea? */
  const excessLine = selectedPO
    ? selectedPO.items.some((i) => Number(receivedByLine[i.id] ?? pendingOf(i)) > pendingOf(i))
    : false;

  const totalReceivingNow = selectedPO
    ? selectedPO.items.reduce((sum, i) => sum + receivedNow(i), 0)
    : 0;

  const cleanImei = (raw: string) => raw.trim().replace(/^IMEI[-\s]?/i, '');

  /* Mientras se teclea solo se avisa a partir del dígito 15: marcar en rojo un
     IMEI a medio escribir es ruido. Al intentar añadirlo sí se valida entero. */
  const typedImei = cleanImei(imeiInput);
  const imeiInputError =
    imeiAddError || (typedImei.length >= 15 ? imeiError(typedImei) : undefined);

  /** Cierra la recepción y suelta la orden.
   *
   *  El detalle se muestra con `!!selectedPO && !isReceivingModalOpen`, así que
   *  cerrar la recepción dejando `selectedPO` puesto no devolvía a la lista:
   *  abría el detalle de la orden, como si se hubiera pulsado otra cosa. */
  const catalog = useCatalogStore((state) => state.products);
  const applyMovements = useCatalogStore((state) => state.applyMovements);
  const registerSerials = useCatalogStore((state) => state.registerSerials);
  const selectedPoProduct = catalog.find((p) => p.id === poForm.productId);

  const closePOModal = () => {
    setIsPOModalOpen(false);
    setPoError(undefined);
    setPoForm({
      supplier_name: '',
      supplier_tax_id: '',
      branch: 'Almacén Central',
      payment_terms: '30 días',
      productId: 0,
      quantity: 1,
    });
  };

  /**
   * Alta de orden de compra.
   *
   * Antes este modal solo mostraba un texto diciendo que «se conecta al módulo
   * de compras del backend»: se pulsaba «Crear orden» y no ocurría nada.
   */
  const createPurchaseOrder = () => {
    const supplier = poForm.supplier_name.trim();
    if (!supplier) {
      setPoError('Indique el proveedor.');
      return;
    }
    if (!selectedPoProduct) {
      setPoError('Elija un producto del catálogo.');
      return;
    }
    if (poForm.quantity <= 0) {
      setPoError('La cantidad debe ser mayor que cero.');
      return;
    }

    const nextNumber = 2000 + purchaseOrders.length + 1;
    setPurchaseOrders((prev) => [
      {
        id: `PO-${nextNumber}`,
        at: new Date().toISOString(),
        supplier_name: supplier,
        supplier_tax_id: poForm.supplier_tax_id.trim() || '—',
        branch: poForm.branch,
        items_count: poForm.quantity,
        total: Number((selectedPoProduct.cost_price * poForm.quantity).toFixed(2)),
        status: 'PENDING',
        payment_terms: poForm.payment_terms,
        items: [
          {
            id: 1,
            product_id: selectedPoProduct.id,
            sku: selectedPoProduct.sku,
            name: selectedPoProduct.name,
            ordered_qty: poForm.quantity,
            received_qty: 0,
            cost_price: selectedPoProduct.cost_price,
            unit_type: selectedPoProduct.unit_type,
          },
        ],
      },
      ...prev,
    ]);

    toast(`Orden PO-${nextNumber} creada`, 'success');
    closePOModal();
  };

  const closeReceiving = () => {
    setIsReceivingModalOpen(false);
    setSelectedPO(null);
    setReceivedByLine({});
    setScannedImeis([]);
    setImeiInput('');
    setImeiAddError(undefined);
  };

  /** Añade un IMEI a la lista. Ignora el repetido en silencio: la cámara lee el
   *  mismo código varias veces por segundo y el operario no debería notarlo. */
  const addImei = (raw: string) => {
    const serial = cleanImei(raw);
    if (serial === '') return;
    const problem = imeiError(serial) ?? (serial.length === 15 ? undefined : 'IMEI incompleto.');
    if (problem) {
      setImeiAddError(problem);
      return;
    }
    setImeiAddError(undefined);
    setScannedImeis((prev) => (prev.includes(serial) ? prev : [...prev, serial]));
    setImeiInput('');
  };

  const receiveOrder = (po: PurchaseOrder) => {
    /* Una orden ya completada no se vuelve a recibir: sumaría la mercancía dos
       veces. Antes nada lo impedía y el botón seguía ahí. */
    if (po.status === 'COMPLETED' || po.status === 'CANCELLED') {
      toast(`La orden ${po.id} ya está ${STATUS_LABEL[po.status].toLowerCase()}.`, 'warning');
      return;
    }

    const lines = po.items.map((item) => ({ item, qty: receivedNow(item) }));
    const entering = lines.filter((l) => l.qty > 0);

    if (entering.length === 0) {
      toast('No hay ninguna cantidad que recibir.', 'warning');
      return;
    }

    /* Los IMEI escaneados entran al inventario de series: sin esto, el aparato
       recibido no se podría vender, porque la venta ya los valida. Se asignan a
       la única línea serializada que se esté recibiendo; con dos no se sabría a
       cuál pertenece cada lectura, así que el modal no deja llegar hasta aquí. */
    if (serializedLines.length === 1 && scannedImeis.length > 0) {
      registerSerials(serializedLines[0].product_id, scannedImeis);
    }

    /* Recibir mercadería suma existencias. Antes solo se marcaba la orden como
       completada: el stock no cambiaba, así que el inventario únicamente bajaba
       —con las ventas— y nunca se reponía. Y sumaba siempre lo pedido, no lo
       que el operario declaraba haber recibido. */
    applyMovements(
      entering.map(({ item, qty }) => ({
        productId: item.product_id,
        type: 'PURCHASE' as const,
        quantity: qty,
        reference: po.id,
        reason: `Recepción de ${po.supplier_name}`,
      })),
    );

    const updatedItems = po.items.map((item) => {
      const line = lines.find((l) => l.item.id === item.id);
      return line ? { ...item, received_qty: item.received_qty + line.qty } : item;
    });

    /* Recibida en parte mientras quede algo pendiente: la orden sigue viva y se
       puede volver a recibir el resto cuando llegue. */
    const complete = updatedItems.every((item) => item.received_qty >= item.ordered_qty);
    const nextStatus: PurchaseOrder['status'] = complete ? 'COMPLETED' : 'PARTIAL_RECEIVED';

    setPurchaseOrders((prev) =>
      prev.map((p) => (p.id === po.id ? { ...p, status: nextStatus, items: updatedItems } : p)),
    );

    closeReceiving();
    toast(
      complete
        ? `Orden ${po.id} recibida por completo · ${totalReceivingNow} en inventario`
        : `Orden ${po.id} recibida en parte · ${totalReceivingNow} en inventario, queda pendiente el resto`,
      complete ? 'success' : 'info',
    );
  };

  const columns: Array<Column<PurchaseOrder>> = [
    {
      key: 'id',
      sortValue: (po) => po.id,
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
      sortValue: (po) => po.at,
      header: 'Fecha',
      width: '120px',
      render: (po) => (
        <span className="font-mono tnum text-body text-ink-2">{formatDateTime(po.at)}</span>
      ),
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
      sortValue: (po) => po.total,
      header: 'Total',
      align: 'right',
      width: '140px',
      render: (po) => <Money value={po.total} size="base" className="text-ink" />,
    },
    {
      key: 'status',
      sortValue: (po) => po.status,
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
          subtitle="Órdenes a proveedores y recepción de mercadería."
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
          caption="Órdenes de compra por proveedor, destino y estado"
          columns={columns}
          rows={filteredOrders}
          pageSize={25}
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
                {
                  label: 'Fecha',
                  value: <span className="font-mono">{formatDateTime(selectedPO.at)}</span>,
                },
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
        onClose={closeReceiving}
        icon={<Truck className="w-4 h-4" />}
        title="Recibir mercadería"
        subtitle={selectedPO ? `${selectedPO.id} · ${selectedPO.supplier_name}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={closeReceiving}>
              Cancelar
            </Button>
            <Button
              variant="success"
              /* Un equipo serializado sin IMEI entra al inventario sin
                 trazabilidad, que es justo lo que la serialización evita. Y con
                 dos líneas serializadas a la vez no se sabe a cuál pertenece
                 cada lectura: se reciben por separado. */
              disabled={
                totalReceivingNow <= 0 ||
                excessLine ||
                serializedLines.length > 1 ||
                (serializedQty > 0 && scannedImeis.length !== serializedQty)
              }
              onClick={() => selectedPO && receiveOrder(selectedPO)}
            >
              Confirmar recepción
            </Button>
          </>
        }
      >
        {selectedPO && (
          <div className="space-y-5">
            {serializedLines.length > 1 && (
              <div className="p-3 rounded-md bg-warn-soft border border-warn/25 flex items-start gap-2 text-body text-warn-ink">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                Esta orden trae {serializedLines.length} artículos con IMEI. Recíbalos de uno en
                uno: si se leen todos juntos no hay forma de saber qué IMEI es de qué artículo.
              </div>
            )}

            <div className="space-y-2">
              <p className="text-micro uppercase text-ink-3">Cantidades recibidas</p>
              <div className="divide-y divide-line border border-line rounded-md">
                {selectedPO.items.map((it) => {
                  const unidad = it.unit_type === 'FRACTION' ? 'kg' : 'u.';
                  const pendiente = pendingOf(it);
                  return (
                    <div key={it.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                      <div className="flex-1 min-w-[180px]">
                        <p className="text-base text-ink truncate">{it.name}</p>
                        <p className="font-mono text-micro text-ink-3">
                          pedido {it.ordered_qty} {unidad}
                          {it.received_qty > 0 && ` · ya recibido ${it.received_qty} ${unidad}`}
                        </p>
                      </div>
                      <Input
                        label="Recibido"
                        type="number"
                        max={pendiente}
                        min={0}
                        step={it.unit_type === 'FRACTION' ? 0.001 : 1}
                        /* Controlado: el campo se tecleaba y no lo leía nadie. */
                        value={receivedByLine[it.id] ?? String(pendiente)}
                        onChange={(e) =>
                          setReceivedByLine((prev) => ({ ...prev, [it.id]: e.target.value }))
                        }
                        /* No se puede recibir más de lo que falta: la mercancía
                           de más no es de esta orden y entraría sin respaldo. */
                        error={
                          Number(receivedByLine[it.id] ?? pendiente) > pendiente
                            ? `Faltan ${pendiente} ${unidad} por recibir`
                            : undefined
                        }
                        disabled={pendiente === 0}
                        className="w-40 [&_input]:font-mono [&_input]:text-center"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {serializedQty > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-micro uppercase text-ink-3">IMEI de los equipos</p>
                  <Badge tone={scannedImeis.length === serializedQty ? 'success' : 'warning'}>
                    {scannedImeis.length} de {serializedQty}
                  </Badge>
                </div>

                <ScanField
                  label="Escanear con pistola, cámara o teclear"
                  /* La cámara sigue abierta entre lecturas: se reciben lotes de
                     diez o veinte equipos, y reabrirla en cada uno haría el
                     escaneo más lento que teclear. */
                  closeOnScan={false}
                  value={imeiInput}
                  onChange={(value) => {
                    setImeiInput(value);
                    setImeiAddError(undefined);
                  }}
                  onScan={addImei}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && imeiInput.trim()) {
                      e.preventDefault();
                      addImei(imeiInput);
                    }
                  }}
                  error={imeiInputError}
                  hint="Pulse Enter para añadir. Un IMEI repetido no se suma dos veces."
                  placeholder="354892019482910"
                />

                {scannedImeis.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {scannedImeis.map((serial) => (
                      <button
                        key={serial}
                        type="button"
                        onClick={() => setScannedImeis((p) => p.filter((x) => x !== serial))}
                        aria-label={`Quitar el IMEI ${serial}`}
                        className="group"
                      >
                        <Badge tone={isValidImei(serial) ? 'success' : 'warning'}>
                          <span className="font-mono">{serial}</span>
                          <X className="w-3 h-3 opacity-50 group-hover:opacity-100" aria-hidden />
                        </Badge>
                      </button>
                    ))}
                  </div>
                )}

                {scannedImeis.length > serializedQty && (
                  <p className="text-body text-danger">
                    Hay más IMEI escaneados que equipos pedidos en la orden.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Alta de orden */}
      <Modal
        isOpen={isPOModalOpen}
        onClose={closePOModal}
        icon={<Plus className="w-4 h-4" />}
        title="Nueva orden de compra"
        subtitle="Queda pendiente de recibir hasta que llegue la mercadería."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closePOModal}>
              Cancelar
            </Button>
            <Button onClick={createPurchaseOrder} icon={<Plus className="w-4 h-4" />}>
              Crear orden
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Proveedor"
            required
            autoFocus
            value={poForm.supplier_name}
            onChange={(e) => setPoForm({ ...poForm, supplier_name: e.target.value })}
            error={poError}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="NIT del proveedor"
              value={poForm.supplier_tax_id}
              onChange={(e) =>
                setPoForm({ ...poForm, supplier_tax_id: e.target.value.replace(/\D/g, '') })
              }
              className="[&_input]:font-mono"
            />
            <Select
              label="Destino"
              value={poForm.branch}
              onChange={(e) => setPoForm({ ...poForm, branch: e.target.value })}
            >
              <option>Almacén Central</option>
              <option>Sucursal Central</option>
              <option>Sucursal Norte</option>
            </Select>
          </div>

          {/* El producto sale del catálogo compartido: no se teclea a mano, así
              que la orden siempre referencia algo que existe. */}
          <Select
            label="Producto"
            value={poForm.productId}
            onChange={(e) => setPoForm({ ...poForm, productId: Number(e.target.value) })}
          >
            <option value={0}>Elija un producto…</option>
            {catalog.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.sku}
              </option>
            ))}
          </Select>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Cantidad"
              type="number"
              min={1}
              step="1"
              value={poForm.quantity}
              onChange={(e) => setPoForm({ ...poForm, quantity: parseFloat(e.target.value) || 0 })}
              className="[&_input]:font-mono [&_input]:text-right"
            />
            <Select
              label="Condición de pago"
              value={poForm.payment_terms}
              onChange={(e) => setPoForm({ ...poForm, payment_terms: e.target.value })}
            >
              <option>Contado</option>
              <option>15 días</option>
              <option>30 días</option>
              <option>60 días</option>
            </Select>
          </div>

          {selectedPoProduct && poForm.quantity > 0 && (
            <div className="flex items-center justify-between p-3 rounded-md bg-sunken border border-line">
              <span className="text-body text-ink-2">
                Total estimado al costo ({poForm.quantity} × {selectedPoProduct.cost_price})
              </span>
              <Money
                value={selectedPoProduct.cost_price * poForm.quantity}
                size="title"
                className="text-ink"
              />
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
