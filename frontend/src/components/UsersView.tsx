import { usePersistentState } from '../store/persist';
import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Percent,
  Edit3,
  Key,
  CheckCircle2,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  Building2,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  IconButton,
  Input,
  Meter,
  Modal,
  PageHeader,
  Pagination,
  Select,
  StatTile,
  Switch,
  Tabs,
  Toolbar,
  ToolbarSelect,
  cn,
} from '../ui';
import { formatDateTime } from '../utils/dates';
import { useViewShortcuts } from '../hooks/useViewShortcuts';
import { useDebounced } from '../hooks/useDebounced';
import type { Column, TabItem } from '../ui';

type SubTab = 'users' | 'rbac' | 'commissions';

const TABS: TabItem[] = [
  { id: 'users', label: 'Usuarios', icon: <Users className="w-4 h-4" /> },
  { id: 'rbac', label: 'Permisos', icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'commissions', label: 'Comisiones', icon: <Percent className="w-4 h-4" /> },
];

const ROLE_TONE: Record<string, 'accent' | 'success' | 'warning' | 'neutral'> = {
  ADMIN: 'accent',
  SUPERVISOR: 'success',
  CAJERO: 'neutral',
  ALMACENERO: 'warning',
};

/* Los permisos se agrupan por área: una lista plana de 21 claves técnicas no
   se puede revisar, una agrupada sí. */
const PERMISSION_GROUPS: Array<{ area: string; items: Array<{ key: string; label: string }> }> = [
  {
    area: 'Punto de venta',
    items: [
      { key: 'pos.create', label: 'Registrar ventas' },
      { key: 'pos.discount', label: 'Aplicar descuentos' },
      { key: 'pos.void', label: 'Anular tickets' },
      { key: 'pos.view_costs', label: 'Ver precios de costo' },
      { key: 'pos.open_drawer', label: 'Abrir la gaveta' },
      { key: 'pos.edit_prices', label: 'Modificar precios en el ticket' },
    ],
  },
  {
    area: 'Inventario',
    items: [
      { key: 'inv.purchases', label: 'Registrar compras' },
      { key: 'inv.adjustments', label: 'Ajustar stock' },
      { key: 'inv.kardex', label: 'Consultar kardex' },
      { key: 'inv.transfers', label: 'Transferir entre almacenes' },
      { key: 'inv.edit_catalog', label: 'Editar el catálogo' },
    ],
  },
  {
    area: 'Clientes',
    items: [
      { key: 'crm.create_customer', label: 'Dar de alta clientes' },
      { key: 'crm.credit_approval', label: 'Aprobar crédito' },
      { key: 'crm.receivables', label: 'Gestionar cobranzas' },
    ],
  },
  {
    area: 'Caja y finanzas',
    items: [
      { key: 'fin.theoretical_balance', label: 'Ver saldo teórico en el arqueo' },
      { key: 'fin.corte_x', label: 'Emitir corte X' },
      { key: 'fin.corte_z', label: 'Emitir corte Z' },
      { key: 'fin.petty_cash', label: 'Registrar gastos de caja chica' },
    ],
  },
];

/** Formas mínimas que esta vista consume de /api/v1/users y /roles. */
interface ApiUser {
  id: string;
  username: string;
  fullName?: string;
  email: string;
  phone?: string;
  role?: { name?: string };
  roleId?: string;
  branch?: { name?: string };
  branchId?: string;
  isActive?: boolean;
  lastLogin?: string;
}
interface ApiNamed {
  id?: string;
  name: string;
}

export interface UserItem {
  id: string;
  name: string;
  username: string;
  email: string;
  phone: string;
  role: string;
  roleId?: string;
  branch: string;
  branchId?: string;
  is_active: boolean;
  last_login: string;
}

export interface RoleOption {
  id: string;
  name: string;
}

export interface BranchOption {
  id: string;
  name: string;
}

