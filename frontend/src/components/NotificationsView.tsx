import React, { useState } from 'react';
import { Bell, Eye, Mail, MessageSquare, Printer, RotateCcw, Save } from 'lucide-react';
import {
  Button,
  Card,
  ImageUpload,
  Input,
  PageHeader,
  Select,
  Switch,
  Tabs,
  Textarea,
  useToast,
} from '../ui';
import type { TabItem } from '../ui';
import { useSettingsStore } from '../store/useSettingsStore';

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

type SubTab = 'thermal-editor' | 'digital-channels' | 'branch-rules';

const TABS: TabItem[] = [
  { id: 'thermal-editor', label: 'Ticket impreso', icon: <Printer className="w-4 h-4" /> },
  {
    id: 'digital-channels',
    label: 'Canales digitales',
    icon: <MessageSquare className="w-4 h-4" />,
  },
  { id: 'branch-rules', label: 'Avisos', icon: <Bell className="w-4 h-4" /> },
];

const DEFAULTS: TicketTemplateConfig = {
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
  branch: 'Sucursal Central',
};

/* El ancho es una medida física, no una proporción: 80 mm y 58 mm a 96 ppp.
   La previsualización nunca escala — si escalara, dejaría de informar. */
const PAPER_PX: Record<TicketTemplateConfig['paper_width'], number> = {
  '80mm': 302,
  '58mm': 219,
};

/** Ticket tal como saldrá de la impresora térmica, al ancho real. */
const TicketPreview: React.FC<{ config: TicketTemplateConfig; logo: string | null }> = ({
  config,
  logo,
}) => {
  const line = '-'.repeat(config.paper_width === '80mm' ? 40 : 30);
  return (
    <div
      className="shrink-0 bg-white text-black font-mono text-[11px] leading-[1.45] p-3 border border-line-strong rounded-sm shadow-e1"
      style={{ width: PAPER_PX[config.paper_width] }}
    >
      {config.header_logo_enabled &&
        (logo ? (
          <img src={logo} alt="" className="mx-auto mb-1 max-h-10 object-contain" />
        ) : (
          <div className="text-center font-bold tracking-wider mb-1">[ LOGO ]</div>
        ))}
      <div className="text-center font-bold uppercase">{config.company_name}</div>
      <div className="text-center">NIT {config.company_nit}</div>
      <div className="text-center">{config.company_address}</div>
      <div className="text-center">{config.branch}</div>
      <div className="overflow-hidden whitespace-nowrap">{line}</div>

      <div>TICKET TK-10024</div>
      <div>14/08/2026 14:22</div>
      {config.show_customer_info && <div>CLIENTE: Público General</div>}
      <div className="overflow-hidden whitespace-nowrap">{line}</div>

      <div className="flex justify-between">
        <span>1 x Audífonos BT Pro</span>
        <span>35.00</span>
      </div>
      {config.show_imei_serials && <div className="pl-2">IMEI 354892019482910</div>}
      <div className="flex justify-between">
        <span>0.450 kg Queso Criollo</span>
        <span>20.25</span>
      </div>
      <div className="overflow-hidden whitespace-nowrap">{line}</div>

      <div className="flex justify-between font-bold text-[13px]">
        <span>TOTAL</span>
        <span>55.25</span>
      </div>
      <div className="flex justify-between">
        <span>EFECTIVO</span>
        <span>60.00</span>
      </div>
      <div className="flex justify-between">
        <span>CAMBIO</span>
        <span>4.75</span>
      </div>
      <div className="overflow-hidden whitespace-nowrap">{line}</div>

      <div className="text-center mt-1">{config.footer_message}</div>
      {config.show_qr_validation && (
        <div className="text-center my-2">
          <div className="inline-block w-16 h-16 border border-black/70 grid place-items-center text-[9px]">
            QR
          </div>
        </div>
      )}
      <div className="text-center text-[9px] uppercase leading-snug">{config.legal_disclaimer}</div>
    </div>
  );
};

