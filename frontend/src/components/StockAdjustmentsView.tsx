import React, { useState } from 'react';
import { AlertTriangle, Calculator, Eye, Lock, Plus, Sliders } from 'lucide-react';
import {
  Badge,
  Button,
  DataTable,
  DescriptionList,
  EmptyState,
  IconButton,
  Input,
  ImageUpload,
  Modal,
  PageHeader,
  PhotoThumb,
  Select,
  Tabs,
  Textarea,
  Toolbar,
  ToolbarSelect,
  cn,
  useToast,
} from '../ui';
import type { Column, TabItem } from '../ui';

type SubTab = 'adjustments' | 'losses' | 'audit';

const TABS: TabItem[] = [
  { id: 'adjustments', label: 'Historial', icon: <Sliders className="w-4 h-4" /> },
  { id: 'losses', label: 'Registrar merma', icon: <AlertTriangle className="w-4 h-4" /> },
  { id: 'audit', label: 'Auditoría ciega', icon: <Calculator className="w-4 h-4" /> },
];

/* El color comunica gravedad, no decora: la merma es pérdida, la auditoría es
   un procedimiento normal y la corrección manual pide revisión. */
const TYPE_LABEL: Record<AdjustmentRecord['type'], string> = {
  LOSS_DAMAGE: 'Merma o daño',
  PHYSICAL_AUDIT: 'Auditoría física',
  MANUAL_CORRECTION: 'Corrección manual',
};

const TYPE_TONE: Record<AdjustmentRecord['type'], 'danger' | 'neutral' | 'warning'> = {
  LOSS_DAMAGE: 'danger',
  PHYSICAL_AUDIT: 'neutral',
  MANUAL_CORRECTION: 'warning',
};

const STATUS_LABEL: Record<AdjustmentRecord['status'], string> = {
  DRAFT: 'Borrador',
  APPLIED: 'Aplicado',
  CANCELLED: 'Anulado',
};

const LOSS_REASONS = [
  'Vencido',
  'Roto o dañado',
  'Robo o extravío',
  'Error de conteo',
  'Devolución a proveedor',
];

interface AdjustmentRecord {
  id: string; // ADJ-4001
  date: string;
  type: 'LOSS_DAMAGE' | 'PHYSICAL_AUDIT' | 'MANUAL_CORRECTION';
  reason?: string;
  branch: string;
  items_count: number;
  user_name: string;
  status: 'DRAFT' | 'APPLIED' | 'CANCELLED';
  items: AdjustmentItem[];
  /** Foto del estante o del producto dañado que justifica el ajuste. */
  evidence_photo?: string;
}

interface AdjustmentItem {
  id: number;
  sku: string;
  name: string;
  theoretical_stock: number;
  physical_count: number;
  difference: number;
  unit_type: 'UNIT' | 'FRACTION' | 'SERIALIZED';
  serials?: string[];
}

