import React, { useMemo, useState } from 'react';
import { Edit3, History, Plus, Truck, UserCheck, Users } from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  DescriptionList,
  EmptyState,
  IconButton,
  Modal,
  Money,
  PageHeader,
  Pagination,
  Tabs,
  Toolbar,
  ToolbarSelect,
} from '../ui';
import type { Column, TabItem } from '../ui';

interface Customer {
  id: number;
  name: string;
  tax_id: string;
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

type Tab = 'customers' | 'suppliers' | 'groups';

const TABS: TabItem[] = [
  { id: 'customers', label: 'Clientes', icon: <UserCheck className="w-4 h-4" /> },
  { id: 'suppliers', label: 'Proveedores', icon: <Truck className="w-4 h-4" /> },
  { id: 'groups', label: 'Grupos', icon: <Users className="w-4 h-4" /> },
];

/* Vocabulario de producto, no de base de datos. */
const PRICE_RULE: Record<CustomerGroup['price_rule'], string> = {
  RETAIL: 'Precio público',
  WHOLESALE: 'Precio mayorista',
  DISCOUNT_FIXED: 'Descuento fijo',
};

const GROUP_TONE: Record<Customer['group'], 'neutral' | 'accent' | 'success' | 'warning'> = {
  Minoristas: 'neutral',
  Mayoristas: 'accent',
  Corporativos: 'success',
  Frecuentes: 'warning',
};

export const ContactsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('customers');

