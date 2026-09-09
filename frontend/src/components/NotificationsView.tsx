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
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <Bell className="w-7 h-7 text-accent" />
            Plantillas de Notificación & Comprobantes Digitales
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Diseñador de tickets térmicos (58mm/80mm), comprobantes en PDF, envío por WhatsApp y correo electrónico
          </p>
        </div>

        {/* Sub-tabs Switcher */}
        <div className="flex items-center bg-sunken p-1.5 rounded-md border border-line">
          <button
 onClick={() => setActiveSubTab('thermal-editor')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeSubTab === 'thermal-editor' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <Printer className="w-4 h-4" />
            Diseñador Ticket Térmico
          </button>
          <button
 onClick={() => setActiveSubTab('digital-channels')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeSubTab === 'digital-channels' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
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
          <div className="lg:col-span-7 bg-raised p-6 rounded-md border border-line shadow-e1 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <Settings2 className="w-5 h-5 text-accent" /> Parámetros del Comprobante Impreso
              </h3>
              <div className="flex items-center gap-2">
                <button
 onClick={handleResetToDefault}
 className="px-3 py-1.5 bg-sunken hover:bg-sunken text-ink-2 rounded-md text-body font-bold flex items-center gap-1 border border-line"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Restablecer
                </button>
                <button
 onClick={handleSaveConfig}
 className="px-4 py-1.5 bg-accent hover:bg-accent-hover text-white rounded-md text-body font-extrabold flex items-center gap-1.5 shadow"
                >
                  <Save className="w-3.5 h-3.5" /> Guardar
                </button>
              </div>
            </div>

            <div className="space-y-4 text-body">
              {/* Paper Width & Branch */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ink-2">Ancho de Papel Térmico *</label>
                  <select
 value={config.paper_width}
 onChange={(e) => setConfig({ ...config, paper_width: e.target.value as typeof config.paper_width })}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-bold"
                  >
                    <option value="80mm">Impresora Térmica 80 mm (Estándar)</option>
                    <option value="58mm">Impresora Térmica 58 mm (Compacta)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-ink-2">Sucursal Asociada *</label>
                  <select
 value={config.branch}
 onChange={(e) => setConfig({ ...config, branch: e.target.value })}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-bold"
                  >
                    <option value="Sucursal Central">Sucursal Central</option>
                    <option value="Sucursal Centro">Sucursal Centro</option>
                  </select>
                </div>
              </div>

              {/* Fiscal Header Inputs */}
              <div>
                <label className="font-bold text-ink-2">Razon Social / Nombre Empresa (&#123;&#123;company_name&#125;&#125;)</label>
                <input
 type="text"
 value={config.company_name}
 onChange={(e) => setConfig({ ...config, company_name: e.target.value })}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-ink-2">NIT Fiscal (&#123;&#123;company_nit&#125;&#125;)</label>
                  <input
 type="text"
 value={config.company_nit}
 onChange={(e) => setConfig({ ...config, company_nit: e.target.value })}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="font-bold text-ink-2">Dirección Comercial (&#123;&#123;company_address&#125;&#125;)</label>
                  <input
 type="text"
 value={config.company_address}
 onChange={(e) => setConfig({ ...config, company_address: e.target.value })}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-semibold"
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
 className="w-4 h-4 text-accent rounded"
                  />
                  <span>Mostrar Datos Cliente (&#123;&#123;client_name&#125;&#125;)</span>
                </label>

                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
 type="checkbox"
 checked={config.show_imei_serials}
 onChange={(e) => setConfig({ ...config, show_imei_serials: e.target.checked })}
 className="w-4 h-4 text-accent rounded"
                  />
                  <span>Desglosar Números de Serie / IMEI</span>
                </label>

                <label className="flex items-center gap-2 font-bold cursor-pointer">
                  <input
 type="checkbox"
 checked={config.show_qr_validation}
 onChange={(e) => setConfig({ ...config, show_qr_validation: e.target.checked })}
 className="w-4 h-4 text-accent rounded"
                  />
                  <span>Imprimir Código QR de Validación</span>
                </label>
              </div>

              {/* Footer Texts */}
              <div>
                <label className="font-bold text-ink-2">Mensaje de Agradecimiento Pie de Página</label>
                <input
 type="text"
 value={config.footer_message}
 onChange={(e) => setConfig({ ...config, footer_message: e.target.value })}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-semibold"
                />
              </div>

              <div>
                <label className="font-bold text-ink-2">Leyenda Legal u Obligatoria</label>
                <textarea
 rows={2}
 value={config.legal_disclaimer}
 onChange={(e) => setConfig({ ...config, legal_disclaimer: e.target.value })}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-mono text-micro"
                />
              </div>
            </div>
          </div>

          {/* Right Panel: Live Thermal Ticket Preview */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-sunken text-white p-4 rounded-md flex items-center justify-between shadow-e1">
              <span className="font-extrabold text-body flex items-center gap-2">
                <Eye className="w-4 h-4 text-ok" /> Previsualización Térmica en Tiempo Real ({config.paper_width})
              </span>
              <span className="px-2 py-0.5 bg-sunken text-ink-2 rounded font-mono text-micro">
                {config.paper_width === '80mm' ? '32 Caracteres / Línea' : '24 Caracteres / Línea'}
              </span>
            </div>

            {/* Simulated Receipt Render */}
            <div className={`mx-auto bg-white text-black p-6 rounded-md shadow-e3 font-mono text-micro leading-tight select-none border border-line-strong transition-all ${
 config.paper_width === '80mm' ? 'max-w-[320px]' : 'max-w-[240px]'
            }`}>
              {/* Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-black">
                <h4 className="font-black text-base uppercase">{config.company_name}</h4>
                <p>NIT: {config.company_nit}</p>
                <p className="text-micro">{config.company_address}</p>
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
                  <span className="text-micro text-ink-2 block">@ $12.00 / u</span>
                </div>

                <div>
                  <div className="flex justify-between">
                    <span>1 x Samsung A54</span>
                    <span>1850.00</span>
                  </div>
                  {config.show_imei_serials && (
                    <span className="text-micro text-ink-2 font-bold block">IMEI: 358492019482712</span>
                  )}
                </div>
              </div>

              {/* Totals */}
              <div className="py-2 space-y-1 border-b border-dashed border-black">
                <div className="flex justify-between">
                  <span>SUBTOTAL:</span>
                  <span>1874.00</span>
                </div>
                <div className="flex justify-between font-black text-base pt-1 border-t border-black">
                  <span>TOTAL ($):</span>
                  <span>1874.00</span>
                </div>
                <div className="flex justify-between text-micro text-ink-2">
                  <span>FORMA PAGO:</span>
                  <span>EFECTIVO</span>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center pt-3 space-y-2">
                <p className="font-bold">{config.footer_message}</p>
                <p className="text-micro text-ink-2 leading-none">{config.legal_disclaimer}</p>
                {config.show_qr_validation && (
                  <div className="w-16 h-16 bg-sunken border border-black mx-auto flex items-center justify-center text-micro font-bold">
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
          <div className="bg-raised p-6 rounded-md border border-line shadow-e1 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-ok" /> Canal de Envío por WhatsApp
              </h3>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-body">
                <input
 type="checkbox"
 checked={whatsappEnabled}
 onChange={(e) => setWhatsappEnabled(e.target.checked)}
 className="w-4 h-4 text-ok rounded"
                />
                <span>Habilitar</span>
              </label>
            </div>

            <div className="space-y-3 text-body">
              <div>
                <label className="font-bold text-ink-2">Plantilla de Mensaje de Texto (WhatsApp)</label>
                <textarea
 rows={4}
 value={whatsappTemplate}
 onChange={(e) => setWhatsappTemplate(e.target.value)}
 className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md font-mono"
                />
              </div>

              <div className="p-3 bg-ok-soft border border-ok/30 rounded-md text-ok-ink">
                <span className="font-bold block mb-1">Variables Dinámicas Soportadas:</span>
                <p className="font-mono text-micro">&#123;&#123;client_name&#125;&#125;, &#123;&#123;company_name&#125;&#125;, &#123;&#123;ticket_number&#125;&#125;, &#123;&#123;total_amount&#125;&#125;, &#123;&#123;pdf_url&#125;&#125;</p>
              </div>
            </div>
          </div>

          {/* Email Channel */}
          <div className="bg-raised p-6 rounded-md border border-line shadow-e1 space-y-4">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <Mail className="w-5 h-5 text-accent" /> Canal de Correo Electrónico (PDF Adjunto)
              </h3>
              <label className="flex items-center gap-2 cursor-pointer font-bold text-body">
                <input
 type="checkbox"
 checked={emailEnabled}
 onChange={(e) => setEmailEnabled(e.target.checked)}
 className="w-4 h-4 text-accent rounded"
                />
                <span>Habilitar</span>
              </label>
            </div>

            <div className="space-y-3 text-body">
              <p className="text-ink-3">
                Envío automático de comprobantes fiscales en formato PDF adjunto al correo electrónico registrado del cliente al finalizar el pago en el POS.
              </p>

              <div className="p-3 bg-accent-soft border border-accent/30 rounded-md text-accent-ink">
                <span className="font-bold block">Integración SMTP / Transaccional Activa</span>
                <span className="text-micro">Motor listo para despacho de correos en tiempo real.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