export const NotificationsView: React.FC = () => {
  const toast = useToast();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('thermal-editor');
  /* La plantilla vive en los ajustes, que es de donde el punto de venta saca lo
     que imprime. Aquí había una copia entera —nombre, NIT, dirección y ancho de
     papel— que solo alimentaba esta previsualización: se cambiaba el ancho a
     58 mm, el recuadro se estrechaba y la impresora seguía sacando 80. */
  const settings = useSettingsStore();
  const updateSettings = useSettingsStore((state) => state.update);

  const saved: TicketTemplateConfig = {
    paper_width: settings.paperWidth,
    company_name: settings.companyName,
    company_nit: settings.companyNit,
    company_address: settings.companyAddress,
    header_logo_enabled: settings.ticketShowLogo,
    show_customer_info: settings.ticketShowCustomer,
    show_imei_serials: settings.ticketShowSerials,
    footer_message: settings.ticketFooter,
    legal_disclaimer: settings.ticketDisclaimer,
    show_qr_validation: settings.ticketShowQr,
    branch: DEFAULTS.branch,
  };

  const [config, setConfig] = useState<TicketTemplateConfig>(saved);
  const logo = settings.logo;
  const [dirty, setDirty] = useState(false);

  const [whatsappEnabled, setWhatsappEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);
  /* El importe llevaba «$» escrito delante mientras la terminal factura en
     bolivianos. La moneda sale de los ajustes, como en el resto. */
  const [whatsappTemplate, setWhatsappTemplate] = useState(
    'Hola {{client_name}}, gracias por tu compra en {{company_name}}. Aquí tienes tu ' +
      `comprobante digital #{{ticket_number}} por un total de ${settings.currencyInfo().symbol}` +
      '{{total_amount}}. Ver en PDF: {{pdf_url}}',
  );

  const patch = (p: Partial<TicketTemplateConfig>) => {
    setConfig((c) => ({ ...c, ...p }));
    setDirty(true);
  };

  const reset = () => {
    setConfig(DEFAULTS);
    setDirty(true);
    toast('Valores de fábrica cargados · pulse Guardar para aplicarlos', 'info');
  };

  /* Variables que el ticket sabe sustituir. Una que no esté aquí sale impresa
     tal cual, con las llaves, delante del cliente. */
  const KNOWN_VARIABLES = [
    'client_name',
    'company_name',
    'ticket_number',
    'total_amount',
    'pdf_url',
  ];

  const save = () => {
    const unknown = [...whatsappTemplate.matchAll(/\{\{\s*([\w_]+)\s*\}\}/g)]
      .map((m) => m[1])
      .filter((name) => !KNOWN_VARIABLES.includes(name));

    if (unknown.length > 0) {
      toast(
        `No se guarda: ${[...new Set(unknown)].map((v) => `{{${v}}}`).join(', ')} no ${
          unknown.length === 1 ? 'es una variable conocida' : 'son variables conocidas'
        } y se imprimiría tal cual.`,
        'danger',
      );
      return;
    }

    /* Antes esto solo apagaba el aviso de cambios y decía «Plantilla
       guardada»: no escribía en ningún sitio y al recargar volvía todo al
       valor de fábrica. */
    updateSettings({
      paperWidth: config.paper_width,
      companyName: config.company_name,
      companyNit: config.company_nit,
      companyAddress: config.company_address,
      ticketShowLogo: config.header_logo_enabled,
      ticketShowCustomer: config.show_customer_info,
      ticketShowSerials: config.show_imei_serials,
      ticketFooter: config.footer_message,
      ticketDisclaimer: config.legal_disclaimer,
      ticketShowQr: config.show_qr_validation,
    });
    setDirty(false);
    toast('Plantilla guardada · es la que saldrá impresa', 'success');
  };

  return (
    <div className="h-full overflow-y-auto bg-canvas select-none">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        <PageHeader
          title="Notificaciones"
          subtitle="Plantilla del ticket impreso, comprobantes digitales y avisos automáticos."
          actions={
            <>
              <Button variant="ghost" icon={<RotateCcw className="w-4 h-4" />} onClick={reset}>
                Restablecer
              </Button>
              <Button icon={<Save className="w-4 h-4" />} disabled={!dirty} onClick={save}>
                Guardar
              </Button>
            </>
          }
          tabs={
            <Tabs
              items={TABS}
              value={activeSubTab}
              onChange={(id) => setActiveSubTab(id as SubTab)}
              label="Secciones de notificaciones"
            />
          }
        />

        {/* ── Ticket impreso: configuración y previsualización, separadas ── */}
        {activeSubTab === 'thermal-editor' && (
          <div className="flex flex-col xl:flex-row gap-5 items-start">
            <div className="flex-1 min-w-0 space-y-5">
              <Card title="Impresión" icon={<Printer className="w-4 h-4" />}>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Select
                    label="Ancho de papel"
                    hint="Cambia el ancho real de la previsualización."
                    value={config.paper_width}
                    onChange={(e) =>
                      patch({ paper_width: e.target.value as TicketTemplateConfig['paper_width'] })
                    }
                  >
                    <option value="80mm">80 mm · estándar de mostrador</option>
                    <option value="58mm">58 mm · portátil</option>
                  </Select>
                  <Select
                    label="Sucursal"
                    value={config.branch}
                    onChange={(e) => patch({ branch: e.target.value })}
                  >
                    <option>Sucursal Central</option>
                    <option>Sucursal Centro Comercio</option>
                    <option>Almacén General Depósito</option>
                  </Select>
                </div>
              </Card>

              <Card title="Cabecera" icon={<Printer className="w-4 h-4" />}>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Input
                      label="Razón social"
                      value={config.company_name}
                      onChange={(e) => patch({ company_name: e.target.value })}
                    />
                    <Input
                      label="NIT"
                      value={config.company_nit}
                      onChange={(e) => patch({ company_nit: e.target.value })}
                      className="[&_input]:font-mono"
                    />
                  </div>
                  <Input
                    label="Dirección"
                    value={config.company_address}
                    onChange={(e) => patch({ company_address: e.target.value })}
                  />
                  <Switch
                    checked={config.header_logo_enabled}
                    onChange={(v) => patch({ header_logo_enabled: v })}
                    label="Imprimir logotipo en la cabecera"
                    showLabel
                  />
                  {config.header_logo_enabled && (
                    <ImageUpload
                      value={logo}
                      onChange={(v) => {
                        /* El logotipo es el mismo que el de Ajustes: es el que
                           acompaña al ticket impreso. */
                        updateSettings({ logo: v });
                      }}
                      label="Logotipo del ticket"
                      hint="En blanco y negro se imprime mejor: la térmica no tiene grises."
                      preview="sm"
                      maxSize={300}
                    />
                  )}
                </div>
              </Card>

              <Card title="Cuerpo y pie" icon={<Printer className="w-4 h-4" />}>
                <div className="space-y-4">
                  <div className="flex flex-col gap-3">
                    <Switch
                      checked={config.show_customer_info}
                      onChange={(v) => patch({ show_customer_info: v })}
                      label="Mostrar datos del cliente"
                      showLabel
                    />
                    <Switch
                      checked={config.show_imei_serials}
                      onChange={(v) => patch({ show_imei_serials: v })}
                      label="Mostrar IMEI y números de serie"
                      showLabel
                    />
                    <Switch
                      checked={config.show_qr_validation}
                      onChange={(v) => patch({ show_qr_validation: v })}
                      label="Imprimir código QR de validación"
                      showLabel
                    />
                  </div>
                  <Input
                    label="Mensaje de despedida"
                    value={config.footer_message}
                    onChange={(e) => patch({ footer_message: e.target.value })}
                  />
                  <Textarea
                    label="Leyenda legal"
                    rows={2}
                    value={config.legal_disclaimer}
                    onChange={(e) => patch({ legal_disclaimer: e.target.value })}
                  />
                </div>
              </Card>
            </div>

            {/* La previsualización conserva su ancho real también apilada. */}
            <div className="xl:sticky xl:top-0 shrink-0 space-y-2">
              <p className="flex items-center gap-1.5 text-micro uppercase text-ink-2">
                <Eye className="w-3.5 h-3.5" /> Vista previa · {config.paper_width}
              </p>
              <TicketPreview config={config} logo={logo} />
            </div>
          </div>
        )}

        {/* ── Canales digitales ────────────────────────────────────── */}
        {activeSubTab === 'digital-channels' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
            <Card title="WhatsApp" icon={<MessageSquare className="w-4 h-4" />}>
              <div className="space-y-4">
                <Switch
                  checked={whatsappEnabled}
                  onChange={(v) => {
                    setWhatsappEnabled(v);
                    setDirty(true);
                  }}
                  label="Enviar comprobante por WhatsApp"
                  showLabel
                />
                <Textarea
                  label="Plantilla del mensaje"
                  hint="Variables disponibles: client_name · company_name · ticket_number · total_amount · pdf_url"
                  rows={5}
                  value={whatsappTemplate}
                  onChange={(e) => {
                    setWhatsappTemplate(e.target.value);
                    setDirty(true);
                  }}
                  disabled={!whatsappEnabled}
                />
              </div>
            </Card>

            <Card title="Correo electrónico" icon={<Mail className="w-4 h-4" />}>
              <div className="space-y-4">
                <Switch
                  checked={emailEnabled}
                  onChange={(v) => {
                    setEmailEnabled(v);
                    setDirty(true);
                  }}
                  label="Enviar comprobante en PDF por correo"
                  showLabel
                />
                <p className="text-body text-ink-2 leading-relaxed">
                  El comprobante se adjunta en PDF con la misma plantilla del ticket impreso, de
                  modo que el cliente recibe exactamente lo que se imprimiría en mostrador.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* ── Avisos ───────────────────────────────────────────────── */}
        {activeSubTab === 'branch-rules' && (
          <Card title="Avisos automáticos" icon={<Bell className="w-4 h-4" />}>
            <div className="flex flex-col gap-3">
              <Switch
                checked
                onChange={() => setDirty(true)}
                label="Avisar cuando un producto baje del stock mínimo"
                showLabel
              />
              <Switch
                checked
                onChange={() => setDirty(true)}
                label="Avisar al cerrar turno con descuadre de caja"
                showLabel
              />
              <Switch
                checked={false}
                onChange={() => setDirty(true)}
                label="Resumen diario de ventas por correo"
                showLabel
              />
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};
