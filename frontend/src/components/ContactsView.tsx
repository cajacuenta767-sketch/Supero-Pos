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
  Input,
  Modal,
  Money,
  PageHeader,
  Pagination,
  Select,
  Tabs,
  Toolbar,
  ToolbarSelect,
  useToast,
} from '../ui';
import { useViewShortcuts } from '../hooks/useViewShortcuts';
import type { Column, TabItem } from '../ui';
import { usePersistentState } from '../store/persist';
import {
  useCustomersStore,
  PUBLIC_CUSTOMER_ID,
  GROUP_LABEL,
  GROUP_PRICE_RULE,
  GROUP_DISCOUNT,
  type CustomerGroup as CustomerGroupCode,
} from '../store/useCustomersStore';

interface Customer {
  id: string;
  name: string;
  tax_id: string;
  email: string;
  phone: string;
  address: string;
  group: CustomerGroupCode;
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
  code: CustomerGroupCode;
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

const GROUP_TONE: Record<CustomerGroupCode, 'neutral' | 'accent' | 'success' | 'warning'> = {
  GENERAL: 'neutral',
  MINORISTA: 'neutral',
  MAYORISTA: 'accent',
  CORPORATIVO: 'success',
  VIP: 'warning',
};

/* Los grupos que existen, en el orden en que se leen. */
const GROUP_ORDER: CustomerGroupCode[] = ['MINORISTA', 'MAYORISTA', 'CORPORATIVO', 'VIP'];

export const ContactsView: React.FC = () => {
  const toast = useToast();

  /* F2 lleva el foco al buscador, «N» abre el alta. */
  useViewShortcuts({ onNew: () => setIsCustomerModalOpen(true) });
  const [activeTab, setActiveTab] = useState<Tab>('customers');

  const [customerSearch, setCustomerSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [balanceFilter, setBalanceFilter] = useState('ALL');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [pageSize, setPageSize] = useState(25);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    tax_id: '',
    email: '',
    phone: '',
    address: '',
    group: 'MINORISTA' as CustomerGroupCode,
    credit_limit: 0,
  });
  const [contactError, setContactError] = useState<string | undefined>();
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);

  /* Los clientes salen del listado compartido con el punto de venta. Esta
     vista tenía su propia lista y el selector de cliente del cobro tenía otra:
     «Comercial Bolivia S.R.L.» figuraba en las dos con NIT distinto, otro
     límite de crédito y otra deuda. */
  const storeCustomers = useCustomersStore((state) => state.customers);
  const addStoreCustomer = useCustomersStore((state) => state.addCustomer);
  const taxIdOwner = useCustomersStore((state) => state.taxIdOwner);

  const customers: Customer[] = useMemo(
    () =>
      storeCustomers
        /* El cliente de mostrador no es una ficha: es la opción por defecto del
           cobro y no se administra desde aquí. */
        .filter((c) => c.id !== PUBLIC_CUSTOMER_ID)
        .map((c) => ({
          id: c.id,
          name: c.name,
          tax_id: c.taxId,
          email: c.email ?? '',
          phone: c.phone ?? '',
          address: c.address ?? '',
          group: c.group,
          credit_limit: c.creditLimit,
          current_balance: c.currentDebt,
          is_active: c.isActive,
          credit_enabled: c.creditEnabled,
        })),
    [storeCustomers],
  );

  // Mock Suppliers Data
  const [suppliers, setSuppliers] = usePersistentState<Supplier[]>('proveedores', [
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

  /* Los grupos se cuentan sobre los clientes que hay. La tabla decía 142, 28 y
     15 clientes escritos a mano mientras el listado tenía cinco: una cuenta
     desnormalizada que nadie actualizaba nunca. */
  const customerGroups: CustomerGroup[] = useMemo(
    () =>
      GROUP_ORDER.map((code, index) => ({
        id: index + 1,
        code,
        name: GROUP_LABEL[code],
        price_rule: GROUP_PRICE_RULE[code],
        discount_percentage: GROUP_DISCOUNT[code],
        customer_count: customers.filter((c) => c.group === code).length,
      })),
    [customers],
  );

  /* Un solo filtrado para una sola tabla: antes eran cuatro tablas casi
     idénticas, una por grupo de clientes. */
  const closeContactModal = () => {
    setIsCustomerModalOpen(false);
    setContactError(undefined);
    setContactForm({
      name: '',
      tax_id: '',
      email: '',
      phone: '',
      address: '',
      group: 'MINORISTA',
      credit_limit: 0,
    });
  };

  /**
   * Alta de cliente o proveedor.
   *
   * Antes este modal solo mostraba un texto diciendo que el formulario «se
   * conecta al endpoint de contactos»: se pulsaba Guardar y no pasaba nada.
   */
  const saveContact = () => {
    const name = contactForm.name.trim();
    if (!name) {
      setContactError('El nombre es obligatorio.');
      return;
    }
    if (!contactForm.tax_id.trim()) {
      setContactError('El NIT o carnet es obligatorio.');
      return;
    }

    /* El NIT identifica fiscalmente: repetirlo genera dos fichas para la misma
       empresa y descuadra las cuentas por cobrar. */
    const duplicated =
      activeTab === 'suppliers'
        ? suppliers.some((sup) => sup.tax_id === contactForm.tax_id.trim())
        : taxIdOwner(contactForm.tax_id) !== undefined;
    if (duplicated) {
      setContactError('Ya existe un contacto con ese NIT.');
      return;
    }

    if (activeTab === 'suppliers') {
      setSuppliers((prev) => [
        {
          id: Math.max(0, ...prev.map((x) => x.id)) + 1,
          company_name: name,
          contact_person: name,
          tax_id: contactForm.tax_id.trim(),
          email: contactForm.email.trim(),
          phone: contactForm.phone.trim(),
          whatsapp: contactForm.phone.trim(),
          address: contactForm.address.trim(),
          balance_payable: 0,
          last_po_date: '—',
          payment_terms: 'Contado',
          bank_info: '—',
        },
        ...prev,
      ]);
    } else {
      addStoreCustomer({
        name,
        taxId: contactForm.tax_id.trim(),
        email: contactForm.email.trim() || undefined,
        phone: contactForm.phone.trim() || undefined,
        address: contactForm.address.trim() || undefined,
        group: contactForm.group,
        creditLimit: contactForm.credit_limit,
        currentDebt: 0,
        isActive: true,
        creditEnabled: contactForm.credit_limit > 0,
      });
    }

    toast(activeTab === 'suppliers' ? 'Proveedor registrado' : 'Cliente registrado', 'success');
    closeContactModal();
  };

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
      card: 'title',
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
      card: 'meta',
      width: '140px',
      render: (c) => <Badge tone={GROUP_TONE[c.group]}>{GROUP_LABEL[c.group]}</Badge>,
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
      card: 'hidden',
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
      card: 'title',
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
                    {GROUP_ORDER.map((g) => (
                      <option key={g} value={g}>
                        {GROUP_LABEL[g]}
                      </option>
                    ))}
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
              caption="Clientes registrados, con su grupo, saldo y estado"
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
              caption="Proveedores registrados, con su deuda y condición de pago"
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
              caption="Grupos de clientes y la regla de precio de cada uno"
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
        onClose={closeContactModal}
        icon={<Plus className="w-4 h-4" />}
        title={activeTab === 'suppliers' ? 'Nuevo proveedor' : 'Nuevo cliente'}
        subtitle="Los datos quedan guardados en la terminal y se sincronizan cuando hay red."
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={closeContactModal}>
              Cancelar
            </Button>
            <Button onClick={saveContact} icon={<Plus className="w-4 h-4" />}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label={activeTab === 'suppliers' ? 'Razón social' : 'Nombre o razón social'}
            required
            autoFocus
            value={contactForm.name}
            onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
            error={contactError}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="NIT o carnet"
              required
              value={contactForm.tax_id}
              onChange={(e) =>
                setContactForm({ ...contactForm, tax_id: e.target.value.replace(/\D/g, '') })
              }
              hint="Solo dígitos."
              className="[&_input]:font-mono"
            />
            <Input
              label="Teléfono"
              value={contactForm.phone}
              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              placeholder="+591 7…"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Correo"
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
            />
            {activeTab === 'customers' && (
              <Select
                label="Grupo"
                value={contactForm.group}
                onChange={(e) =>
                  setContactForm({ ...contactForm, group: e.target.value as Customer['group'] })
                }
              >
                {GROUP_ORDER.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </Select>
            )}
          </div>
          <Input
            label="Dirección"
            value={contactForm.address}
            onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
          />
          {activeTab === 'customers' && (
            <Input
              label="Límite de crédito"
              type="number"
              min={0}
              step="1"
              value={contactForm.credit_limit || ''}
              onChange={(e) =>
                setContactForm({ ...contactForm, credit_limit: parseFloat(e.target.value) || 0 })
              }
              hint="Cero deja al cliente solo al contado."
              className="[&_input]:font-mono [&_input]:text-right"
            />
          )}
        </div>
      </Modal>
    </div>
  );
};
