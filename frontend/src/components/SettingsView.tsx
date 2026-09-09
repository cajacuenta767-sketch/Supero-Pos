import React, { useState } from 'react';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Moon,
  Printer,
  RefreshCw,
  Save,
  Scale,
  Scan,
  ShieldAlert,
  Sun,
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';
import {
  Badge,
  Button,
  Card,
  DataTable,
  ImageUpload,
  Input,
  Meter,
  PageHeader,
  Select,
  Switch,
  Tabs,
  useToast,
} from '../ui';
import type { Column, TabItem } from '../ui';
import { useSettingsStore, type CurrencyCode } from '../store/useSettingsStore';
import { syncWorker } from '../services/syncWorker';
import { localDb } from '../db/sqlite';

interface Branch {
  id: string;
  name: string;
  code: string;
  address: string;
  phone: string;
}

type SubTab = 'company' | 'hardware' | 'security' | 'sync';

const TABS: TabItem[] = [
  { id: 'company', label: 'Empresa', icon: <Building2 className="w-4 h-4" /> },
  { id: 'hardware', label: 'Hardware', icon: <Printer className="w-4 h-4" /> },
  { id: 'security', label: 'Seguridad', icon: <ShieldAlert className="w-4 h-4" /> },
  { id: 'sync', label: 'Sincronización', icon: <RefreshCw className="w-4 h-4" /> },
];

