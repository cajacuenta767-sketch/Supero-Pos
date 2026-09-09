import React, { useState } from 'react';
import { 
  Contact, 
  UserCheck, 
  Truck, 
  Users, 
  Search, 
  Plus, 
  Edit3, 
  DollarSign, 
  History
} from 'lucide-react';

interface Customer {
  id: number;
  name: string;
  tax_id: string; // NIT / RUC
  email: string;
  phone: string;
  address: string;
  group: 'Minoristas' | 'Mayoristas' | 'Corporativos' | 'Frecuentes';
  credit_limit: number;
  current_balance: number;
  is_active: boolean;
  credit_enabled: boolean;
}

interface Supplier {
  id: number;
  company_name: string;
  contact_person: string;
  tax_id: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  balance_payable: number;
  last_po_date: string;
  payment_terms: string;
  bank_info: string;
}

interface CustomerGroup {
  id: number;
  name: string;
  price_rule: 'RETAIL' | 'WHOLESALE' | 'DISCOUNT_FIXED';
  discount_percentage: number;
  customer_count: number;
}

export const ContactsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers' | 'groups'>('customers');

  // Customer Filter States
  const [customerSearch, setCustomerSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');

  // Supplier Filter States
  const [supplierSearch, setSupplierSearch] = useState('');

  // Modals
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Mock Customers Data
  const [customers] = useState<Customer[]>([
    { id: 1, name: 'Comercial Bolivia S.R.L.', tax_id: '1029384756', email: 'ventas@comercialbo.com', phone: '+591 71234567', address: 'Av. Heroínas #452, Cochabamba', group: 'Corporativos', credit_limit: 10000, current_balance: 3450, is_active: true, credit_enabled: true },
    { id: 2, name: 'Tienda El Sol (Pedro Mamani)', tax_id: '493827101', email: 'pmamani@gmail.com', phone: '+591 72345678', address: 'Calle Junín #120, Quillacollo', group: 'Mayoristas', credit_limit: 5000, current_balance: 4800, is_active: true, credit_enabled: true },
    { id: 3, name: 'Lucía Fernández', tax_id: '5849302', email: 'lucia.f@hotmail.com', phone: '+591 73456789', address: 'Av. América #890, Cochabamba', group: 'Minoristas', credit_limit: 500, current_balance: 0, is_active: true, credit_enabled: false },
  ]);

  // Mock Suppliers Data
  const [suppliers] = useState<Supplier[]>([
    { id: 1, company_name: 'Distribuidora Lácteos del Valle', contact_person: 'Carlos Justiniano', tax_id: '904837201', email: 'pedidos@lacteosvalle.com', phone: '+591 4 4567890', whatsapp: '+591 75678901', address: 'Zona Industrial Sacaba', balance_payable: 12450.00, last_po_date: '10/08/2026', payment_terms: '30 días', bank_info: 'Banco Nacional #4010-29384' },
    { id: 2, company_name: 'Importadora Electrónica TechBol', contact_person: 'Ana María Roca', tax_id: '803928102', email: 'contacto@techbol.com', phone: '+591 3 3345678', whatsapp: '+591 76789012', address: 'Av. Cristo Redentor #1200', balance_payable: 0.00, last_po_date: '02/08/2026', payment_terms: 'Contado', bank_info: 'Banco Mercantil #1000-88392' },
  ]);

  // Mock Groups Data
  const [customerGroups] = useState<CustomerGroup[]>([
    { id: 1, name: 'Precio Público (Minorista)', price_rule: 'RETAIL', discount_percentage: 0, customer_count: 142 },
    { id: 2, name: 'Distribuidor Mayorista', price_rule: 'WHOLESALE', discount_percentage: 0, customer_count: 28 },
    { id: 3, name: 'Clientes Frecuentes Vip', price_rule: 'DISCOUNT_FIXED', discount_percentage: 5.0, customer_count: 15 },
  ]);

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                          c.tax_id.includes(customerSearch) ||
                          c.phone.includes(customerSearch);
    const matchesGroup = groupFilter === 'ALL' || c.group === groupFilter;
    return matchesSearch && matchesGroup;
  });

  const filteredSuppliers = suppliers.filter(s => 
    s.company_name.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.contact_person.toLowerCase().includes(supplierSearch.toLowerCase()) ||
    s.tax_id.includes(supplierSearch)
  );

  return (
    <div className="p-6 bg-gray-50 dark:bg-[#000000] h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-200">
      {/* 1. Header & Main Tab Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-[#121212] p-5 rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Contact className="w-7 h-7 text-blue-500" />
            3. Contactos y Directorio Comercial
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Gestión integral de clientes (CxC), proveedores de abastecimiento (CxP) y niveles de precios
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center bg-gray-100 dark:bg-[#0B0C10] p-1.5 rounded-xl border border-gray-200 dark:border-[#1F2833]">
          <button
            onClick={() => setActiveTab('customers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'customers' ? 'bg-white dark:bg-[#121212] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            Clientes (CxC)
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'suppliers' ? 'bg-white dark:bg-[#121212] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Truck className="w-4 h-4" />
            Proveedores (CxP)
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all ${
              activeTab === 'groups' ? 'bg-white dark:bg-[#121212] text-blue-600 dark:text-blue-400 shadow-sm' : 'text-gray-500'
            }`}
          >
            <Users className="w-4 h-4" />
            Grupos y Tarifas
          </button>
        </div>
      </div>

      {/* TAB 1: CUSTOMERS DIRECTORY */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Top Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121212] p-4 rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Buscar cliente por nombre, NIT/RUC o teléfono..."
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3">
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="px-3 py-2 bg-gray-100 dark:bg-[#0B0C10] text-gray-900 dark:text-white rounded-xl border border-gray-200 dark:border-[#1F2833] text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos los Grupos</option>
                <option value="Minoristas">Minoristas</option>
                <option value="Mayoristas">Mayoristas</option>
                <option value="Corporativos">Corporativos</option>
                <option value="Frecuentes">Frecuentes</option>
              </select>

              <button
                onClick={() => setIsCustomerModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all"
              >
                <Plus className="w-4 h-4" />
                Nuevo Cliente
              </button>
            </div>
          </div>

          {/* Customers Data Table */}
          <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-[#0B0C10] text-gray-500 dark:text-gray-400 text-[11px] font-extrabold uppercase tracking-wider border-b border-gray-200 dark:border-[#1F2833]">
                  <th className="p-4">Cliente / Razón Social</th>
                  <th className="p-4">Contacto & Dirección</th>
                  <th className="p-4">Línea de Crédito (CxC)</th>
                  <th className="p-4 text-center">Estado</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1F2833] text-xs">
                {filteredCustomers.map((c) => {
                  const creditPct = Math.min(100, (c.current_balance / c.credit_limit) * 100);
                  const isBlocked = creditPct >= 90;

                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1D20] transition-colors">
                      <td className="p-4">
                        <p className="font-bold text-gray-900 dark:text-white">{c.name}</p>
                        <span className="text-gray-400 font-mono text-[11px]">NIT/RUC: {c.tax_id} • {c.email}</span>
                      </td>
                      <td className="p-4">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">{c.phone}</p>
                        <span className="text-gray-400 text-[11px] truncate block max-w-xs">{c.address}</span>
                      </td>
                      <td className="p-4">
                        <div className="space-y-1 w-48">
                          <div className="flex justify-between font-mono font-bold text-[11px]">
                            <span className="text-gray-500">Deuda: <span className="text-blue-600 dark:text-blue-400">${c.current_balance.toFixed(2)}</span></span>
                            <span className="text-gray-400">Lím: ${c.credit_limit}</span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                            <div 
                              style={{ width: `${creditPct}%` }}
                              className={`h-full ${isBlocked ? 'bg-rose-500' : creditPct > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${
                          isBlocked 
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-200' 
                            : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200'
                        }`}>
                          {isBlocked ? 'BLOQUEADO MORA' : 'ACTIVO'}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <button
                          onClick={() => {
                            setSelectedCustomer(c);
                            setIsLedgerModalOpen(true);
                          }}
                          className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-50 rounded-lg"
                          title="Ver Estado de Cuenta (Historial CxC)"
                        >
                          <History className="w-4 h-4" />
                        </button>
                        <button className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Editar">
                          <Edit3 className="w-4 h-4" />
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

      {/* TAB 2: SUPPLIERS DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-[#121212] p-4 rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={supplierSearch}
                onChange={(e) => setSupplierSearch(e.target.value)}
                placeholder="Buscar proveedor por empresa, contacto o NIT..."
                className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={() => setIsSupplierModalOpen(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              Nuevo Proveedor
            </button>
          </div>

          <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 dark:bg-[#0B0C10] text-gray-500 dark:text-gray-400 text-[11px] font-extrabold uppercase tracking-wider border-b border-gray-200 dark:border-[#1F2833]">
                  <th className="p-4">Proveedor / Empresa</th>
                  <th className="p-4">Comunicación & Pedidos</th>
                  <th className="p-4">Cuentas por Pagar (CxP)</th>
                  <th className="p-4">Términos Pago</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-[#1F2833] text-xs">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1D20]">
                    <td className="p-4">
                      <p className="font-bold text-gray-900 dark:text-white">{s.company_name}</p>
                      <span className="text-gray-400 font-mono text-[11px]">Contacto: {s.contact_person} • NIT: {s.tax_id}</span>
                    </td>
                    <td className="p-4">
                      <p className="font-semibold text-gray-800 dark:text-gray-200">{s.phone} • WA: {s.whatsapp}</p>
                      <span className="text-gray-400 text-[11px]">{s.email}</span>
                    </td>
                    <td className="p-4 font-mono font-bold">
                      <span className={s.balance_payable > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}>
                        ${s.balance_payable.toFixed(2)}
                      </span>
                      <span className="block text-[10px] text-gray-400 font-normal">Última OC: {s.last_po_date}</span>
                    </td>
                    <td className="p-4 font-semibold text-gray-700 dark:text-gray-300">
                      {s.payment_terms}
                    </td>
                    <td className="p-4 text-right space-x-1">
                      <button className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Registrar Pago CxP">
                        <DollarSign className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg" title="Editar">
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: GROUPS & PRICING */}
      {activeTab === 'groups' && (
        <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-[#1F2833] p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-[#1F2833] pb-4">
            <div>
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Grupos de Clientes y Niveles de Precios</h3>
              <p className="text-xs text-gray-500">Defina reglas de tarificación predeterminadas para aplicar automáticamente en el POS</p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow hover:bg-blue-700">
              + Nuevo Grupo
            </button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100 dark:bg-[#0B0C10] text-gray-500 dark:text-gray-400 text-[11px] font-extrabold uppercase tracking-wider border-b border-gray-200 dark:border-[#1F2833]">
                <th className="p-4">Nombre del Grupo</th>
                <th className="p-4">Regla de Asignación de Precio</th>
                <th className="p-4">Descuento Adicional</th>
                <th className="p-4">Clientes Asociados</th>
                <th className="p-4 text-right">Acción POS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-[#1F2833] text-xs">
              {customerGroups.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50 dark:hover:bg-[#1A1D20]">
                  <td className="p-4 font-bold text-gray-900 dark:text-white">
                    {g.name}
                  </td>
                  <td className="p-4 font-semibold text-blue-600 dark:text-blue-400">
                    {g.price_rule === 'RETAIL' && 'Precio Minorista por defecto'}
                    {g.price_rule === 'WHOLESALE' && 'Precio Mayorista automático por volumen'}
                    {g.price_rule === 'DISCOUNT_FIXED' && 'Descuento porcentual fijo sobre catálogo'}
                  </td>
                  <td className="p-4 font-mono font-bold">
                    {g.discount_percentage}%
                  </td>
                  <td className="p-4 font-bold text-gray-700 dark:text-gray-300">
                    {g.customer_count} clientes
                  </td>
                  <td className="p-4 text-right">
                    <button className="px-3 py-1 bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-lg font-bold text-xs">
                      Editar Tarifa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CUSTOMER FORM MODAL */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-2xl w-full max-w-lg overflow-hidden space-y-4">
            <div className="p-5 border-b border-gray-100 dark:border-[#1F2833] flex items-center justify-between">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Crear Nuevo Cliente</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setIsCustomerModalOpen(false); }} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Razón Social / Nombre Completo *</label>
                <input type="text" required placeholder="Ej. Comercial Bolivia S.R.L." className="w-full mt-1 p-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">NIT / Cédula *</label>
                  <input type="text" required placeholder="1029384756" className="w-full mt-1 p-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-mono" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">Teléfono</label>
                  <input type="text" placeholder="+591 70000000" className="w-full mt-1 p-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">Grupo de Cliente</label>
                  <select className="w-full mt-1 p-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-bold">
                    <option value="Minoristas">Minoristas</option>
                    <option value="Mayoristas">Mayoristas</option>
                    <option value="Corporativos">Corporativos</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">Límite de Crédito ($)</label>
                  <input type="number" defaultValue={1000} className="w-full mt-1 p-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-mono font-bold" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsCustomerModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow">Guardar Cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER FORM MODAL */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-2xl w-full max-w-lg overflow-hidden space-y-4">
            <div className="p-5 border-b border-gray-100 dark:border-[#1F2833] flex items-center justify-between">
              <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Crear Nuevo Proveedor</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); setIsSupplierModalOpen(false); }} className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-bold text-gray-700 dark:text-gray-300">Empresa Proveedora *</label>
                <input type="text" required placeholder="Ej. Distribuidora Lácteos del Valle" className="w-full mt-1 p-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">Representante Comercial</label>
                  <input type="text" placeholder="Carlos Justiniano" className="w-full mt-1 p-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl" />
                </div>
                <div>
                  <label className="font-bold text-gray-700 dark:text-gray-300">NIT / RUC *</label>
                  <input type="text" required placeholder="904837201" className="w-full mt-1 p-2 bg-gray-100 dark:bg-[#0B0C10] border border-gray-200 dark:border-[#1F2833] rounded-xl font-mono" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsSupplierModalOpen(false)} className="px-4 py-2 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-extrabold shadow">Guardar Proveedor</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEDGER MODAL */}
      {isLedgerModalOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#121212] rounded-2xl border border-gray-200 dark:border-[#1F2833] shadow-2xl w-full max-w-2xl overflow-hidden space-y-4">
            <div className="p-5 border-b border-gray-100 dark:border-[#1F2833] flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-base text-gray-900 dark:text-white">Estado de Cuenta (CxC)</h3>
                <p className="text-xs text-gray-500">{selectedCustomer.name} • NIT: {selectedCustomer.tax_id}</p>
              </div>
              <button onClick={() => setIsLedgerModalOpen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3 p-4 bg-gray-50 dark:bg-[#0B0C10] rounded-xl border border-gray-200 dark:border-[#1F2833]">
                <div>
                  <span className="text-gray-400 font-bold text-[10px]">TOTAL COMPRADO</span>
                  <p className="font-mono font-bold text-base text-gray-900 dark:text-white">$12,450.00</p>
                </div>
                <div>
                  <span className="text-gray-400 font-bold text-[10px]">TOTAL ABONADO</span>
                  <p className="font-mono font-bold text-base text-emerald-600 dark:text-emerald-400">$9,000.00</p>
                </div>
                <div>
                  <span className="text-gray-400 font-bold text-[10px]">SALDO PENDIENTE</span>
                  <p className="font-mono font-bold text-base text-blue-600 dark:text-blue-400">${selectedCustomer.current_balance.toFixed(2)}</p>
                </div>
              </div>

              <h4 className="font-bold text-gray-900 dark:text-white">Historial de Tickets a Crédito</h4>
              <div className="max-h-48 overflow-y-auto border border-gray-200 dark:border-[#1F2833] rounded-xl">
                <table className="w-full text-left">
                  <thead className="bg-gray-100 dark:bg-[#0B0C10] text-[10px] font-bold uppercase text-gray-500">
                    <tr>
                      <th className="p-2.5">Ticket</th>
                      <th className="p-2.5">Fecha</th>
                      <th className="p-2.5">Monto Original</th>
                      <th className="p-2.5">Abonado</th>
                      <th className="p-2.5 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-[#1F2833] font-mono text-[11px]">
                    <tr>
                      <td className="p-2.5 font-bold">TK-10012</td>
                      <td className="p-2.5">02/08/2026</td>
                      <td className="p-2.5">$3,450.00</td>
                      <td className="p-2.5 text-emerald-600">$0.00</td>
                      <td className="p-2.5 text-right font-bold text-blue-600">$3,450.00</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
