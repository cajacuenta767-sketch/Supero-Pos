import React, { useState } from 'react';
import { 
  Settings, 
  Building2, 
  Printer, 
  RefreshCw, 
  Save, 
  CheckCircle2, 
  Moon, 
  Sun, 
  ShieldAlert, 
  Scale, 
  Scan, 
  Upload, 
  Clock, 
  AlertTriangle
} from 'lucide-react';
import { useThemeStore } from '../store/useThemeStore';

interface Branch {
 id: string;
 name: string;
 code: string;
 address: string;
 phone: string;
}

export const SettingsView: React.FC = () => {
 const { isDarkMode, toggleTheme } = useThemeStore();
 const [activeSubTab, setActiveSubTab] = useState<'company' | 'hardware' | 'security' | 'sync'>('company');

  // 1. Company & Fiscal Settings
 const [companyName, setCompanyName] = useState('SUPERO POS ENTERPRISE S.R.L.');
 const [companyNit, setCompanyNit] = useState('10293847019');
 const [companyAddress, setCompanyAddress] = useState('Av. Las Palmas #450, Santa Cruz - Bolivia');
 const [phone, setPhone] = useState('+591 70012345');
 const [email, setEmail] = useState('contacto@superopos.com');
 const [currency, setCurrency] = useState('BOB');
 const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Branches Management State
 const [branches] = useState<Branch[]>([
    { id: 'BR-01', name: 'Sucursal Central (Matriz)', code: 'SC-01', address: 'Av. Las Palmas #450', phone: '+591 3 3456789' },
    { id: 'BR-02', name: 'Sucursal Centro Comercio', code: 'SC-02', address: 'Calle Junín #120', phone: '+591 3 3456790' },
    { id: 'BR-03', name: 'Almacén General Depósito', code: 'ALM-01', address: 'Zona Industrial Parque', phone: '+591 3 3456791' }
  ]);

  // 2. Hardware & POS Peripherals Settings
 const [printerInterface, setPrinterInterface] = useState('USB');
 const [paperWidth, setPaperWidth] = useState('80mm');
 const [autoCutPaper, setAutoCutPaper] = useState(true);
 const [cashDrawerPulse, setCashDrawerPulse] = useState(true);
 const [scannerLatency, setScannerLatency] = useState(10); // ms
 const [scaleProtocol, setScaleProtocol] = useState('CAS_PD_II'); // Serial Scale protocol

  // 3. Security & Operational Rules Settings
 const [inactivityTimeoutMins, setInactivityTimeoutMins] = useState(15);
 const [requireSupervisorPinForVoids, setRequireSupervisorPinForVoids] = useState(true);
 const [requireSupervisorPinForDiscounts, setRequireSupervisorPinForDiscounts] = useState(true);
 const [criticalStockThreshold, setCriticalStockThreshold] = useState(5);

  // 4. Offline Persistence & Sync Worker Settings
 const [syncIntervalSec, setSyncIntervalSec] = useState(30);
 const [pendingQueueCount] = useState(0); // 0 pending items

 const handleSaveSettings = (e: React.FormEvent) => {
 e.preventDefault();
 alert('✅ Parámetros globales del sistema guardados correctamente.');
  };

 const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files && e.target.files[0]) {
 const reader = new FileReader();
 reader.onload = (upload) => {
 setLogoPreview(upload.target?.result as string);
      };
 reader.readAsDataURL(e.target.files[0]);
    }
  };

 return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <Settings className="w-7 h-7 text-blue-500" />
            Ajustes y Configuración Global del Sistema
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Configuración institucional, periféricos POS, políticas de seguridad RBAC y motor de sincronización offline SQLite
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center bg-sunken p-1.5 rounded-md border border-line">
          <button
 onClick={() => setActiveSubTab('company')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'company' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Empresa & Sucursales
          </button>
          <button
 onClick={() => setActiveSubTab('hardware')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'hardware' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <Printer className="w-4 h-4" />
            Hardware & Balanzas
          </button>
          <button
 onClick={() => setActiveSubTab('security')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'security' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Seguridad & Reglas POS
          </button>
          <button
 onClick={() => setActiveSubTab('sync')}
 className={`px-3.5 py-2 rounded-md text-body font-bold flex items-center gap-1.5 transition-all ${
 activeSubTab === 'sync' ? 'bg-raised text-accent shadow-e1' : 'text-gray-500'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            Sincronización Local SQLite
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: COMPANY IDENTITY & BRANCHES */}
      {activeSubTab === 'company' && (
        <div className="space-y-6 max-w-4xl">
          <form onSubmit={handleSaveSettings} className="bg-raised p-6 rounded-md border border-line shadow-e1 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" /> Identidad Corporativa y Configuración Fiscal
              </h3>
              <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-body font-extrabold flex items-center gap-1.5 shadow">
                <Save className="w-4 h-4" /> Guardar Cambios
              </button>
            </div>

            {/* Logo Loader Section */}
            <div className="flex items-center gap-6 p-4 bg-sunken rounded-md border border-line">
              <div className="w-20 h-20 bg-raised border-2 border-dashed border-line-strong rounded-md flex items-center justify-center overflow-hidden">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo Oficial" className="w-full h-full object-contain" />
                ) : (
                  <Building2 className="w-8 h-8 text-gray-400" />
                )}
              </div>

              <div className="space-y-1">
                <span className="font-extrabold text-body text-ink block">Logotipo Oficial Institucional</span>
                <p className="text-micro text-gray-500">Se imprimirá en la cabecera de comprobantes térmicos y facturas PDF (PNG/JPG máx 2MB)</p>
                <label className="mt-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-body font-bold flex items-center gap-1.5 w-fit cursor-pointer shadow">
                  <Upload className="w-3.5 h-3.5" /> Subir Imagen Logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body">
              <div>
                <label className="font-bold text-ink-2">Razón Social / Nombre Oficial *</label>
                <input
 type="text" required
 value={companyName}
 onChange={(e) => setCompanyName(e.target.value)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-bold text-ink"
                />
              </div>

              <div>
                <label className="font-bold text-ink-2">NIT / RUC Fiscal *</label>
                <input
 type="text" required
 value={companyNit}
 onChange={(e) => setCompanyNit(e.target.value)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-mono font-bold text-ink"
                />
              </div>

              <div className="md:col-span-2">
                <label className="font-bold text-ink-2">Dirección Matriz *</label>
                <input
 type="text" required
 value={companyAddress}
 onChange={(e) => setCompanyAddress(e.target.value)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-semibold text-ink"
                />
              </div>

              <div>
                <label className="font-bold text-ink-2">Teléfono / WhatsApp de Atención</label>
                <input
 type="text"
 value={phone}
 onChange={(e) => setPhone(e.target.value)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-ink-2">Correo Electrónico Oficial</label>
                <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-ink-2">Moneda Base de Operación</label>
                <select
 value={currency}
 onChange={(e) => setCurrency(e.target.value)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-bold"
                >
                  <option value="BOB">BOB (Bs. - Bolivianos)</option>
                  <option value="USD">USD ($ - Dólar Estadounidense)</option>
                </select>
              </div>
            </div>
          </form>

          {/* Branches Directory Table */}
          <div className="bg-raised p-6 rounded-md border border-line shadow-e1 space-y-4">
            <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-500" /> Directorio de Sucursales y Almacenes Vinculados
            </h3>

            <div className="border border-line rounded-md overflow-hidden">
              <table className="w-full text-left text-body border-collapse">
                <thead>
                  <tr className="bg-sunken text-gray-500 font-extrabold uppercase text-micro border-b border-line">
                    <th className="p-3">Código</th>
                    <th className="p-3">Nombre Sucursal</th>
                    <th className="p-3">Ubicación Física</th>
                    <th className="p-3">Teléfono</th>
                    <th className="p-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {branches.map(b => (
                    <tr key={b.id}>
                      <td className="p-3 font-mono font-bold text-accent">{b.code}</td>
                      <td className="p-3 font-bold text-ink">{b.name}</td>
                      <td className="p-3 font-semibold text-ink-2">{b.address}</td>
                      <td className="p-3 font-mono text-gray-500">{b.phone}</td>
                      <td className="p-3 text-right">
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 rounded font-bold text-micro">
                          OPERATIVA
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: HARDWARE & POS PERIPHERALS */}
      {activeSubTab === 'hardware' && (
        <div className="bg-raised p-6 rounded-md border border-line shadow-e1 space-y-6 max-w-3xl">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
              <Printer className="w-5 h-5 text-blue-500" /> Periféricos POS: Impresora, Gaveta & Balanza Electrónica
            </h3>
            <button onClick={() => alert('🖨️ Imprimiendo ticket de calibración hardware...')} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-body font-bold flex items-center gap-1.5 shadow">
              Imprimir Comprobante de Prueba
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-body">
            <div>
              <label className="font-bold text-ink-2">Interfaz de Impresora Térmica *</label>
              <select
 value={printerInterface}
 onChange={(e) => setPrinterInterface(e.target.value)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-bold"
              >
                <option value="USB">Conexión USB Directa (Electron IPC / node-escpos)</option>
                <option value="SERIAL">Puerto Serie Virtual COM (COM1 - COM4)</option>
                <option value="NETWORK">Impresora de Red IP (TCP/IP Port 9100)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-ink-2">Ancho de Papel Térmico</label>
              <select
 value={paperWidth}
 onChange={(e) => setPaperWidth(e.target.value)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-bold"
              >
                <option value="80mm">80 mm (Estándar Mostrador)</option>
                <option value="58mm">58 mm (Impresora Portátil)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-ink-2 flex items-center gap-1">
                <Scan className="w-3.5 h-3.5 text-blue-500" /> Latencia de Lectura Pistola Láser
              </label>
              <input
 type="number"
 value={scannerLatency}
 onChange={(e) => setScannerLatency(parseInt(e.target.value) || 10)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-mono font-bold"
              />
              <span className="text-micro text-gray-400">Tolerancia recomendada: 10ms</span>
            </div>

            <div>
              <label className="font-bold text-ink-2 flex items-center gap-1">
                <Scale className="w-3.5 h-3.5 text-purple-500" /> Protocolo Balanza Electrónica
              </label>
              <select
 value={scaleProtocol}
 onChange={(e) => setScaleProtocol(e.target.value)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-bold"
              >
                <option value="CAS_PD_II">CAS PD-II / Serial RS232</option>
                <option value="TOLEDO_8217">Mettler Toledo 8217</option>
                <option value="SYSTEL">Systel Croma / Clipse</option>
              </select>
            </div>

            <div className="md:col-span-2 space-y-3 pt-2">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
 type="checkbox"
 checked={autoCutPaper}
 onChange={(e) => setAutoCutPaper(e.target.checked)}
 className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Enviar comando de guillotina / auto-corte de papel tras imprimir ticket</span>
              </label>

              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
 type="checkbox"
 checked={cashDrawerPulse}
 onChange={(e) => setCashDrawerPulse(e.target.checked)}
 className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Enviar pulso eléctrico a gaveta portamonedas al liquidar venta en efectivo</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: SECURITY & OPERATIONAL RULES */}
      {activeSubTab === 'security' && (
        <div className="bg-raised p-6 rounded-md border border-line shadow-e1 space-y-6 max-w-3xl">
          <div className="border-b border-line pb-4">
            <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-500" /> Políticas de Seguridad Operativa & Reglas RBAC
            </h3>
          </div>

          <div className="space-y-4 text-body">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-ink-2 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-500" /> Inactividad para Bloqueo de Pantalla (Minutos)
                </label>
                <input
 type="number"
 value={inactivityTimeoutMins}
 onChange={(e) => setInactivityTimeoutMins(parseInt(e.target.value) || 15)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-ink-2 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Umbral General Stock Crítico
                </label>
                <input
 type="number"
 value={criticalStockThreshold}
 onChange={(e) => setCriticalStockThreshold(parseInt(e.target.value) || 5)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-mono font-bold"
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
 type="checkbox"
 checked={requireSupervisorPinForVoids}
 onChange={(e) => setRequireSupervisorPinForVoids(e.target.checked)}
 className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Exigir PIN de Supervisor para Anulación de Tickets en POS</span>
              </label>

              <label className="flex items-center gap-2 font-bold cursor-pointer">
                <input
 type="checkbox"
 checked={requireSupervisorPinForDiscounts}
 onChange={(e) => setRequireSupervisorPinForDiscounts(e.target.checked)}
 className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Exigir PIN de Supervisor para Aplicar Descuentos Libres en Carrito</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: OFFLINE SYNC WORKER & SQLITE ARCHITECTURE */}
      {activeSubTab === 'sync' && (
        <div className="bg-raised p-6 rounded-md border border-line shadow-e1 space-y-6 max-w-3xl">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-emerald-500" /> Arquitectura Offline-First & Cola SQLite (sync_queue)
            </h3>
            <button onClick={() => alert('⚡ Bucle de sincronización bidireccional ejecutado en segundo plano.')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-body font-bold flex items-center gap-1.5 shadow">
              Forzar Sincronización Ahora
            </button>
          </div>

          <div className="space-y-4 text-body">
            <div className="p-4 bg-ok-soft border border-emerald-200 rounded-md space-y-1">
              <span className="font-extrabold text-ok-ink flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Persistencia Local Autónoma SQLite (better-sqlite3)
              </span>
              <p className="text-micro text-ink-2">
                La terminal opera sin interrupciones ante cortes de red. Las ventas y stock se almacenan en <code>sync_queue</code> y se transmiten al detectar señal.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-ink-2">Frecuencia del Worker Loop (Segundos) *</label>
                <input
 type="number"
 value={syncIntervalSec}
 onChange={(e) => setSyncIntervalSec(parseInt(e.target.value) || 30)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-ink-2">Estado de Cola Pendiente</label>
                <div className="mt-1 p-2.5 bg-sunken border border-line rounded-md font-mono font-bold flex items-center justify-between">
                  <span>Transacciones Pendientes:</span>
                  <span className="text-ok">{pendingQueueCount} ítems (Sincronizado)</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-sunken rounded-md border border-line flex items-center justify-between">
              <div>
                <span className="font-bold text-ink block">Tema de Interfaz de Usuario</span>
                <span className="text-gray-500 text-micro">Alternar entre Light Mode (#FFFFFF) y Dark Mode (#000000)</span>
              </div>
              <button
 onClick={toggleTheme}
 className="px-4 py-2 bg-blue-600 text-white rounded-md font-extrabold flex items-center gap-2 shadow"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {isDarkMode ? 'Modo Claro' : 'Modo Oscuro'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