export const StockAdjustmentsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'adjustments' | 'losses' | 'audit'>(
    'adjustments',
  );

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Modals
  const [isLossModalOpen, setIsLossModalOpen] = useState(false);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<AdjustmentRecord | null>(null);

  // Losses Form State
  const [lossReason, setLossReason] = useState('Vencido');
  const [lossNotes, setLossNotes] = useState('');
  const [lossPhoto, setLossPhoto] = useState<string | null>(null);
  const [supervisorPin, setSupervisorPin] = useState('');

  // Blind Audit State
  const [auditBranch] = useState('Almacén Central');
  const [auditItems] = useState<AdjustmentItem[]>([
    {
      id: 1,
      sku: 'SKU-1001',
      name: 'Coca Cola 2 Litros Retornable',
      theoretical_stock: 120,
      physical_count: 118,
      difference: -2,
      unit_type: 'UNIT',
    },
    {
      id: 2,
      sku: 'SKU-1002',
      name: 'Queso Criollo San Javier (Kg)',
      theoretical_stock: 45.0,
      physical_count: 45.0,
      difference: 0,
      unit_type: 'FRACTION',
    },
    {
      id: 3,
      sku: 'SKU-1003',
      name: 'Smartphone Samsung Galaxy A54 128GB',
      theoretical_stock: 5,
      physical_count: 6,
      difference: 1,
      unit_type: 'SERIALIZED',
      serials: ['IMEI-358492019482799'],
    },
  ]);

  // Mock Adjustment Records
  const [adjustments, setAdjustments] = useState<AdjustmentRecord[]>([
    {
      id: 'ADJ-4001',
      date: '14/08/2026 11:45',
      type: 'LOSS_DAMAGE',
      reason: 'Producto Vencido / Caducado',
      branch: 'Almacén Central',
      items_count: 2,
      user_name: 'Juan Pérez',
      status: 'APPLIED',
      items: [
        {
          id: 1,
          sku: 'SKU-1001',
          name: 'Coca Cola 2 Litros Retornable',
          theoretical_stock: 120,
          physical_count: 116,
          difference: -4,
          unit_type: 'UNIT',
        },
      ],
    },
    {
      id: 'ADJ-4002',
      date: '12/08/2026 18:20',
      type: 'PHYSICAL_AUDIT',
      reason: 'Auditoría Mensual Ciega de Tienda',
      branch: 'Sucursal Centro',
      items_count: 35,
      user_name: 'Administrador',
      status: 'APPLIED',
      items: [],
    },
  ]);

  const filteredAdjustments = adjustments.filter((adj) => {
    const matchesSearch =
      adj.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      adj.user_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || adj.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const toast = useToast();
  /* La auditoría ciega no muestra el stock esperado hasta confirmar: si lo
     mostrara, dejaría de ser ciega. */
  const [auditRevealed, setAuditRevealed] = useState(false);

  const applyLoss = () => {
    if (!lossNotes.trim() || !supervisorPin) return;
    const record: AdjustmentRecord = {
      id: `ADJ-${4000 + adjustments.length + 1}`,
      date: new Date().toLocaleString('es-ES'),
      type: 'LOSS_DAMAGE',
      reason: lossReason,
      branch: 'Almacén Central',
      items_count: 1,
      user_name: 'Administrador',
      status: 'APPLIED',
      items: [],
      evidence_photo: lossPhoto ?? undefined,
    };
    setAdjustments((prev) => [record, ...prev]);
    setLossNotes('');
    setLossPhoto(null);
    setSupervisorPin('');
    setIsLossModalOpen(false);
    toast('Merma registrada', 'success');
  };

  const columns: Array<Column<AdjustmentRecord>> = [
    {
      key: 'id',
      header: 'N.º ajuste',
      width: '120px',
      render: (a) => <span className="font-mono text-body text-ink">{a.id}</span>,
    },
    {
      key: 'date',
      header: 'Fecha y hora',
      width: '170px',
      render: (a) => <span className="font-mono tnum text-body text-ink-2">{a.date}</span>,
    },
    {
      key: 'type',
      header: 'Tipo',
      card: 'meta',
      width: '180px',
      render: (a) => <Badge tone={TYPE_TONE[a.type]}>{TYPE_LABEL[a.type]}</Badge>,
    },
    {
      key: 'reason',
      header: 'Motivo',
      card: 'title',
      render: (a) => <span className="text-body text-ink-2 truncate">{a.reason || '—'}</span>,
    },
    {
      key: 'branch',
      header: 'Almacén',
      width: '170px',
      render: (a) => <span className="text-body text-ink-2 truncate">{a.branch}</span>,
    },
    {
      key: 'items',
      header: 'Ítems',
      align: 'right',
      width: '90px',
      render: (a) => <span className="font-mono tnum text-ink-2">{a.items_count}</span>,
    },
    {
      key: 'user',
      header: 'Responsable',
      width: '160px',
      render: (a) => <span className="text-body text-ink-2 truncate">{a.user_name}</span>,
    },
    {
      key: 'status',
      header: 'Estado',
      align: 'right',
      width: '120px',
      render: (a) => (
        <Badge
          tone={a.status === 'APPLIED' ? 'success' : a.status === 'DRAFT' ? 'warning' : 'danger'}
        >
          {STATUS_LABEL[a.status]}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: '',
      card: 'hidden',
      align: 'right',
      width: '60px',
      render: (a) => (
        <IconButton label={`Ver ajuste ${a.id}`} tone="accent" onClick={() => setSelectedRecord(a)}>
          <Eye className="w-4 h-4" />
        </IconButton>
      ),
    },
  ];

  const auditColumns: Array<Column<AdjustmentItem>> = [
    {
      key: 'product',
      header: 'Producto',
      render: (it) => (
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink truncate">{it.name}</p>
          <p className="font-mono text-micro text-ink-3">{it.sku}</p>
        </div>
      ),
    },
    {
      key: 'counted',
      header: 'Conteo físico',
      align: 'right',
      width: '150px',
      render: (it) => (
        <span className="font-mono tnum text-base text-ink">
          {it.physical_count} {it.unit_type === 'FRACTION' ? 'kg' : 'u.'}
        </span>
      ),
    },
    {
      key: 'expected',
      header: 'Esperado',
      align: 'right',
      width: '140px',
      render: (it) =>
        auditRevealed ? (
          <span className="font-mono tnum text-ink-2">
            {it.theoretical_stock} {it.unit_type === 'FRACTION' ? 'kg' : 'u.'}
          </span>
        ) : (
          <span className="text-ink-3">oculto</span>
        ),
    },
    {
      key: 'diff',
      header: 'Diferencia',
      align: 'right',
      width: '140px',
      render: (it) =>
        auditRevealed ? (
          <span
            className={cn(
              'font-mono tnum font-semibold',
              it.difference === 0 ? 'text-ink-3' : it.difference > 0 ? 'text-ok' : 'text-danger',
            )}
          >
            {it.difference > 0 ? '+' : ''}
            {it.difference}
          </span>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-canvas select-none">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        <PageHeader
          title="Ajuste de stock"
          subtitle="Mermas, auditorías de inventario y correcciones manuales, con su rastro de auditoría."
          actions={
            <Button icon={<Plus className="w-4 h-4" />} onClick={() => setIsLossModalOpen(true)}>
              Nuevo ajuste
            </Button>
          }
          tabs={
            <Tabs
              items={TABS}
              value={activeSubTab}
              onChange={(id) => setActiveSubTab(id as SubTab)}
              label="Secciones de ajuste de stock"
            />
          }
        />

        {/* Una sola tabla: antes eran tres, con esqueletos distintos para la
            misma información. */}
        {activeSubTab === 'adjustments' && (
          <div className="space-y-4">
            <Toolbar
              search={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Buscar por número de ajuste o responsable…"
              filters={
                <ToolbarSelect
                  aria-label="Tipo de ajuste"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="ALL">Todos los tipos</option>
                  {(Object.keys(TYPE_LABEL) as Array<AdjustmentRecord['type']>).map((k) => (
                    <option key={k} value={k}>
                      {TYPE_LABEL[k]}
                    </option>
                  ))}
                </ToolbarSelect>
              }
            />
            <DataTable
              columns={columns}
              rows={filteredAdjustments}
              rowKey={(a) => a.id}
              empty={
                <EmptyState
                  icon={<Sliders className="w-6 h-6" />}
                  title="Sin ajustes que coincidan"
                  hint="Ajuste la búsqueda o el filtro de tipo."
                />
              }
            />
          </div>
        )}

        {activeSubTab === 'losses' && (
          <div className="max-w-2xl space-y-4">
            <div className="p-4 rounded-md bg-warn-soft border border-warn/30 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-warn" />
              <p className="text-body text-warn-ink leading-relaxed">
                Una merma descuenta stock de forma irreversible y queda registrada con el usuario
                que la aplicó. Requiere PIN de supervisor.
              </p>
            </div>
            <Button
              size="lg"
              icon={<AlertTriangle className="w-4 h-4" />}
              onClick={() => setIsLossModalOpen(true)}
            >
              Registrar merma
            </Button>
          </div>
        )}

        {activeSubTab === 'audit' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-base text-ink-2">
                Conteo de <strong className="text-ink">{auditBranch}</strong> · {auditItems.length}{' '}
                productos
              </p>
              <Button
                variant={auditRevealed ? 'secondary' : 'primary'}
                icon={<Calculator className="w-4 h-4" />}
                onClick={() => setAuditRevealed((v) => !v)}
              >
                {auditRevealed ? 'Ocultar esperado' : 'Revelar diferencias'}
              </Button>
            </div>
            <DataTable columns={auditColumns} rows={auditItems} rowKey={(it) => it.id} />
          </div>
        )}
      </div>

      {/* Detalle del ajuste */}
      <Modal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        icon={<Sliders className="w-4 h-4" />}
        title={selectedRecord ? `Ajuste ${selectedRecord.id}` : ''}
        subtitle={selectedRecord ? TYPE_LABEL[selectedRecord.type] : undefined}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setSelectedRecord(null)}>
            Cerrar
          </Button>
        }
      >
        {selectedRecord && (
          <div className="space-y-5">
            <DescriptionList
              items={[
                {
                  label: 'Fecha y hora',
                  value: <span className="font-mono">{selectedRecord.date}</span>,
                },
                { label: 'Responsable', value: selectedRecord.user_name },
                { label: 'Almacén', value: selectedRecord.branch },
                { label: 'Estado', value: STATUS_LABEL[selectedRecord.status] },
                { label: 'Motivo', value: selectedRecord.reason || '—', wide: true },
                {
                  label: 'Evidencia',
                  value: (
                    <PhotoThumb
                      src={selectedRecord.evidence_photo}
                      alt={`Evidencia del ajuste ${selectedRecord.id}`}
                      size="md"
                    />
                  ),
                },
              ]}
            />
            {selectedRecord.items.length > 0 && (
              <div className="space-y-2">
                <p className="text-micro uppercase text-ink-3">Productos ajustados</p>
                <div className="divide-y divide-line border border-line rounded-md">
                  {selectedRecord.items.map((it) => (
                    <div key={it.id} className="flex items-center gap-3 px-3 py-2.5">
                      <span className="flex-1 text-base text-ink truncate">{it.name}</span>
                      <span className="font-mono tnum text-body text-ink-2">
                        {it.theoretical_stock} → {it.physical_count}
                      </span>
                      <span
                        className={cn(
                          'font-mono tnum font-semibold w-16 text-right',
                          it.difference > 0
                            ? 'text-ok'
                            : it.difference < 0
                              ? 'text-danger'
                              : 'text-ink-3',
                        )}
                      >
                        {it.difference > 0 ? '+' : ''}
                        {it.difference}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Registrar merma */}
      <Modal
        isOpen={isLossModalOpen}
        onClose={() => setIsLossModalOpen(false)}
        icon={<AlertTriangle className="w-4 h-4" />}
        title="Registrar merma"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsLossModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              disabled={!lossNotes.trim() || !supervisorPin}
              onClick={applyLoss}
            >
              Aplicar merma
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select label="Motivo" value={lossReason} onChange={(e) => setLossReason(e.target.value)}>
            {LOSS_REASONS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </Select>
          <Textarea
            label="Detalle"
            hint="Todo ajuste exige motivo: queda en el rastro de auditoría."
            rows={3}
            value={lossNotes}
            onChange={(e) => setLossNotes(e.target.value)}
            placeholder="Qué producto, cuánto y por qué…"
          />
          <ImageUpload
            value={lossPhoto}
            onChange={setLossPhoto}
            label="Foto del producto o del estante"
            hint="Con foto, el supervisor decide sin bajar al almacén."
            preview="lg"
            maxSize={1200}
          />
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

      {/* Reconciliación de auditoría */}
      <Modal
        isOpen={isReconciliationModalOpen}
        onClose={() => setIsReconciliationModalOpen(false)}
        icon={<Calculator className="w-4 h-4" />}
        title="Aplicar resultado de la auditoría"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsReconciliationModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsReconciliationModalOpen(false)}>Aplicar</Button>
          </>
        }
      >
        <p className="text-base text-ink-2 leading-relaxed">
          El stock del sistema pasará a coincidir con el conteo físico y se generará un ajuste de
          tipo auditoría con el detalle de cada diferencia.
        </p>
      </Modal>

      {/* Auditoría ciega */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        icon={<Calculator className="w-4 h-4" />}
        title="Nueva auditoría ciega"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAuditModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsAuditModalOpen(false)}>Comenzar conteo</Button>
          </>
        }
      >
        <p className="text-base text-ink-2 leading-relaxed">
          Durante el conteo no se muestra el stock esperado: quien cuenta anota lo que ve, y las
          diferencias se revelan solo al cerrar la auditoría.
        </p>
      </Modal>
    </div>
  );
};