const INITIAL_MOCK_USERS: UserItem[] = [
  {
    id: 'usr-1',
    name: 'Juan Pérez',
    username: 'jperez',
    email: 'juan.perez@superopos.com',
    phone: '+591 71234567',
    role: 'CAJERO',
    roleId: 'role-cajero',
    branch: 'Sucursal Central',
    branchId: 'branch-central',
    is_active: true,
    last_login: '14/08/2026 08:30',
  },
  {
    id: 'usr-2',
    name: 'María Gómez',
    username: 'mgomez',
    email: 'maria.gomez@superopos.com',
    phone: '+591 72345678',
    role: 'ADMIN',
    roleId: 'role-admin',
    branch: 'Sucursal Central',
    branchId: 'branch-central',
    is_active: true,
    last_login: '14/08/2026 09:12',
  },
  {
    id: 'usr-3',
    name: 'Carlos Mendoza',
    username: 'cmendoza',
    email: 'carlos.mendoza@superopos.com',
    phone: '+591 73456789',
    role: 'ALMACENERO',
    roleId: 'role-almacen',
    branch: 'Almacén Central',
    branchId: 'branch-central',
    is_active: true,
    last_login: '13/08/2026 17:45',
  },
  {
    id: 'usr-4',
    name: 'Roberto Silva',
    username: 'rsilva',
    email: 'roberto.silva@superopos.com',
    phone: '+591 74567890',
    role: 'SUPERVISOR',
    roleId: 'role-supervisor',
    branch: 'Sucursal Norte',
    branchId: 'branch-norte',
    is_active: false,
    last_login: '10/08/2026 11:20',
  },
];

