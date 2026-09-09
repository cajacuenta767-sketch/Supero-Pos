import React, { useState } from 'react';
import { 
  Sliders, 
  Search, 
  AlertTriangle, 
  Eye, 
  Printer, 
  Calculator, 
  Lock
} from 'lucide-react';

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
 const [activeSubTab, setActiveSubTab] = useState<'adjustments' | 'losses' | 'audit'>('adjustments');

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
 const [supervisorPin, setSupervisorPin] = useState('');

  // Blind Audit State
 const [auditBranch] = useState('Almacén Central');
 const [auditItems] = useState<AdjustmentItem[]>([
    { id: 1, sku: 'SKU-1001', name: 'Coca Cola 2 Litros Retornable', theoretical_stock: 120, physical_count: 118, difference: -2, unit_type: 'UNIT' },
    { id: 2, sku: 'SKU-1002', name: 'Queso Criollo San Javier (Kg)', theoretical_stock: 45.0, physical_count: 45.0, difference: 0, unit_type: 'FRACTION' },
    { id: 3, sku: 'SKU-1003', name: 'Smartphone Samsung Galaxy A54 128GB', theoretical_stock: 5, physical_count: 6, difference: 1, unit_type: 'SERIALIZED', serials: ['IMEI-358492019482799'] }
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
        { id: 1, sku: 'SKU-1001', name: 'Coca Cola 2 Litros Retornable', theoretical_stock: 120, physical_count: 116, difference: -4, unit_type: 'UNIT' }
      ]
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
 items: []
    }
  ]);

 const filteredAdjustments = adjustments.filter(adj => {
 const matchesSearch = adj.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
 adj.user_name.toLowerCase().includes(searchQuery.toLowerCase());
 const matchesType = typeFilter === 'ALL' || adj.type === typeFilter;
 return matchesSearch && matchesType;
  });

 const handleConfirmLoss = (e: React.FormEvent) => {
 e.preventDefault();
 if (supervisorPin !== '1234' && supervisorPin !== '0000') {
 alert('⚠️ PIN de supervisor incorrecto (Pruebe PIN: 1234)');
 return;
    }

 const newLoss: AdjustmentRecord = {
 id: `ADJ-${Math.floor(4000 + Math.random() * 900)}`,
 date: new Date().toLocaleString('es-ES'),
 type: 'LOSS_DAMAGE',
 reason: lossReason,
 branch: 'Almacén Central',
 items_count: 1,
 user_name: 'Juan Pérez (Supervisor)',
 status: 'APPLIED',
 items: []
    };

 setAdjustments(prev => [newLoss, ...prev]);
 setIsLossModalOpen(false);
 setLossNotes('');
 setSupervisorPin('');
 alert('✅ Merma/Daño registrada correctamente. Stock descontado síncronamente del Kardex.');
  };

 const handleApplyAuditReconciliation = () => {
 alert('✅ Ajustes masivos aplicados al inventario. Kardex y valorizaciones de stock actualizadas correctamente.');
 setIsReconciliationModalOpen(false);
  };

 return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* 1. Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <Sliders className="w-7 h-7 text-accent" />
            Ajuste de Stock & Auditoría de Inventario
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Registro de mermas, mermas por vencimiento, roturas y auditorías de conteo físico ciego
          </p>
        </div>

        {/* Sub-tabs Navigation */}
        <div className="flex items-center bg-sunken p-1.5 rounded-md border border-line">
          <button
 onClick={() => setActiveSubTab('adjustments')}
 className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
 activeSubTab === 'adjustments' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Historial de Ajustes
          </button>
          <button
 onClick={() => setIsLossModalOpen(true)}
 className="px-3 py-2 bg-danger hover:opacity-90 text-white rounded-md text-body font-bold flex items-center gap-1.5 shadow"
          >
            <AlertTriangle className="w-4 h-4" />
            Registrar Merma / Daño
          </button>
          <button
 onClick={() => setIsAuditModalOpen(true)}
 className="px-3 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-body font-bold flex items-center gap-1.5 shadow"
          >
            <Calculator className="w-4 h-4" />
            Conteo Físico Ciego
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ADJUSTMENTS CATALOG TABLE */}
      {activeSubTab === 'adjustments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-raised p-4 rounded-md border border-line shadow-e1">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
 type="text"
 value={searchQuery}
 onChange={(e) => setSearchQuery(e.target.value)}
 placeholder="Buscar por # Folio de Ajuste o Responsable..."
 className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-md text-body text-ink focus:border-accent"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
 value={typeFilter}
 onChange={(e) => setTypeFilter(e.target.value)}
 className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:outline-none"
              >
                <option value="ALL">Todos los Tipos</option>
                <option value="LOSS_DAMAGE">Merma / Daño</option>
                <option value="PHYSICAL_AUDIT">Auditoría Ciega</option>
                <option value="MANUAL_CORRECTION">Corrección Manual</option>
              </select>
            </div>
          </div>

          <div className="bg-raised rounded-md border border-line shadow-e1 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                  <th className="p-4"># Folio Ajuste</th>
                  <th className="p-4">Fecha & Hora</th>
                  <th className="p-4">Tipo de Ajuste</th>
                  <th className="p-4">Sucursal</th>
                  <th className="p-4 font-mono">Productos Afectados</th>
                  <th className="p-4">Responsable</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-body">
                {filteredAdjustments.map((adj) => {
 const typeBadge = {
                    LOSS_DAMAGE: { label: 'MERMA / DAÑO', color: 'bg-danger-soft text-danger-ink dark:bg-danger-soft border-danger/30' },
                    PHYSICAL_AUDIT: { label: 'AUDITORÍA CIEGA', color: 'bg-accent-soft text-accent-ink dark:bg-accent-soft border-accent/30' },
                    MANUAL_CORRECTION: { label: 'CORRECCIÓN MANUAL', color: 'bg-warn-soft text-warn-ink dark:bg-warn-soft border-warn/30' },
                  }[adj.type];

 return (
                    <tr key={adj.id} className="hover:bg-sunken">
                      <td className="p-4 font-mono font-extrabold text-accent">
                        {adj.id}
                      </td>
                      <td className="p-4 font-mono text-ink-2">
                        {adj.date}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-md text-micro font-bold border ${typeBadge.color}`}>
                          {typeBadge.label}
                        </span>
                      </td>
                      <td className="p-4 font-semibold text-ink-2">
                        {adj.branch}
                      </td>
                      <td className="p-4 font-mono font-bold">
                        {adj.items_count} ítems
                      </td>
                      <td className="p-4 font-bold text-ink">
                        {adj.user_name}
                      </td>
                      <td className="p-4 text-center">
                        <span className="px-2.5 py-1 rounded-md text-micro font-bold bg-ok-soft text-ok-ink dark:bg-ok-soft border border-ok/30">
                          APLICADO
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <button
 onClick={() => {
 setSelectedRecord(adj);
 setIsReconciliationModalOpen(true);
                          }}
 className="p-1.5 text-accent hover:bg-accent-soft rounded-md" title="Ver Conciliación de Diferencias"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-ok hover:bg-ok-soft rounded-md" title="Imprimir Reporte Kardex">
                          <Printer className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: STOCK LOSSES & DAMAGE FORM (StockLossesForm) */}
      {isLossModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-md overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-danger" /> Registro de Merma, Daño o Extravío
              </h3>
              <button onClick={() => setIsLossModalOpen(false)} className="text-ink-3 hover:text-ink-2">✕</button>
            </div>

            <form onSubmit={handleConfirmLoss} className="p-5 space-y-4 text-body">
              <div>
                <label className="font-bold text-ink-2">Causa / Motivo Operativo *</label>
                <select
 value={lossReason}
 onChange={(e) => setLossReason(e.target.value)}
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-bold"
                >
                  <option value="Vencido">Producto Vencido / Caducado</option>
                  <option value="Daño">Daño por Manipulación o Transporte</option>
                  <option value="Merma Exhibición">Merma en Exhibición / Muestras</option>
                  <option value="Robo">Extravío / Robo Detectado</option>
                  <option value="Consumo Interno">Consumo Interno de la Empresa</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-ink-2">Descripción del Incidente *</label>
                <textarea
 required rows={2}
 value={lossNotes}
 onChange={(e) => setLossNotes(e.target.value)}
 placeholder="Detallar causa exacta de la baja de mercadería..."
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md"
                />
              </div>

              <div>
                <label className="font-bold text-ink-2 flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-warn" /> PIN Autorización Supervisor *
                </label>
                <input
 type="password" required
 value={supervisorPin}
 onChange={(e) => setSupervisorPin(e.target.value)}
 placeholder="PIN Supervisor (1234)"
 className="w-full mt-1 p-2 bg-sunken border border-line rounded-md font-mono text-center font-bold text-base"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsLossModalOpen(false)} className="px-4 py-2 bg-sunken text-ink rounded-md font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-danger hover:opacity-90 text-white rounded-md font-extrabold shadow">
                  Confirmar Baja de Stock en Kardex
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BLIND AUDIT FORM (BlindAuditForm) */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-2xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-accent" /> Sesión de Conteo Físico Ciego de Inventario
                </h3>
                <p className="text-body text-ink-3">Sucursal: {auditBranch} (El stock teórico permanece oculto)</p>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-ink-3 hover:text-ink-2">✕</button>
            </div>

            <div className="p-5 space-y-4 text-body">
              <div className="border border-line rounded-md overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-sunken text-micro font-bold uppercase text-ink-3">
                    <tr>
                      <th className="p-3">Producto / SKU</th>
                      <th className="p-3 text-center">Tipo Unidad</th>
                      <th className="p-3 text-center">Cantidad Física Contada en Anaquel</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {auditItems.map(item => (
                      <tr key={item.id}>
                        <td className="p-3 font-bold text-ink">
                          {item.name}
                          <span className="block text-micro text-ink-3 font-mono">SKU: {item.sku}</span>
                        </td>
                        <td className="p-3 text-center font-mono font-bold">{item.unit_type}</td>
                        <td className="p-3 text-center">
                          <input
 type="number"
 defaultValue={item.physical_count}
 className="w-20 p-1 bg-accent-soft border border-accent/30 rounded text-center font-mono font-black text-base text-accent"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsAuditModalOpen(false)} className="px-4 py-2 bg-sunken text-ink rounded-md font-bold">Cancelar</button>
                <button
 onClick={() => {
 setIsAuditModalOpen(false);
 setIsReconciliationModalOpen(true);
                  }}
 className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md font-extrabold shadow"
                >
                  Finalizar Conteo & Generar Conciliación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AUDIT RECONCILIATION & DISCREPANCIES (AuditReconciliation) */}
      {(isReconciliationModalOpen || selectedRecord) && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-3xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-ok" /> Reporte de Conciliación & Desviaciones de Stock
                </h3>
                <p className="text-body text-ink-3">Cruce automático entre Stock Teórico vs Stock Físico Contado</p>
              </div>
              <button onClick={() => { setIsReconciliationModalOpen(false); setSelectedRecord(null); }} className="text-ink-3 hover:text-ink-2">✕</button>
            </div>

            <div className="p-5 space-y-4 text-body">
              <div className="border border-line rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-sunken text-micro font-bold uppercase text-ink-3">
                    <tr>
                      <th className="p-3">Producto</th>
                      <th className="p-3 text-center">Stock Teórico</th>
                      <th className="p-3 text-center">Físico Contado</th>
                      <th className="p-3 text-center">Diferencia</th>
                      <th className="p-3 text-right">Resultado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line font-mono">
                    {auditItems.map(item => {
 const isFaltante = item.difference < 0;
 const isSobrante = item.difference > 0;
 const isExacto = item.difference === 0;

 return (
                        <tr key={item.id}>
                          <td className="p-3 font-sans font-bold text-ink">
                            {item.name}
                            <span className="block text-micro text-ink-3 font-mono">SKU: {item.sku}</span>
                          </td>
                          <td className="p-3 text-center font-bold">{item.theoretical_stock}</td>
                          <td className="p-3 text-center font-bold">{item.physical_count}</td>
                          <td className={`p-3 text-center font-black text-base ${
 isFaltante ? 'text-danger' : isSobrante ? 'text-ok' : 'text-ink-3'
                          }`}>
                            {item.difference > 0 ? `+${item.difference}` : item.difference}
                          </td>
                          <td className="p-3 text-right font-sans">
                            <span className={`px-2 py-0.5 rounded text-micro font-bold ${
 isFaltante ? 'bg-danger-soft text-danger-ink' : isSobrante ? 'bg-ok-soft text-ok-ink' : 'bg-sunken text-ink-2'
                            }`}>
                              {isFaltante && 'FALTANTE (MERMA)'}
                              {isSobrante && 'SOBRANTE'}
                              {isExacto && 'CUADRE EXACTO'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setIsReconciliationModalOpen(false); setSelectedRecord(null); }} className="px-4 py-2 bg-sunken text-ink rounded-md font-bold">Cerrar</button>
                <button onClick={handleApplyAuditReconciliation} className="px-4 py-2 bg-ok hover:opacity-90 text-white rounded-md font-extrabold shadow">
                  Aplicar Ajustes Masivos al Kardex
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