  const [customerSearch, setCustomerSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [balanceFilter, setBalanceFilter] = useState('ALL');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  // Mock Customers Data
  const [customers] = useState<Customer[]>([
    {
      id: 1,
      name: 'Comercial Bolivia S.R.L.',
      tax_id: '1029384756',
      email: 'ventas@comercialbo.com',
      phone: '+591 71234567',
      address: 'Av. Heroínas #452, Cochabamba',
      group: 'Corporativos',
      credit_limit: 10000,
      current_balance: 3450,
      is_active: true,
      credit_enabled: true,
    },
    {
      id: 2,
      name: 'Tienda El Sol (Pedro Mamani)',
      tax_id: '493827101',
      email: 'pmamani@gmail.com',
      phone: '+591 72345678',
      address: 'Calle Junín #120, Quillacollo',
      group: 'Mayoristas',
      credit_limit: 5000,
      current_balance: 4800,
      is_active: true,
      credit_enabled: true,
    },
    {
      id: 3,
      name: 'Lucía Fernández',
      tax_id: '5849302',
      email: 'lucia.f@hotmail.com',
      phone: '+591 73456789',
      address: 'Av. América #890, Cochabamba',
      group: 'Minoristas',
      credit_limit: 500,
      current_balance: 0,
      is_active: true,
      credit_enabled: false,
    },
  ]);

  // Mock Suppliers Data
  const [suppliers] = useState<Supplier[]>([
    {
      id: 1,
      company_name: 'Distribuidora Lácteos del Valle',
      contact_person: 'Carlos Justiniano',
      tax_id: '904837201',
      email: 'pedidos@lacteosvalle.com',
      phone: '+591 4 4567890',
      whatsapp: '+591 75678901',
      address: 'Zona Industrial Sacaba',
      balance_payable: 12450.0,
      last_po_date: '10/08/2026',
      payment_terms: '30 días',
      bank_info: 'Banco Nacional #4010-29384',
    },
    {
      id: 2,
      company_name: 'Importadora Electrónica TechBol',
      contact_person: 'Ana María Roca',
      tax_id: '803928102',
      email: 'contacto@techbol.com',
      phone: '+591 3 3345678',
      whatsapp: '+591 76789012',
      address: 'Av. Cristo Redentor #1200',
      balance_payable: 0.0,
      last_po_date: '02/08/2026',
      payment_terms: 'Contado',
      bank_info: 'Banco Mercantil #1000-88392',
    },
  ]);

  // Mock Groups Data
  const [customerGroups] = useState<CustomerGroup[]>([
    {
      id: 1,
      name: 'Precio Público (Minorista)',
      price_rule: 'RETAIL',
      discount_percentage: 0,
      customer_count: 142,
    },
    {
      id: 2,
      name: 'Distribuidor Mayorista',
      price_rule: 'WHOLESALE',
      discount_percentage: 0,
      customer_count: 28,
    },
    {
      id: 3,
      name: 'Clientes Frecuentes Vip',
      price_rule: 'DISCOUNT_FIXED',
      discount_percentage: 5.0,
      customer_count: 15,
    },
  ]);

  /* Un solo filtrado para una sola tabla: antes eran cuatro tablas casi
     idénticas, una por grupo de clientes. */
  const filteredCustomers = useMemo(() => {
    const q = customerSearch.toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(q) ||
        c.tax_id.includes(customerSearch) ||
        c.phone.includes(customerSearch);
      const matchesGroup = groupFilter === 'ALL' || c.group === groupFilter;
      const matchesBalance =
        balanceFilter === 'ALL' ||
        (balanceFilter === 'DEBT' ? c.current_balance > 0 : c.current_balance === 0);
      return matchesSearch && matchesGroup && matchesBalance;
    });
  }, [customers, customerSearch, groupFilter, balanceFilter]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierSearch.toLowerCase();
    return suppliers.filter(
      (s) =>
        s.company_name.toLowerCase().includes(q) ||
        s.contact_person.toLowerCase().includes(q) ||
        s.tax_id.includes(supplierSearch),
    );
  }, [suppliers, supplierSearch]);

  const customerColumns: Array<Column<Customer>> = [
    {
      key: 'name',
      header: 'Cliente',
      render: (c) => (
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink truncate">{c.name}</p>
          <p className="font-mono text-micro text-ink-3">NIT {c.tax_id}</p>
        </div>
      ),
    },
    {
      key: 'group',
      header: 'Grupo',
      width: '140px',
      render: (c) => <Badge tone={GROUP_TONE[c.group]}>{c.group}</Badge>,
    },
    {
      key: 'contact',
      header: 'Contacto',
      width: '210px',
      render: (c) => (
        <div className="min-w-0">
          <p className="font-mono tnum text-body text-ink-2">{c.phone}</p>
          <p className="text-body text-ink-3 truncate">{c.email}</p>
        </div>
      ),
    },
    {
      key: 'balance',
      header: 'Saldo',
      align: 'right',
      width: '150px',
      render: (c) =>
        c.current_balance > 0 ? (
          <div>
            <Money value={c.current_balance} size="base" className="text-danger" />
            <p className="text-body text-ink-3">
              límite <Money value={c.credit_limit} size="body" />
            </p>
          </div>
        ) : (
          <span className="text-body text-ink-3">Sin deuda</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '110px',
      render: (c) => (
        <div className="flex items-center justify-end gap-0.5">
          <IconButton
            label={`Ver ficha de ${c.name}`}
            tone="accent"
            onClick={() => setDetailCustomer(c)}
          >
            <History className="w-4 h-4" />
          </IconButton>
          <IconButton label={`Editar ${c.name}`} onClick={() => setIsCustomerModalOpen(true)}>
            <Edit3 className="w-4 h-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  const supplierColumns: Array<Column<Supplier>> = [
    {
      key: 'company',
      header: 'Proveedor',
      render: (s) => (
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink truncate">{s.company_name}</p>
          <p className="text-body text-ink-3 truncate">{s.contact_person}</p>
        </div>
      ),
    },
    {
      key: 'terms',
      header: 'Pago',
      width: '120px',
      render: (s) => (
        <Badge tone={s.payment_terms === 'Contado' ? 'success' : 'neutral'}>
          {s.payment_terms}
        </Badge>
      ),
    },
    {
      key: 'contact',
      header: 'Contacto',
      width: '190px',
      render: (s) => <span className="font-mono tnum text-body text-ink-2">{s.phone}</span>,
    },
    {
      key: 'last',
      header: 'Última orden',
      width: '130px',
      render: (s) => <span className="font-mono tnum text-body text-ink-2">{s.last_po_date}</span>,
    },
    {
      key: 'payable',
      header: 'Por pagar',
      align: 'right',
      width: '140px',
      render: (s) =>
        s.balance_payable > 0 ? (
          <Money value={s.balance_payable} size="base" className="text-warn-ink" />
        ) : (
          <span className="text-body text-ink-3">Al día</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      width: '60px',
      render: (s) => (
        <IconButton
          label={`Ver ficha de ${s.company_name}`}
          tone="accent"
          onClick={() => setDetailSupplier(s)}
        >
          <History className="w-4 h-4" />
        </IconButton>
      ),
    },
  ];

  const groupColumns: Array<Column<CustomerGroup>> = [
    {
      key: 'name',
      header: 'Grupo',
      render: (g) => <span className="text-base font-semibold text-ink">{g.name}</span>,
    },
    {
      key: 'rule',
      header: 'Regla de precio',
      width: '190px',
      render: (g) => <Badge tone="accent">{PRICE_RULE[g.price_rule]}</Badge>,
    },
    {
      key: 'discount',
      header: 'Descuento',
      align: 'right',
      width: '120px',
      render: (g) =>
        g.discount_percentage > 0 ? (
          <span className="font-mono tnum text-ok font-semibold">
            {g.discount_percentage.toFixed(1)}%
          </span>
        ) : (
          <span className="text-ink-3">—</span>
        ),
    },
    {
      key: 'count',
      header: 'Clientes',
      align: 'right',
      width: '110px',
      render: (g) => <span className="font-mono tnum text-ink">{g.customer_count}</span>,
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-canvas select-none">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        <PageHeader
          title="Contactos"
          subtitle="Clientes, proveedores y las reglas de precio que se les aplican."
          actions={
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => setIsCustomerModalOpen(true)}
            >
              {activeTab === 'suppliers' ? 'Nuevo proveedor' : 'Nuevo cliente'}
            </Button>
          }
          tabs={
            <Tabs
              items={TABS}
              value={activeTab}
              onChange={(id) => setActiveTab(id as Tab)}
              label="Tipo de contacto"
            />
          }
        />

        {activeTab === 'customers' && (
          <div className="space-y-4">
            <Toolbar
              search={customerSearch}
              onSearchChange={setCustomerSearch}
              searchPlaceholder="Buscar por nombre, NIT o teléfono…"
              filters={
                <>
                  <ToolbarSelect
                    aria-label="Grupo"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                  >
                    <option value="ALL">Todos los grupos</option>
                    <option value="Minoristas">Minoristas</option>
                    <option value="Mayoristas">Mayoristas</option>
                    <option value="Corporativos">Corporativos</option>
                    <option value="Frecuentes">Frecuentes</option>
                  </ToolbarSelect>
                  <ToolbarSelect
                    aria-label="Saldo"
                    value={balanceFilter}
                    onChange={(e) => setBalanceFilter(e.target.value)}
                  >
                    <option value="ALL">Cualquier saldo</option>
                    <option value="DEBT">Con deuda</option>
                    <option value="CLEAR">Sin deuda</option>
                  </ToolbarSelect>
                </>
              }
            />

            <DataTable
              columns={customerColumns}
              rows={filteredCustomers}
              rowKey={(c) => c.id}
              empty={
                <EmptyState
                  icon={<UserCheck className="w-6 h-6" />}
                  title="Sin clientes que coincidan"
                  hint="Ajuste la búsqueda o los filtros."
                />
              }
            />

            <Pagination
              shown={filteredCustomers.length}
              total={customers.length}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              noun="clientes"
            />
          </div>
        )}

        {activeTab === 'suppliers' && (
          <div className="space-y-4">
            <Toolbar
              search={supplierSearch}
              onSearchChange={setSupplierSearch}
              searchPlaceholder="Buscar por empresa, contacto o NIT…"
            />
            <DataTable
              columns={supplierColumns}
              rows={filteredSuppliers}
              rowKey={(s) => s.id}
              empty={
                <EmptyState
                  icon={<Truck className="w-6 h-6" />}
                  title="Sin proveedores que coincidan"
                  hint="Ajuste la búsqueda."
                />
              }
            />
            <Pagination
              shown={filteredSuppliers.length}
              total={suppliers.length}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              noun="proveedores"
            />
          </div>
        )}

        {activeTab === 'groups' && (
          <Card
            title="Grupos y reglas de precio"
            subtitle="El grupo determina qué precio ve el cajero en el punto de venta."
            icon={<Users className="w-4 h-4" />}
            padding="none"
          >
            <DataTable
              columns={groupColumns}
              rows={customerGroups}
              rowKey={(g) => g.id}
              dense
              className="border-0 rounded-none"
            />
          </Card>
        )}
      </div>

      {/* Ficha de cliente */}
      <Modal
        isOpen={!!detailCustomer}
        onClose={() => setDetailCustomer(null)}
        icon={<UserCheck className="w-4 h-4" />}
        title={detailCustomer?.name ?? ''}
        subtitle={detailCustomer ? `NIT ${detailCustomer.tax_id}` : undefined}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setDetailCustomer(null)}>
            Cerrar
          </Button>
        }
      >
        {detailCustomer && (
          <DescriptionList
            items={[
              {
                label: 'Grupo',
                value: (
                  <Badge tone={GROUP_TONE[detailCustomer.group]}>{detailCustomer.group}</Badge>
                ),
              },
              { label: 'Estado', value: detailCustomer.is_active ? 'Activo' : 'Inactivo' },
              {
                label: 'Teléfono',
                value: <span className="font-mono">{detailCustomer.phone}</span>,
              },
              { label: 'Correo', value: detailCustomer.email },
              { label: 'Dirección', value: detailCustomer.address, wide: true },
              { label: 'Límite de crédito', value: <Money value={detailCustomer.credit_limit} /> },
              {
                label: 'Saldo actual',
                value: (
                  <Money
                    value={detailCustomer.current_balance}
                    className={detailCustomer.current_balance > 0 ? 'text-danger' : 'text-ink'}
                  />
                ),
              },
              {
                label: 'Venta a crédito',
                value: detailCustomer.credit_enabled ? 'Habilitada' : 'No habilitada',
              },
            ]}
          />
        )}
      </Modal>

      {/* Ficha de proveedor */}
      <Modal
        isOpen={!!detailSupplier}
        onClose={() => setDetailSupplier(null)}
        icon={<Truck className="w-4 h-4" />}
        title={detailSupplier?.company_name ?? ''}
        subtitle={detailSupplier ? `NIT ${detailSupplier.tax_id}` : undefined}
        size="lg"
        footer={
          <Button variant="ghost" onClick={() => setDetailSupplier(null)}>
            Cerrar
          </Button>
        }
      >
        {detailSupplier && (
          <DescriptionList
            items={[
              { label: 'Persona de contacto', value: detailSupplier.contact_person },
              { label: 'Condición de pago', value: detailSupplier.payment_terms },
              {
                label: 'Teléfono',
                value: <span className="font-mono">{detailSupplier.phone}</span>,
              },
              {
                label: 'WhatsApp',
                value: <span className="font-mono">{detailSupplier.whatsapp}</span>,
              },
              { label: 'Correo', value: detailSupplier.email },
              {
                label: 'Última orden',
                value: <span className="font-mono">{detailSupplier.last_po_date}</span>,
              },
              { label: 'Dirección', value: detailSupplier.address, wide: true },
              {
                label: 'Datos bancarios',
                value: <span className="font-mono">{detailSupplier.bank_info}</span>,
                wide: true,
              },
              { label: 'Saldo por pagar', value: <Money value={detailSupplier.balance_payable} /> },
            ]}
          />
        )}
      </Modal>

      {/* Alta de contacto */}
      <Modal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        icon={<Plus className="w-4 h-4" />}
        title={activeTab === 'suppliers' ? 'Nuevo proveedor' : 'Nuevo cliente'}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsCustomerModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => setIsCustomerModalOpen(false)}>Guardar</Button>
          </>
        }
      >
        <p className="text-base text-ink-2 leading-relaxed">
          El formulario de alta se conecta al endpoint de contactos. Los campos y su validación se
          migran junto con el resto del módulo.
        </p>
      </Modal>
    </div>
  );
};