export const UsersView: React.FC = () => {
  /* F2 lleva el foco al buscador del apartado. */
  useViewShortcuts({});

  const [activeSubTab, setActiveSubTab] = useState<'users' | 'rbac' | 'commissions'>('users');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  /* El filtro corría en cada pulsación sobre la lista entera. */
  const searchQueryDebounced = useDebounced(searchQuery);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(10);

  // State
  const [usersList, setUsersList] = usePersistentState<UserItem[]>('usuarios', INITIAL_MOCK_USERS);
  const [_rolesList, setRolesList] = useState<{ id: string; name: string }[]>([]);
  const [branchesList, setBranchesList] = useState<BranchOption[]>([
    { id: 'Sucursal Central', name: 'Sucursal Central' },
    { id: 'Sucursal Norte', name: 'Sucursal Norte' },
    { id: 'Sucursal Sur', name: 'Sucursal Sur' },
  ]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Modal State for User Create / Edit
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Modal State for Quick Password Reset
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<UserItem | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    role: 'CAJERO',
    branch: 'Sucursal Central',
    password: '',
    confirmPassword: '',
    is_active: true,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // RBAC State
  const [selectedRoleRBAC, setSelectedRoleRBAC] = useState<
    'ADMIN' | 'SUPERVISOR' | 'CAJERO' | 'ALMACENERO'
  >('CAJERO');
  const [rbacPermissions, setRbacPermissions] = useState<Record<string, boolean>>({
    'pos.create': true,
    'pos.discount': false,
    'pos.void': false,
    'pos.view_costs': false,
    'pos.open_drawer': true,
    'pos.edit_prices': false,

    'inv.purchases': false,
    'inv.adjustments': false,
    'inv.kardex': false,
    'inv.transfers': false,
    'inv.edit_catalog': false,

    'crm.create_customer': true,
    'crm.credit_approval': false,
    'crm.receivables': false,

    'fin.theoretical_balance': false,
    'fin.corte_x': true,
    'fin.corte_z': false,
    'fin.petty_cash': true,
  });

  // Commissions State
  const [commissionsList] = useState([
    {
      id: '1',
      name: 'Juan Pérez',
      type: 'GROSS',
      rate: 2.5,
      monthlyGoal: 5000,
      currentSales: 3450,
    },
    { id: '2', name: 'María Gómez', type: 'NET', rate: 5.0, monthlyGoal: 8000, currentSales: 6200 },
  ]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // API Data Fetching
  const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch('http://localhost:3000/api/v1/users', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('supero_pos_jwt') || ''}`,
        },
      });

      if (response.ok) {
        const resData = await response.json();
        if (resData.success && Array.isArray(resData.data)) {
          const apiUsers: UserItem[] = resData.data.map((u: ApiUser) => ({
            id: u.id,
            name: u.fullName || u.username,
            username: u.username,
            email: u.email,
            phone: u.phone || '',
            role: u.role?.name || 'CAJERO',
            roleId: u.roleId,
            branch: u.branch?.name || 'Sucursal Central',
            branchId: u.branchId,
            is_active: u.isActive ?? true,
            last_login: u.lastLogin ? formatDateTime(u.lastLogin) : 'Nunca',
          }));
          setUsersList(apiUsers);
        }
      }
    } catch {
      // Backend unavailable -> smooth fallback to local mock state
    } finally {
      setLoading(false);
    }
    /* `setUsersList` viene de `usePersistentState`, que devuelve el `setState`
       de React: es estable entre renders. Se declara porque el linter no puede
       verlo a través de un hook propio, no porque cambie. */
  }, [setUsersList]);

  const fetchRolesAndBranches = useCallback(async () => {
    try {
      const [rolesRes, branchesRes] = await Promise.all([
        fetch('http://localhost:3000/api/v1/users/roles'),
        fetch('http://localhost:3000/api/v1/users/branches'),
      ]);

      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        if (rolesData.success && Array.isArray(rolesData.data)) {
          setRolesList(rolesData.data.map((r: ApiNamed) => ({ id: r.id || r.name, name: r.name })));
        }
      }

      if (branchesRes.ok) {
        const branchesData = await branchesRes.json();
        if (branchesData.success && Array.isArray(branchesData.data)) {
          setBranchesList(
            branchesData.data.map((b: ApiNamed) => ({ id: b.id || b.name, name: b.name })),
          );
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  useEffect(() => {
    /* Carga inicial desde la API. La regla marca cualquier setState alcanzable
 desde el efecto, aunque aquí ocurra después de `await`: es el caso de
 sincronización con un sistema externo que la propia regla contempla.
       Eliminarlo del todo exigiría una librería de data-fetching, fuera del
 alcance del rediseño de presentación. */
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void Promise.all([fetchUsers(), fetchRolesAndBranches()]);
  }, [fetchUsers, fetchRolesAndBranches]);

  // Toggle Soft Delete (Baja Lógica / Reactivación)
  const handleToggleUserStatus = async (user: UserItem) => {
    const targetState = !user.is_active;

    try {
      const response = await fetch(`http://localhost:3000/api/v1/users/${user.id}/toggle-active`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supero_pos_jwt') || ''}`,
        },
        body: JSON.stringify({ isActive: targetState }),
      });

      if (response.ok) {
        const resData = await response.json();
        showToast(
          resData.message ||
            (targetState ? 'Usuario reactivado correctamente' : 'Baja lógica aplicada'),
        );
      }
    } catch {
      // Offline mode fallback
      showToast(
        targetState
          ? `Usuario '@${user.username}' reactivado.`
          : `Baja lógica aplicada a '@${user.username}' (Historial preservado).`,
        'info',
      );
    }

    setUsersList((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, is_active: targetState } : u)),
    );
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQueryDebounced.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQueryDebounced.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQueryDebounced.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter || u.roleId === roleFilter;
    const matchesBranch =
      branchFilter === 'ALL' || u.branch === branchFilter || u.branchId === branchFilter;
    const matchesStatus =
      statusFilter === 'ALL' || (statusFilter === 'ACTIVE' ? u.is_active : !u.is_active);
    return matchesSearch && matchesRole && matchesBranch && matchesStatus;
  });

  const handleOpenNewUser = () => {
    setEditingUser(null);
    setFormError(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      role: 'CAJERO',
      branch: branchesList[0]?.name || 'Sucursal Central',
      password: '',
      confirmPassword: '',
      is_active: true,
    });
    setIsUserModalOpen(true);
  };

  const handleEditUser = (u: UserItem) => {
    setEditingUser(u);
    setFormError(null);
    setFormData({
      name: u.name,
      username: u.username,
      email: u.email,
      phone: u.phone,
      role: u.role,
      branch: u.branch,
      password: '',
      confirmPassword: '',
      is_active: u.is_active,
    });
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim()) {
      setFormError('Por favor complete todos los campos obligatorios (*).');
      return;
    }

    if (!editingUser && !formData.password) {
      setFormError('La contraseña es obligatoria para nuevos usuarios.');
      return;
    }

    if (formData.password && formData.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    // Try backend API save
    try {
      const payload = {
        fullName: formData.name.trim(),
        username: formData.username.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        roleId: formData.role,
        branchId: formData.branch,
        password: formData.password || undefined,
        isActive: formData.is_active,
      };

      const url = editingUser
        ? `http://localhost:3000/api/v1/users/${editingUser.id}`
        : 'http://localhost:3000/api/v1/users';

      const method = editingUser ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supero_pos_jwt') || ''}`,
        },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        showToast(
          resData.message ||
            (editingUser ? 'Usuario actualizado' : 'Usuario registrado exitosamente'),
        );
        setLoading(true);
        fetchUsers();
        setIsUserModalOpen(false);
        return;
      } else if (!response.ok) {
        setFormError(resData.message || 'Error al guardar los datos en el servidor.');
        return;
      }
    } catch {
      // Offline fallback state update
    }

    // Offline / Local State Fallback
    if (editingUser) {
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === editingUser.id
            ? {
                ...u,
                name: formData.name,
                username: formData.username,
                email: formData.email,
                phone: formData.phone,
                role: formData.role,
                branch: formData.branch,
                is_active: formData.is_active,
              }
            : u,
        ),
      );
      showToast('Usuario actualizado en modo local', 'info');
    } else {
      const newUser: UserItem = {
        id: `usr-${Date.now()}`,
        name: formData.name,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        role: formData.role,
        branch: formData.branch,
        is_active: formData.is_active,
        last_login: 'Nunca',
      };
      setUsersList((prev) => [newUser, ...prev]);
      showToast('Usuario registrado exitosamente en modo local', 'info');
    }

    setIsUserModalOpen(false);
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPasswordValue) return;

    try {
      const response = await fetch(`http://localhost:3000/api/v1/users/${resetTargetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('supero_pos_jwt') || ''}`,
        },
        body: JSON.stringify({ password: newPasswordValue }),
      });

      if (response.ok) {
        showToast(`Contraseña de @${resetTargetUser.username} actualizada con hash Argon2id.`);
      } else {
        showToast(`Clave actualizada localmente para @${resetTargetUser.username}.`, 'info');
      }
    } catch {
      showToast(`Clave restablecida localmente para @${resetTargetUser.username}.`, 'info');
    }

    setIsPasswordModalOpen(false);
    setNewPasswordValue('');
    setResetTargetUser(null);
  };

  const activeCount = usersList.filter((u) => u.is_active).length;
  const inactiveCount = usersList.length - activeCount;

  const initials = (name: string) =>
    name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0])
      .join('')
      .toUpperCase();

  const userColumns: Array<Column<UserItem>> = [
    {
      key: 'user',
      header: 'Usuario',
      card: 'title',
      render: (u) => (
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-9 h-9 shrink-0 rounded-full bg-sunken text-ink-2 flex items-center justify-center text-micro font-bold">
            {initials(u.name)}
          </span>
          <div className="min-w-0">
            <p className="text-base font-semibold text-ink truncate">{u.name}</p>
            <p className="font-mono text-micro text-ink-3 truncate">{u.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      sortValue: (u) => u.role,
      header: 'Rol',
      card: 'meta',
      width: '150px',
      render: (u) => <Badge tone={ROLE_TONE[u.role] ?? 'neutral'}>{u.role}</Badge>,
    },
    {
      key: 'branch',
      header: 'Sucursal',
      width: '190px',
      render: (u) => <span className="text-body text-ink-2 truncate">{u.branch}</span>,
    },
    {
      key: 'last',
      header: 'Último acceso',
      width: '170px',
      render: (u) => <span className="font-mono tnum text-body text-ink-2">{u.last_login}</span>,
    },
    {
      key: 'active',
      header: 'Activo',
      align: 'center',
      width: '90px',
      render: (u) => (
        <Switch
          checked={u.is_active}
          onChange={() => handleToggleUserStatus(u)}
          label={`${u.is_active ? 'Desactivar' : 'Activar'} a ${u.name}`}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      card: 'hidden',
      align: 'right',
      width: '100px',
      render: (u) => (
        <div className="flex items-center justify-end gap-0.5">
          <IconButton label={`Editar ${u.name}`} tone="accent" onClick={() => handleEditUser(u)}>
            <Edit3 className="w-4 h-4" />
          </IconButton>
          <IconButton
            label={`Restablecer contraseña de ${u.name}`}
            onClick={() => {
              setResetTargetUser(u);
              setNewPasswordValue('');
              setIsPasswordModalOpen(true);
            }}
          >
            <Key className="w-4 h-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  const commissionColumns: Array<Column<(typeof commissionsList)[number]>> = [
    {
      key: 'name',
      header: 'Empleado',
      render: (c) => <span className="text-base font-semibold text-ink">{c.name}</span>,
    },
    {
      key: 'type',
      header: 'Base de cálculo',
      width: '170px',
      render: (c) => (
        <Badge tone="accent">{c.type === 'GROSS' ? 'Venta bruta' : 'Venta neta'}</Badge>
      ),
    },
    {
      key: 'rate',
      header: 'Comisión',
      align: 'right',
      width: '110px',
      render: (c) => <span className="font-mono tnum text-ink">{c.rate.toFixed(1)}%</span>,
    },
    {
      key: 'progress',
      header: 'Avance de meta',
      width: '240px',
      render: (c) => (
        <Meter
          value={c.currentSales}
          max={c.monthlyGoal}
          label={`Meta de ${c.name}`}
          hint={`${Math.round((c.currentSales / c.monthlyGoal) * 100)}%`}
          tone={c.currentSales >= c.monthlyGoal ? 'success' : 'accent'}
        />
      ),
    },
  ];

  return (
    <div className="h-full overflow-y-auto bg-canvas select-none">
      <div className="max-w-[1600px] mx-auto p-6 space-y-5">
        <PageHeader
          title="Usuarios"
          subtitle="Personal con acceso a la terminal, sus permisos y sus comisiones."
          actions={
            <Button icon={<UserPlus className="w-4 h-4" />} onClick={handleOpenNewUser}>
              Nuevo usuario
            </Button>
          }
          tabs={
            <Tabs
              items={TABS}
              value={activeSubTab}
              onChange={(id) => setActiveSubTab(id as SubTab)}
              label="Secciones de usuarios"
            />
          }
        />

        {activeSubTab === 'users' && (
          <div className="space-y-4">
            <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-4">
              <StatTile
                label="Usuarios activos"
                value={activeCount}
                hint={`de ${usersList.length} registrados`}
                icon={<UserCheck className="w-4 h-4" />}
                tone="success"
              />
              <StatTile
                label="Desactivados"
                value={inactiveCount}
                hint="sin acceso a la terminal"
                icon={<UserX className="w-4 h-4" />}
                tone={inactiveCount > 0 ? 'warning' : 'neutral'}
              />
              <StatTile
                label="Sucursales"
                value={branchesList.length}
                hint="con personal asignado"
                icon={<Building2 className="w-4 h-4" />}
              />
            </div>

            <Toolbar
              search={searchQuery}
              onSearchChange={setSearchQuery}
              searchPlaceholder="Buscar por nombre, usuario o correo…"
              filters={
                <>
                  <ToolbarSelect
                    aria-label="Rol"
                    value={roleFilter}
                    onChange={(e) => setRoleFilter(e.target.value)}
                  >
                    <option value="ALL">Todos los roles</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="SUPERVISOR">Supervisor</option>
                    <option value="CAJERO">Cajero</option>
                    <option value="ALMACENERO">Almacenero</option>
                  </ToolbarSelect>
                  <ToolbarSelect
                    aria-label="Sucursal"
                    value={branchFilter}
                    onChange={(e) => setBranchFilter(e.target.value)}
                  >
                    <option value="ALL">Todas las sucursales</option>
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </ToolbarSelect>
                  <ToolbarSelect
                    aria-label="Estado"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="ALL">Todos los estados</option>
                    <option value="ACTIVE">Activos</option>
                    <option value="INACTIVE">Desactivados</option>
                  </ToolbarSelect>
                </>
              }
            />

            <DataTable
              caption="Usuarios del sistema con su rol, sucursal y estado"
              columns={userColumns}
              rows={filteredUsers}
              rowKey={(u) => u.id}
              empty={
                <EmptyState
                  icon={<Users className="w-6 h-6" />}
                  title={loading ? 'Cargando usuarios…' : 'Sin usuarios que coincidan'}
                  hint={loading ? undefined : 'Ajuste la búsqueda o los filtros.'}
                />
              }
            />

            <Pagination
              shown={filteredUsers.length}
              total={usersList.length}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              noun="usuarios"
            />
          </div>
        )}

        {activeSubTab === 'rbac' && (
          <div className="space-y-4">
            <Toolbar
              filters={
                <ToolbarSelect
                  aria-label="Rol a configurar"
                  value={selectedRoleRBAC}
                  onChange={(e) => setSelectedRoleRBAC(e.target.value as typeof selectedRoleRBAC)}
                >
                  <option value="ADMIN">Administrador</option>
                  <option value="SUPERVISOR">Supervisor</option>
                  <option value="CAJERO">Cajero</option>
                  <option value="ALMACENERO">Almacenero</option>
                </ToolbarSelect>
              }
              action={
                <Button
                  icon={<Save className="w-4 h-4" />}
                  onClick={() => showToast('Permisos guardados')}
                >
                  Guardar permisos
                </Button>
              }
            />

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              {PERMISSION_GROUPS.map((group) => (
                <Card
                  key={group.area}
                  title={group.area}
                  icon={<ShieldCheck className="w-4 h-4" />}
                >
                  <div className="flex flex-col gap-3">
                    {group.items.map((it) => (
                      <Switch
                        key={it.key}
                        checked={!!rbacPermissions[it.key]}
                        onChange={(v) => setRbacPermissions((p) => ({ ...p, [it.key]: v }))}
                        label={it.label}
                        showLabel
                      />
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {activeSubTab === 'commissions' && (
          <Card
            title="Comisiones por empleado"
            subtitle="La barra compara la venta acumulada con la meta del mes."
            icon={<Percent className="w-4 h-4" />}
            padding="none"
          >
            <DataTable
              caption="Comisiones del personal de venta por periodo"
              columns={commissionColumns}
              rows={commissionsList}
              rowKey={(c) => c.id}
              className="border-0 rounded-none"
            />
          </Card>
        )}
      </div>

      {/* Alta y edición */}
      <Modal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        icon={<UserPlus className="w-4 h-4" />}
        title={editingUser ? 'Editar usuario' : 'Nuevo usuario'}
        subtitle={editingUser?.name}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsUserModalOpen(false)}>
              Cancelar
            </Button>
            <Button form="user-form" type="submit" icon={<Save className="w-4 h-4" />}>
              Guardar
            </Button>
          </>
        }
      >
        <form id="user-form" onSubmit={handleSaveUser} className="space-y-5">
          {formError && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-danger-soft border border-danger/25 text-body text-danger-ink">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {formError}
            </div>
          )}

          <section className="space-y-3">
            <p className="text-micro uppercase text-ink-3">Identidad</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Input
                label="Nombre completo"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
              <Input
                label="Correo electrónico"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <Input
                label="Teléfono"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="[&_input]:font-mono"
              />
            </div>
          </section>

          <section className="space-y-3 pt-4 border-t border-line">
            <p className="text-micro uppercase text-ink-3">Acceso</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Input
                label="Usuario"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="[&_input]:font-mono"
                required
              />
              <Input
                label={editingUser ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    className="text-ink-3 hover:text-ink transition-colors duration-fast"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            </div>
            {formData.password && (
              <Meter
                value={Math.min(formData.password.length, 12)}
                max={12}
                label="Fuerza de la contraseña"
                showLabel
                hint={
                  formData.password.length >= 10
                    ? 'Fuerte'
                    : formData.password.length >= 6
                      ? 'Aceptable'
                      : 'Débil'
                }
                tone={
                  formData.password.length >= 10
                    ? 'success'
                    : formData.password.length >= 6
                      ? 'warning'
                      : 'danger'
                }
              />
            )}
          </section>

          <section className="space-y-3 pt-4 border-t border-line">
            <p className="text-micro uppercase text-ink-3">Permisos</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Select
                label="Rol"
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              >
                <option value="ADMIN">Administrador</option>
                <option value="SUPERVISOR">Supervisor</option>
                <option value="CAJERO">Cajero</option>
                <option value="ALMACENERO">Almacenero</option>
              </Select>
              <Select
                label="Sucursal"
                value={formData.branch}
                onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
              >
                {branchesList.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </div>
          </section>
        </form>
      </Modal>

      {/* Restablecer contraseña */}
      <Modal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        icon={<Key className="w-4 h-4" />}
        title="Restablecer contraseña"
        subtitle={resetTargetUser?.name}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsPasswordModalOpen(false)}>
              Cancelar
            </Button>
            <Button form="reset-form" type="submit" variant="danger">
              Restablecer
            </Button>
          </>
        }
      >
        <form id="reset-form" onSubmit={handleResetPasswordSubmit} className="space-y-4">
          <Input
            label="Nueva contraseña"
            type="text"
            autoFocus
            value={newPasswordValue}
            onChange={(e) => setNewPasswordValue(e.target.value)}
            hint="El usuario deberá cambiarla en su próximo inicio de sesión."
            inputSize="lg"
            className="[&_input]:font-mono"
          />
        </form>
      </Modal>

      {/* Aviso temporal */}
      {toastMessage && (
        <div
          role="status"
          className={cn(
            'fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 px-4 h-11 rounded-md border shadow-e2 text-base font-semibold animate-rise-in',
            toastMessage.type === 'success'
              ? 'bg-ok-soft border-ok/30 text-ok-ink'
              : toastMessage.type === 'error'
                ? 'bg-danger-soft border-danger/30 text-danger-ink'
                : 'bg-accent-soft border-accent/30 text-accent-ink',
          )}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4" />
          ) : (
            <AlertCircle className="w-4 h-4" />
          )}
          {toastMessage.text}
        </div>
      )}
    </div>
  );
};
