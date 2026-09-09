import React, { useState } from 'react';
import { Check, Plus, Search, UserCheck } from 'lucide-react';
import { Badge, Button, Input, Modal, Select, cn } from '../ui';
import { usePosStore, Customer } from '../store/usePosStore';
import { useCustomersStore, GROUP_DISCOUNT, type CustomerGroup } from '../store/useCustomersStore';

interface CustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CustomerModal: React.FC<CustomerModalProps> = ({ isOpen, onClose }) => {
  const { setCustomer, selectedCustomer } = usePosStore();
  /* Los clientes salen del listado compartido. Esta pantalla tenía su propia
     lista de cuatro, con NIT y crédito distintos de los de Contactos para el
     mismo cliente. */
  const sellable = useCustomersStore((state) => state.sellable);
  const addCustomer = useCustomersStore((state) => state.addCustomer);
  const taxIdOwner = useCustomersStore((state) => state.taxIdOwner);
  const [taxIdError, setTaxIdError] = useState('');
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    businessName: '',
    taxId: '',
    group: 'GENERAL' as 'GENERAL' | 'MAYORISTA' | 'VIP',
  });

  const filtered = sellable().filter(
    (c) =>
      c.businessName.toLowerCase().includes(search.toLowerCase()) ||
      c.taxId.toLowerCase().includes(search.toLowerCase()),
  );

  const select = (customer: Customer) => {
    setCustomer(customer);
    setSearch('');
    onClose();
  };

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newCustomer.businessName.trim();
    if (!name) return;

    const taxId = newCustomer.taxId.trim() || '0';
    /* Dos clientes con el mismo NIT hacen imposible cruzar sus compras y sus
       saldos: se avisa aquí, antes de crearlo. */
    const owner = taxIdOwner(taxId);
    if (owner) {
      setTaxIdError(`Ese NIT ya es de «${owner.name}».`);
      return;
    }

    /* El alta va al listado compartido: antes vivía y moría en este modal, así
       que el cliente que se creaba al cobrar no aparecía en Contactos. */
    const group = newCustomer.group as CustomerGroup;
    const created = addCustomer({
      name,
      taxId,
      group,
      creditLimit: 0,
      currentDebt: 0,
      isActive: true,
      creditEnabled: false,
    });

    select({
      id: created.id,
      businessName: created.name,
      taxId: created.taxId,
      group: newCustomer.group,
      discountPercentage: GROUP_DISCOUNT[group],
    });
    setNewCustomer({ businessName: '', taxId: '', group: 'GENERAL' });
    setTaxIdError('');
    setIsCreating(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      icon={<UserCheck className="w-4 h-4" />}
      title="Cliente del ticket"
      subtitle={`Asignado: ${selectedCustomer.businessName}`}
      size="md"
      footer={
        isCreating ? (
          <>
            <Button variant="ghost" onClick={() => setIsCreating(false)}>
              Volver a la lista
            </Button>
            <Button form="new-customer" type="submit" icon={<Check className="w-4 h-4" />}>
              Crear y asignar
            </Button>
          </>
        ) : (
          <Button
            variant="secondary"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreating(true)}
          >
            Nuevo cliente
          </Button>
        )
      }
    >
      {isCreating ? (
        <form id="new-customer" onSubmit={create} className="space-y-4">
          <Input
            label="Razón social o nombre"
            autoFocus
            required
            value={newCustomer.businessName}
            onChange={(e) => setNewCustomer({ ...newCustomer, businessName: e.target.value })}
            placeholder="Nombre del cliente"
          />
          <Input
            label="NIT o documento"
            value={newCustomer.taxId}
            error={taxIdError || undefined}
            onChange={(e) => {
              setNewCustomer({ ...newCustomer, taxId: e.target.value });
              setTaxIdError('');
            }}
            placeholder="0 para consumidor final"
            className="[&_input]:font-mono"
          />
          <Select
            label="Grupo"
            hint="El grupo VIP aplica un 5% de descuento en el ticket."
            value={newCustomer.group}
            onChange={(e) =>
              setNewCustomer({ ...newCustomer, group: e.target.value as typeof newCustomer.group })
            }
          >
            <option value="GENERAL">Público general</option>
            <option value="MAYORISTA">Mayorista</option>
            <option value="VIP">VIP</option>
          </Select>
        </form>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none" />
            <input
              type="text"
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre o NIT…"
              className="w-full h-11 pl-9 pr-3 bg-raised border border-line-strong rounded-md text-base text-ink hover:border-ink-3 focus:border-accent transition-colors duration-fast ease-ease"
            />
          </div>

          <div className="divide-y divide-line border border-line rounded-md max-h-[320px] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="p-6 text-center text-base text-ink-3">Sin clientes que coincidan.</p>
            ) : (
              filtered.map((c) => {
                const active = c.id === selectedCustomer.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => select(c)}
                    className={cn(
                      'w-full min-h-touch px-3 py-2.5 flex items-center gap-3 text-left',
                      'transition-colors duration-fast ease-ease',
                      active ? 'bg-accent-soft' : 'hover:bg-sunken',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-semibold text-ink truncate">{c.businessName}</p>
                      <p className="font-mono text-micro text-ink-3">NIT {c.taxId}</p>
                    </div>
                    {c.group === 'VIP' && <Badge tone="warning">VIP 5%</Badge>}
                    {c.group === 'MAYORISTA' && <Badge tone="accent">Mayorista</Badge>}
                    {active && <Check className="w-4 h-4 shrink-0 text-accent" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </Modal>
  );
};
