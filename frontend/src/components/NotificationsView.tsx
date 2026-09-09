import React, { useState } from 'react';
import { 
  Bell, 
  Printer, 
  MessageSquare, 
  Mail, 
  Eye, 
  RotateCcw, 
  Save, 
  Settings2
} from 'lucide-react';

interface TicketTemplateConfig {
  paper_width: '58mm' | '80mm';
  company_name: string;
  company_nit: string;
  company_address: string;
  header_logo_enabled: boolean;
  show_customer_info: boolean;
  show_imei_serials: boolean;
  footer_message: string;
  legal_disclaimer: string;
  show_qr_validation: boolean;
  branch: string;
}

export const NotificationsView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'thermal-editor' | 'digital-channels' | 'branch-rules'>('thermal-editor');

  // Thermal Template Configuration State
  const [config, setConfig] = useState<TicketTemplateConfig>({
    paper_width: '80mm',
    company_name: 'SUPERO POS ENTERPRISE S.R.L.',
    company_nit: '10293847019',
    company_address: 'Av. Las Palmas #450, Santa Cruz - Bolivia',
    header_logo_enabled: true,
    show_customer_info: true,
    show_imei_serials: true,
    footer_message: '¡Gracias por su compra! Vuelva pronto.',
    legal_disclaimer: 'ESTE DOCUMENTO ES UNA REPRESENTACIÓN DE COMPROBANTE DE VENTA INTERNO.',
    show_qr_validation: true,
    branch: 'Sucursal Central'
  });

  // Digital Channels Configuration
  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    'Hola {{client_name}}, gracias por tu compra en {{company_name}}. Aquí tienes tu comprobante digital #{{ticket_number}} por un total de ${{total_amount}}. Ver en PDF: {{pdf_url}}'
  );

  const handleResetToDefault = () => {
    setConfig({
      paper_width: '80mm',
      company_name: 'SUPERO POS ENTERPRISE S.R.L.',
      company_nit: '10293847019',
      company_address: 'Av. Las Palmas #450, Santa Cruz - Bolivia',
      header_logo_enabled: true,
      show_customer_info: true,
      show_imei_serials: true,
      footer_message: '¡Gracias por su compra! Vuelva pronto.',
      legal_disclaimer: 'ESTE DOCUMENTO ES UNA REPRESENTACIÓN DE COMPROBANTE DE VENTA INTERNO.',
      show_qr_validation: true,
      branch: 'Sucursal Central'
    });
    alert('🔄 Plantilla restablecida a los valores predeterminados de fábrica.');
  };

  const handleSaveConfig = () => {
    alert('✅ Plantilla de impresión térmica y comprobantes digitales guardada correctamente.');
  };

  return (
    <div className="p-6 bg-gray-50 dark:bg-[#000000] h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-200">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121212] p-5 rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-7 h-7 text-blue-500" />
            12. Plantillas de Notificación & Comprobantes Digitales
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Diseñador de tickets térmicos (58mm/80mm), comprobantes en PDF, envío por WhatsApp y correo electrónico
          </p>
        </div>

        {/* Sub-tabs Switcher */}
        <div className="flex items-center bg-gray-100 dark:bg-[#0B0C10] p-1.5 rounded-xl border border-gray-200 dark:border-[#1F2833]">
          <button
            onClick={() => setActiveSubTab('thermal-editor')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'thermal-editor' ? 'bg-white dark:bg-[#121212] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Printer className="w-4 h-4" />
            Diseñador Ticket Térmico
          </button>
          <button
            onClick={() => setActiveSubTab('digital-channels')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'digital-channels' ? 'bg-white dark:bg-[#121212] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            WhatsApp & Email
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: THERMAL TICKET DESIGNER & LIVE PREVIEW */}
      {activeSubTab === 'thermal-editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel: Configuration Form */}
          <div className="lg:col-span-7 bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F2833] pb-4">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-blue-500" /> Parámetros del Comprobante Impreso
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetToDefault}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-[#0B0C10] hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold flex items-center gap-1 border border-gray-200 dark:border-[#1F2833]"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restablecer
                </button>
                <button
                  onClick={handleSaveConfig}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-3.5 h-3.5" /> Guardar
                </button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              {/* Paper Width & Branch */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">Ancho de Papel Térmico *</label>
                  <select
                    value={config.paper_width}
                    onChange={(e) => setConfig({ ...config, paper_width: e.target.value as any })}
                    className="w-full mt-1 p-2.5 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-bold"
                  >
                    <option value="80mm">Impresora Térmica 80 mm (Estándar)</option>
                    <option value="58mm">Impresora Térmica 58 mm (Compacta)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">Sucursal Asociada *</label>
                  <select
                    value={config.branch}
                    onChange={(e) => setConfig({ ...config, branch: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-bold"
                  >
                    <option value="Sucursal Central">Sucursal Central</option>
                    <option value="Sucursal Centro">Sucursal Centro</option>
                  </select>
                </div>
              </div>

              {/* Fiscal Header Inputs */}
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Razon Social / Nombre Empresa (&#123;&#123;company_name&#125;&#125;)</label>
                <input
                  type="text"
                  value={config.company_name}
                  onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">NIT Fiscal (&#123;&#123;company_nit&#125;&#125;)</label>
                  <input
                    type="text"
                    value={config.company_nit}
                    onChange={(e) => setConfig({ ...config, company_nit: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">Dirección Comercial (&#123;&#123;company_address&#125;&#125;)</label>
                  <input
                    type="text"
                    value={config.company_address}
                    onChange={(e) => setConfig({ ...config, company_address: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-semibold"
                  />
                </div>
              </div>

              {/* Checkbox Toggles */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.show_customer_info}
                    onChange={(e) => setConfig({ ...config, show_customer_info: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Mostrar Datos Cliente (&#123;&#123;client_name&#125;&#125;)</span>
                </label>

                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.show_imei_serials}
                    onChange={(e) => setConfig({ ...config, show_imei_serials: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Desglosar Números de Serie / IMEI</span>
                </label>

                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.show_qr_validation}
                    onChange={(e) => setConfig({ ...config, show_qr_validation: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <span>Imprimir Código QR de Validación</span>
                </label>
              </div>

              {/* Footer Texts */}
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Mensaje de Agradecimiento Pie de Página</label>
                <input
                  type="text"
                  value={config.footer_message}
                  onChange={(e) => setConfig({ ...config, footer_message: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Leyenda Legal u Obligatoria</label>
                <textarea
                  rows={2}
                  value={config.legal_disclaimer}
                  onChange={(e) => setConfig({ ...config, legal_disclaimer: e.target.value })}
                  className="w-full mt-1 p-2.5 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-mono text-[11px]"
                />
              </div>
            </div>
          </div>

          {/* Right Panel: Live Thermal Ticket Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-gray-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-md">
              <span className="font-extrabold text-xs flex items-center gap-2">
                <Eye className="w-4 h-4 text-emerald-400" /> Previsualización Térmica en Tiempo Real ({config.paper_width})
              </span>
              <span className="px-2 py-0.5 bg-gray-800 text-gray-300 rounded font-mono text-[10px]">
                {config.paper_width === '80mm' ? '32 Caracteres / Línea' : '24 Caracteres / Línea'}
              </span>
            </div>

            {/* Simulated Receipt Render */}
            <div className={`mx-auto bg-white text-black p-6 rounded-lg shadow-2xl font-mono text-[11px] leading-tight select-none border border-gray-300 transition-all ${
              config.paper_width === '80mm' ? 'max-w-[320px]' : 'max-w-[240px]'
            }`}>
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-black">
                <h4 className="font-black text-sm uppercase">{config.company_name}</h4>
                <p>NIT: {config.company_nit}</p>
                <p className="text-[10px]">{config.company_address}</p>
              </div>

              {/* Transaction Metadata */}
              <div className="py-2 space-y-0.5 border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span>TICKET:</span>
                  <span className="font-bold">TK-10024</span>
                </div>
                <div className="flex justify-between">
                  <span>FECHA:</span>
                  <span>14/08/2026 14:15</span>
                </div>
                <div className="flex justify-between">
                  <span>CAJERO:</span>
                  <span>Juan Pérez</span>
                </div>
                {config.show_customer_info && (
                  <div className="flex justify-between pt-1 border-t border-dotted border-gray-400">
                    <span>CLIENTE:</span>
                    <span className="font-bold">Carlos Mendoza</span>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="py-2 border-b border-dashed border-black space-y-1.5">
                <div className="flex justify-between font-bold border-b border-black pb-1">
                  <span>CANT x PROD</span>
                  <span>TOTAL</span>
                </div>

                <div>
                  <div className="flex justify-between">
                    <span>2 x Coca Cola 2L</span>
                    <span>24.00</span>
                  </div>
                  <span className="text-[9px] text-gray-600 block">@ $12.00 / u</span>
                </div>

                <div>
                  <div className="flex justify-between">
                    <span>1 x Samsung A54</span>
                    <span>1850.00</span>
                  </div>
                  {config.show_imei_serials && (
                    <span className="text-[9px] text-gray-700 font-bold block">IMEI: 358492019482712</span>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="py-2 space-y-1 border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>1874.00</span>
                </div>
                <div className="flex justify-between font-black text-sm pt-1 border-t border-black">
                  <span>TOTAL ($):</span>
                  <span>1874.00</span>
                </div>
                <div className="flex justify-between text-[10px] text-gray-700">
                  <span>FORMA PAGO:</span>
                  <span>EFECTIVO</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-3 space-y-2">
                <p className="font-bold">{config.footer_message}</p>
                <p className="text-[9px] text-gray-600 leading-none">{config.legal_disclaimer}</p>
                {config.show_qr_validation && (
                  <div className="w-16 h-16 bg-gray-200 border border-black mx-auto flex items-center justify-center text-[9px] font-bold">
                    [ CÓDIGO QR ]
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: DIGITAL CHANNELS (WHATSAPP & EMAIL) */}
      {activeSubTab === 'digital-channels' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* WhatsApp Channel */}
          <div className="bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F2833] pb-3">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-emerald-500" /> Canal de Envío por WhatsApp
              </h3>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                <input
                  type="checkbox"
                  checked={whatsappEnabled}
                  onChange={(e) => setWhatsappEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded"
                />
                <span>Habilitar</span>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Plantilla de Mensaje de Texto (WhatsApp)</label>
                <textarea
                  rows={4}
                  value={whatsappTemplate}
                  onChange={(e) => setWhatsappTemplate(e.target.value)}
                  className="w-full mt-1 p-2.5 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-mono"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded-xl text-emerald-800 dark:text-emerald-300">
                <span className="font-bold block mb-1">Variables Dinámicas Soportadas:</span>
                <p className="font-mono text-[10px]">&#123;&#123;client_name&#125;&#125;, &#123;&#123;company_name&#125;&#125;, &#123;&#123;ticket_number&#125;&#125;, &#123;&#123;total_amount&#125;&#125;, &#123;&#123;pdf_url&#125;&#125;</p>
              </div>
            </div>
          </div>

          {/* Email Channel */}
          <div className="bg-white dark:bg-[#121212] p-6 rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F2833] pb-3">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-blue-500" /> Canal de Correo Electrónico (PDF Adjunto)
              </h3>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span>Habilitar</span>
              </label>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-gray-500">
                Envío automático de comprobantes fiscales en formato PDF adjunto al correo electrónico registrado del cliente al finalizar el pago en el POS.
              </p>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 rounded-xl text-blue-800 dark:text-blue-300">
                <span className="font-bold block">Integración SMTP / Transaccional Activa</span>
                <span className="text-[10px]">Motor listo para despacho de correos en tiempo real.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