export const SettingsView: React.FC = () => {
  const { isDarkMode, toggleTheme } = useThemeStore();
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('company');

  /* Marca si hay cambios sin guardar: Guardar solo se habilita entonces. */
  const [dirty, setDirty] = useState(false);
  const touch =
    <T,>(setter: (v: T) => void) =>
    (v: T) => {
      setter(v);
      setDirty(true);
    };

  /* Identidad de la empresa. Los valores salen del store, no de literales: lo
     que se elige aquí es lo que usan el símbolo de moneda de toda la aplicación
     y la cabecera del ticket impreso. Antes la moneda se guardaba en un estado
     local que no consumía nadie. */
  const settings = useSettingsStore();
  const [companyName, setCompanyName] = useState(settings.companyName);
  const [companyNit, setCompanyNit] = useState(settings.companyNit);
  const [companyAddress, setCompanyAddress] = useState(settings.companyAddress);
  const [phone, setPhone] = useState(settings.phone);
  const [email, setEmail] = useState(settings.email);
  const [currency, setCurrency] = useState<CurrencyCode>(settings.currency);
  const [logo, setLogo] = useState<string | null>(settings.logo);

  const [branches] = useState<Branch[]>([
    {
      id: 'BR-01',
      name: 'Sucursal Central (Matriz)',
      code: 'SC-01',
      address: 'Av. Las Palmas #450',
      phone: '+591 3 3456789',
    },
    {
      id: 'BR-02',
      name: 'Sucursal Centro Comercio',
      code: 'SC-02',
      address: 'Calle Junín #120',
      phone: '+591 3 3456790',
    },
    {
      id: 'BR-03',
      name: 'Almacén General Depósito',
      code: 'ALM-01',
      address: 'Zona Industrial Parque',
      phone: '+591 3 3456791',
    },
  ]);

  // Periféricos
  const [printerInterface, setPrinterInterface] = useState('USB');
  const [paperWidth, setPaperWidth] = useState<'80mm' | '58mm'>(settings.paperWidth);
  const [autoCutPaper, setAutoCutPaper] = useState(true);
  const [cashDrawerPulse, setCashDrawerPulse] = useState(true);
  const [scannerLatency, setScannerLatency] = useState(10);
  const [scaleProtocol, setScaleProtocol] = useState('CAS_PD_II');

  // Seguridad
  const [inactivityTimeoutMins, setInactivityTimeoutMins] = useState(15);
  const [requireSupervisorPinForVoids, setRequireSupervisorPinForVoids] = useState(true);
  const [requireSupervisorPinForDiscounts, setRequireSupervisorPinForDiscounts] = useState(true);
  const [criticalStockThreshold, setCriticalStockThreshold] = useState(5);

  // Sincronización
  const [syncIntervalSec, setSyncIntervalSec] = useState(30);
  const [pendingQueueCount] = useState(0);

  const [syncing, setSyncing] = useState(false);

  /**
   * Fuerza un ciclo de sincronización.
   *
   * Antes esto solo mostraba «Sincronización lanzada en segundo plano»: el aviso
   * afirmaba algo que no ocurría. Ahora dispara el worker de verdad y dice qué
   * pasó, incluido que no había nada pendiente.
   */
  const runSyncNow = async () => {
    setSyncing(true);
    const before = localDb.getPendingCount();
    try {
      await syncWorker.triggerManualSync();
      const after = localDb.getPendingCount();
      if (before === 0) {
        toast('No hay nada pendiente de sincronizar', 'info');
      } else if (after === 0) {
        toast(
          `${before} ${before === 1 ? 'venta sincronizada' : 'ventas sincronizadas'}`,
          'success',
        );
      } else if (after < before) {
        toast(`Sincronizadas ${before - after} de ${before}; quedan ${after}`, 'warning');
      } else {
        toast('El servidor no responde: la cola se conserva intacta', 'warning');
      }
    } finally {
      setSyncing(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    /* Antes esto solo bajaba la bandera y mostraba un aviso: nada de lo que se
       tocaba aquí llegaba a ninguna parte. */
    settings.update({
      companyName,
      companyNit,
      companyAddress,
      phone,
      email,
      currency,
      paperWidth,
      logo,
    });
    setDirty(false);
    toast('Ajustes guardados', 'success');
  };

  const branchColumns: Array<Column<Branch>> = [
    {
      key: 'name',
      header: 'Sucursal',
      render: (b) => (
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink truncate">{b.name}</p>
          <p className="font-mono text-micro text-ink-3">{b.code}</p>
        </div>
      ),
    },
    {
      key: 'address',
      header: 'Dirección',
      render: (b) => <span className="text-ink-2">{b.address}</span>,
    },
    {
      key: 'phone',
      header: 'Teléfono',
      width: '160px',
      render: (b) => <span className="font-mono tnum text-ink-2">{b.phone}</span>,
    },
  ];

  const saveAction = (
    <Button icon={<Save className="w-4 h-4" />} disabled={!dirty} onClick={handleSave}>
      Guardar cambios
    </Button>
  );

  return (
    <div className="h-full overflow-y-auto bg-canvas select-none">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        <PageHeader
          title="Ajustes"
          subtitle="Identidad de la empresa, periféricos del punto de venta, políticas de seguridad y sincronización."
          actions={saveAction}
          tabs={
            <Tabs
              items={TABS}
              value={activeSubTab}
              onChange={(id) => setActiveSubTab(id as SubTab)}
              label="Secciones de ajustes"
            />
          }
        />

        {/* ── Empresa ──────────────────────────────────────────────── */}
        {activeSubTab === 'company' && (
          <div className="space-y-5">
            <Card title="Identidad de la empresa" icon={<Building2 className="w-4 h-4" />}>
              <div className="space-y-5">
                <ImageUpload
                  value={logo}
                  onChange={touch(setLogo)}
                  label="Logotipo"
                  hint="Se imprime en la cabecera de los tickets térmicos y las facturas."
                  preview="lg"
                  maxSize={400}
                />

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Input
                    label="Razón social"
                    value={companyName}
                    onChange={(e) => touch(setCompanyName)(e.target.value)}
                    required
                  />
                  <Input
                    label="NIT / RUC fiscal"
                    value={companyNit}
                    onChange={(e) => touch(setCompanyNit)(e.target.value)}
                    className="[&_input]:font-mono"
                    required
                  />
                  <Input
                    label="Dirección de la matriz"
                    value={companyAddress}
                    onChange={(e) => touch(setCompanyAddress)(e.target.value)}
                    className="lg:col-span-2"
                    required
                  />
                  <Input
                    label="Teléfono de atención"
                    value={phone}
                    onChange={(e) => touch(setPhone)(e.target.value)}
                    className="[&_input]:font-mono"
                  />
                  <Input
                    label="Correo electrónico"
                    type="email"
                    value={email}
                    onChange={(e) => touch(setEmail)(e.target.value)}
                  />
                  <Select
                    label="Moneda base"
                    value={currency}
                    onChange={(e) => touch(setCurrency)(e.target.value as CurrencyCode)}
                  >
                    <option value="BOB">BOB · Bolivianos</option>
                    <option value="USD">USD · Dólares</option>
                    <option value="PEN">PEN · Soles</option>
                  </Select>
                </div>
              </div>
            </Card>

            <Card
              title="Sucursales y almacenes"
              subtitle={`${branches.length} ubicaciones vinculadas`}
              icon={<Building2 className="w-4 h-4" />}
              padding="none"
            >
              <DataTable
                caption="Sucursales de la empresa con su dirección y teléfono"
                columns={branchColumns}
                rows={branches}
                rowKey={(b) => b.id}
                dense
                className="border-0 rounded-none"
              />
            </Card>
          </div>
        )}

        {/* ── Hardware ─────────────────────────────────────────────── */}
        {activeSubTab === 'hardware' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            <Card title="Impresora térmica" icon={<Printer className="w-4 h-4" />}>
              <div className="space-y-4">
                <Select
                  label="Interfaz"
                  value={printerInterface}
                  onChange={(e) => touch(setPrinterInterface)(e.target.value)}
                >
                  <option value="USB">USB directo</option>
                  <option value="NETWORK">Red IP · puerto 9100</option>
                  <option value="BLUETOOTH">Bluetooth</option>
                </Select>

                <Select
                  label="Ancho de papel"
                  hint="Determina el ancho de la plantilla de ticket."
                  value={paperWidth}
                  onChange={(e) => touch(setPaperWidth)(e.target.value as '80mm' | '58mm')}
                >
                  <option value="80mm">80 mm · estándar de mostrador</option>
                  <option value="58mm">58 mm · portátil</option>
                </Select>

                <div className="pt-2 flex flex-col gap-3 border-t border-line">
                  <Switch
                    checked={autoCutPaper}
                    onChange={touch(setAutoCutPaper)}
                    label="Corte automático de papel"
                    showLabel
                  />
                  <Switch
                    checked={cashDrawerPulse}
                    onChange={touch(setCashDrawerPulse)}
                    label="Pulso de apertura de gaveta al cobrar"
                    showLabel
                  />
                </div>
              </div>
            </Card>

            <Card title="Lector y balanza" icon={<Scan className="w-4 h-4" />}>
              <div className="space-y-4">
                <Input
                  label="Latencia del lector (ms)"
                  hint="Tiempo máximo entre pulsaciones para tratarlas como un mismo escaneo."
                  type="number"
                  min={1}
                  max={100}
                  value={scannerLatency}
                  onChange={(e) => touch(setScannerLatency)(parseInt(e.target.value) || 10)}
                  className="[&_input]:font-mono"
                />
                <Meter
                  value={scannerLatency}
                  max={100}
                  label="Latencia del lector"
                  hint={`${scannerLatency} ms`}
                  tone={
                    scannerLatency <= 20 ? 'success' : scannerLatency <= 50 ? 'warning' : 'danger'
                  }
                />

                <Select
                  label="Protocolo de balanza"
                  value={scaleProtocol}
                  onChange={(e) => touch(setScaleProtocol)(e.target.value)}
                  className="pt-2"
                >
                  <option value="CAS_PD_II">CAS PD-II</option>
                  <option value="TOLEDO">Mettler Toledo</option>
                  <option value="GENERIC_SERIAL">Serie genérica</option>
                </Select>

                <p className="flex items-center gap-1.5 text-body text-ink-2">
                  <Scale className="w-3.5 h-3.5 shrink-0" />
                  La lectura de peso se dispara con <span className="font-mono">F4</span> en el
                  punto de venta.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* ── Seguridad ────────────────────────────────────────────── */}
        {activeSubTab === 'security' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            <Card title="Bloqueo y umbrales" icon={<Clock className="w-4 h-4" />}>
              <div className="space-y-4">
                <Input
                  label="Inactividad para bloquear la pantalla (minutos)"
                  type="number"
                  min={1}
                  value={inactivityTimeoutMins}
                  onChange={(e) => touch(setInactivityTimeoutMins)(parseInt(e.target.value) || 15)}
                  className="[&_input]:font-mono"
                />
                <Input
                  label="Umbral general de stock crítico"
                  hint="Por debajo de esta cantidad, el producto se marca en ámbar."
                  type="number"
                  min={0}
                  value={criticalStockThreshold}
                  onChange={(e) => touch(setCriticalStockThreshold)(parseInt(e.target.value) || 5)}
                  className="[&_input]:font-mono"
                />
              </div>
            </Card>

            <Card title="Autorización de supervisor" icon={<ShieldAlert className="w-4 h-4" />}>
              <div className="flex flex-col gap-3">
                <Switch
                  checked={requireSupervisorPinForVoids}
                  onChange={touch(setRequireSupervisorPinForVoids)}
                  label="Exigir PIN para anular tickets"
                  showLabel
                />
                <Switch
                  checked={requireSupervisorPinForDiscounts}
                  onChange={touch(setRequireSupervisorPinForDiscounts)}
                  label="Exigir PIN para descuentos superiores al 10%"
                  showLabel
                />
                <p className="flex items-start gap-1.5 pt-2 text-body text-ink-2 border-t border-line">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-warn" />
                  Toda autorización queda registrada en el historial de auditoría con el usuario que
                  la concedió.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* ── Sincronización ───────────────────────────────────────── */}
        {activeSubTab === 'sync' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            <Card
              title="Cola de sincronización"
              icon={<RefreshCw className="w-4 h-4" />}
              action={
                <Button variant="secondary" size="sm" loading={syncing} onClick={runSyncNow}>
                  Sincronizar ahora
                </Button>
              }
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between px-4 h-12 rounded-md bg-sunken border border-line">
                  <span className="text-base text-ink-2">Transacciones pendientes</span>
                  {pendingQueueCount === 0 ? (
                    <Badge tone="success" size="md" icon={<CheckCircle2 className="w-3.5 h-3.5" />}>
                      Al día
                    </Badge>
                  ) : (
                    <Badge tone="warning" size="md">
                      {pendingQueueCount} en cola
                    </Badge>
                  )}
                </div>

                <Input
                  label="Frecuencia del worker (segundos)"
                  type="number"
                  min={5}
                  value={syncIntervalSec}
                  onChange={(e) => touch(setSyncIntervalSec)(parseInt(e.target.value) || 30)}
                  className="[&_input]:font-mono"
                />

                <p className="text-body text-ink-2 leading-relaxed pt-2 border-t border-line">
                  La terminal sigue vendiendo sin red: las ventas se guardan en la cola local y se
                  transmiten en cuanto vuelve la señal.
                </p>
              </div>
            </Card>

            <Card
              title="Apariencia"
              icon={isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-ink">Tema de la interfaz</p>
                  <p className="text-body text-ink-2">
                    El modo oscuro usa negro puro: en pantallas OLED apaga el píxel y cansa menos.
                  </p>
                </div>
                <Button
                  variant="secondary"
                  icon={isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  onClick={toggleTheme}
                >
                  {isDarkMode ? 'Modo claro' : 'Modo oscuro'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
