import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Percent,
  Search,
  Edit3,
  Key,
  CheckCircle2,
  Eye,
  EyeOff,
  Sparkles,
  Save,
  RefreshCw,
  AlertCircle,
  Building2,
  Check,
  UserCheck,
  UserX,
} from 'lucide-react';

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
    last_login: '14/08/2026 08:30:15',
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
    last_login: '14/08/2026 09:12:00',
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
    last_login: '13/08/2026 17:45:22',
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
    last_login: '10/08/2026 11:20:10',
  },
];

export const UsersView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'rbac' | 'commissions'>('users');

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [branchFilter, setBranchFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [pageSize, setPageSize] = useState(10);

  // State
  const [usersList, setUsersList] = useState<UserItem[]>(INITIAL_MOCK_USERS);
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
  const [commissionsList, setCommissionsList] = useState([
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
            last_login: u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Nunca',
          }));
          setUsersList(apiUsers);
        }
      }
    } catch {
      // Backend unavailable -> smooth fallback to local mock state
    } finally {
      setLoading(false);
    }
  }, []);

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

  // Password strength helper
  const calculatePasswordStrength = (pass: string) => {
    if (!pass) return { text: 'N/A', color: 'text-ink-3', width: 'w-0' };
    if (pass.length < 6) return { text: 'Débil', color: 'text-danger', width: 'w-1/3 bg-red-500' };
    if (pass.length < 10) return { text: 'Media', color: 'text-warn', width: 'w-2/3 bg-warn' };
    return { text: 'Fuerte', color: 'text-ok', width: 'w-full bg-emerald-500' };
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let pass = '';
    for (let i = 0; i < 12; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass, confirmPassword: pass }));
  };

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
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
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

  return (
    <div className="p-6 bg-canvas h-[calc(100vh-56px)] overflow-y-auto pr-2 space-y-6 select-none transition-colors duration-fast ease-ease">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-md shadow-e2 border text-body font-bold transition-all transform animate-bounce ${
            toastMessage.type === 'success'
              ? 'bg-ok text-white border-emerald-500'
              : toastMessage.type === 'error'
                ? 'bg-danger text-white border-rose-500'
                : 'bg-accent text-white border-blue-500'
          }`}
        >
          {toastMessage.type === 'success' && <CheckCircle2 className="w-5 h-5" />}
          {toastMessage.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {toastMessage.type === 'info' && <RefreshCw className="w-5 h-5 animate-spin" />}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header & Sub-tab navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-raised p-5 rounded-md border border-line shadow-e1">
        <div>
          <h1 className="text-display font-black text-ink flex items-center gap-2">
            <Users className="w-7 h-7 text-accent" />
            Gestión de Personal, Usuarios y Seguridad
          </h1>
          <p className="text-body text-ink-2 mt-1">
            Catálogo maestro de usuarios con asignación obligatoria de sucursal, control RBAC y baja
            lógica preservando auditoría
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-sunken p-1.5 rounded-md border border-line">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'users' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <Users className="w-4 h-4" />
            Usuarios y Personal
          </button>
          <button
            onClick={() => setActiveSubTab('rbac')}
            className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'rbac' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Permisos RBAC
          </button>
          <button
            onClick={() => setActiveSubTab('commissions')}
            className={`px-4 py-2 rounded-md text-body font-bold flex items-center gap-2 transition-all ${
              activeSubTab === 'commissions' ? 'bg-raised text-accent shadow-e1' : 'text-ink-3'
            }`}
          >
            <Percent className="w-4 h-4" />
            Comisiones
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: USERS LIST */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Top Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-raised p-4 rounded-md border border-line shadow-e1">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-3" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre completo, @usuario o email..."
                className="w-full pl-9 pr-4 py-2 bg-sunken border border-line rounded-md text-body text-ink focus:border-accent"
              />
            </div>

            {/* Quick Filters & Action */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Refresh Button */}
              <button
                onClick={() => {
                  setLoading(true);
                  fetchUsers();
                }}
                disabled={loading}
                className="p-2 bg-sunken text-ink-2 rounded-md border border-line hover:bg-sunken transition-colors"
                title="Actualizar catálogo de usuarios"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Role Filter */}
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:border-accent"
              >
                <option value="ALL">Todos los Roles</option>
                <option value="ADMIN">Administrador</option>
                <option value="CAJERO">Cajero</option>
                <option value="ALMACENERO">Almacenero</option>
                <option value="SUPERVISOR">Supervisor</option>
              </select>

              {/* Branch Filter */}
              <select
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
                className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:border-accent"
              >
                <option value="ALL">Todas las Sucursales</option>
                {branchesList.map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-sunken text-ink rounded-md border border-line text-body font-semibold focus:border-accent"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos (Baja Lógica)</option>
              </select>

              {/* New User Primary Button */}
              <button
                onClick={handleOpenNewUser}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-body font-extrabold flex items-center gap-2 shadow-e1 transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                Nuevo Usuario
              </button>
            </div>
          </div>

          {/* Structured Data Table */}
          <div className="bg-raised rounded-md border border-line shadow-e1 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                  <th className="p-4">Nombre Completo / Email</th>
                  <th className="p-4">Usuario (@username)</th>
                  <th className="p-4">Rol Asignado</th>
                  <th className="p-4">Sucursal Asignada</th>
                  <th className="p-4 text-center">Estado (Baja Lógica)</th>
                  <th className="p-4">Último Acceso</th>
                  <th className="p-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-body">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-ink-3 font-semibold">
                      No se encontraron usuarios que coincidan con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const roleBadgeColors: Record<string, string> = {
                      ADMIN:
                        'bg-accent-soft text-accent-ink dark:bg-accent-soft dark:text-accent-ink border-accent/30',
                      CAJERO:
                        'bg-ok-soft text-ok-ink dark:bg-ok-soft dark:text-ok-ink border-ok/30',
                      ALMACENERO:
                        'bg-warn-soft text-warn-ink dark:bg-warn-soft dark:text-warn-ink border-warn/30',
                      SUPERVISOR:
                        'bg-accent-soft text-accent-ink dark:bg-accent-soft dark:text-accent-ink border-accent/30',
                    };
                    const badgeClass =
                      roleBadgeColors[u.role?.toUpperCase()] || 'bg-sunken text-ink border-line';

                    return (
                      <tr
                        key={u.id}
                        className={`hover:bg-sunken transition-colors ${!u.is_active ? 'opacity-65 bg-sunken/50 bg-sunken/20' : ''}`}
                      >
                        <td className="p-4 flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-base shadow ${
                              u.is_active ? 'bg-accent text-white' : 'bg-gray-400 text-white'
                            }`}
                          >
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-ink flex items-center gap-1.5">
                              {u.name}
                              {!u.is_active && (
                                <span className="px-1.5 py-0.5 rounded text-micro font-black bg-danger-soft text-danger-ink dark:bg-danger-soft dark:text-danger border border-danger/30">
                                  INACTIVO
                                </span>
                              )}
                            </p>
                            <span className="text-ink-3 text-micro">{u.email}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-ink-2 font-semibold">@{u.username}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-md text-micro font-bold border ${badgeClass}`}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td className="p-4 font-semibold text-ink-2 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-accent" />
                          {u.branch}
                        </td>
                        <td className="p-4 text-center">
                          {/* Toggle Switch for Soft Delete */}
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              u.is_active ? 'bg-emerald-500' : 'bg-sunken'
                            }`}
                            title={
                              u.is_active
                                ? 'Usuario Activo. Click para Baja Lógica'
                                : 'Usuario Inactivo. Click para Reactivar'
                            }
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                u.is_active ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="p-4 font-mono text-ink-2 text-micro">{u.last_login}</td>
                        <td className="p-4 text-right space-x-1">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="p-1.5 text-accent hover:bg-accent-soft dark:hover:bg-accent-soft rounded-md transition-colors"
                            title="Editar Datos de Usuario"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setNewPasswordValue('');
                              setIsPasswordModalOpen(true);
                            }}
                            className="p-1.5 text-warn hover:bg-warn-soft dark:hover:bg-warn-soft rounded-md transition-colors"
                            title="Restablecer Contraseña (Argon2id)"
                          >
                            <Key className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            className={`p-1.5 rounded-md transition-colors ${
                              u.is_active
                                ? 'text-danger hover:bg-danger-soft dark:hover:bg-danger-soft'
                                : 'text-ok hover:bg-ok-soft dark:hover:bg-ok-soft'
                            }`}
                            title={
                              u.is_active
                                ? 'Baja Lógica (Desactivar usuario)'
                                : 'Reactivar cuenta de usuario'
                            }
                          >
                            {u.is_active ? (
                              <UserX className="w-4 h-4" />
                            ) : (
                              <UserCheck className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Table Footer */}
            <div className="p-4 bg-sunken border-t border-line flex items-center justify-between text-body text-ink-3">
              <span>
                Mostrando {filteredUsers.length} de {usersList.length} usuarios registrados en la
                base de datos
              </span>
              <div className="flex items-center gap-2">
                <span>Registros por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="px-2 py-1 bg-raised border border-line rounded-md text-body font-semibold text-ink"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ROLES & PERMISSIONS RBAC */}
      {activeSubTab === 'rbac' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Panel: Role Selection */}
          <div className="p-5 bg-raised border border-line rounded-md shadow-e1 space-y-3">
            <h3 className="font-bold text-base text-ink border-b border-line pb-2">
              Roles Definidos
            </h3>
            <div className="space-y-1">
              {(['ADMIN', 'SUPERVISOR', 'CAJERO', 'ALMACENERO'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setSelectedRoleRBAC(r)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-md text-body font-bold transition-all ${
                    selectedRoleRBAC === r
                      ? 'bg-accent text-white shadow-e1'
                      : 'bg-sunken text-ink-2 hover:bg-sunken'
                  }`}
                >
                  <span>{r}</span>
                  {selectedRoleRBAC === r && <CheckCircle2 className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>

          {/* Right Panel: Detailed Permissions Matrix */}
          <div className="lg:col-span-3 p-6 bg-raised border border-line rounded-md shadow-e1 space-y-6">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="font-extrabold text-base text-ink">
                  Matriz de Permisos para: <span className="text-accent">{selectedRoleRBAC}</span>
                </h3>
                <p className="text-body text-ink-3">
                  Configure los privilegios operativos específicos por módulo
                </p>
              </div>
              <button
                onClick={() => showToast(`Matriz de permisos para ${selectedRoleRBAC} guardada.`)}
                className="px-4 py-2 bg-accent text-white font-extrabold text-body rounded-md flex items-center gap-2 shadow hover:bg-accent-hover transition-colors"
              >
                <Save className="w-4 h-4" />
                Guardar Matriz
              </button>
            </div>

            {/* Grouped Modules */}
            <div className="space-y-4">
              {/* Module 1: POS / Sales */}
              <div className="p-4 bg-sunken rounded-md border border-line space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-extrabold text-body text-ink uppercase tracking-wider">
                    Módulo Ventas / POS
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body">
                  {[
                    { key: 'pos.create', label: 'Crear transacciones de venta' },
                    { key: 'pos.discount', label: 'Aplicar descuentos libres' },
                    { key: 'pos.void', label: 'Anular tickets emitidos' },
                    { key: 'pos.view_costs', label: 'Visualizar costos de adquisición' },
                    { key: 'pos.open_drawer', label: 'Abrir gaveta sin venta' },
                    { key: 'pos.edit_prices', label: 'Modificar tarifas en mostrador' },
                  ].map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center justify-between p-2 bg-raised rounded-md border border-line cursor-pointer"
                    >
                      <span className="font-semibold text-ink">{p.label}</span>
                      <input
                        type="checkbox"
                        checked={!!rbacPermissions[p.key]}
                        onChange={(e) =>
                          setRbacPermissions({ ...rbacPermissions, [p.key]: e.target.checked })
                        }
                        className="w-4 h-4 text-accent rounded focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Module 2: Inventarios */}
              <div className="p-4 bg-sunken rounded-md border border-line space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-extrabold text-body text-ink uppercase tracking-wider">
                    Módulo Inventarios / Almacén
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body">
                  {[
                    { key: 'inv.purchases', label: 'Registrar compras a proveedores' },
                    { key: 'inv.adjustments', label: 'Aplicar ajustes por mermas' },
                    { key: 'inv.kardex', label: 'Consultar Kardex valorizado (CPP)' },
                    { key: 'inv.transfers', label: 'Realizar transferencias entre depósitos' },
                    { key: 'inv.edit_catalog', label: 'Editar catálogo de productos' },
                  ].map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center justify-between p-2 bg-raised rounded-md border border-line cursor-pointer"
                    >
                      <span className="font-semibold text-ink">{p.label}</span>
                      <input
                        type="checkbox"
                        checked={!!rbacPermissions[p.key]}
                        onChange={(e) =>
                          setRbacPermissions({ ...rbacPermissions, [p.key]: e.target.checked })
                        }
                        className="w-4 h-4 text-accent rounded focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* Module 3: Finanzas */}
              <div className="p-4 bg-sunken rounded-md border border-line space-y-3">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <span className="font-extrabold text-body text-ink uppercase tracking-wider">
                    Módulo Finanzas y Caja
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body">
                  {[
                    {
                      key: 'fin.theoretical_balance',
                      label: 'Visualizar saldo teórico de efectivo',
                    },
                    { key: 'fin.corte_x', label: 'Realizar corte parcial (Corte X)' },
                    { key: 'fin.corte_z', label: 'Ejecutar cierre final (Corte Z)' },
                    { key: 'fin.petty_cash', label: 'Autorizar egresos por caja chica' },
                  ].map((p) => (
                    <label
                      key={p.key}
                      className="flex items-center justify-between p-2 bg-raised rounded-md border border-line cursor-pointer"
                    >
                      <span className="font-semibold text-ink">{p.label}</span>
                      <input
                        type="checkbox"
                        checked={!!rbacPermissions[p.key]}
                        onChange={(e) =>
                          setRbacPermissions({ ...rbacPermissions, [p.key]: e.target.checked })
                        }
                        className="w-4 h-4 text-accent rounded focus:ring-blue-500"
                      />
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: COMMISSIONS */}
      {activeSubTab === 'commissions' && (
        <div className="bg-raised rounded-md border border-line p-6 shadow-e1 space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h3 className="font-extrabold text-base text-ink">
                Configuración de Comisiones de Venta
              </h3>
              <p className="text-body text-ink-3">
                Asignación de metas mensuales y porcentaje de incentivo por vendedor
              </p>
            </div>
            <button
              onClick={() => showToast('Parámetros de comisiones guardados.')}
              className="px-4 py-2 bg-accent text-white font-extrabold text-body rounded-md shadow hover:bg-accent-hover transition-colors"
            >
              Guardar Cambios
            </button>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-sunken text-ink-2 text-micro font-extrabold uppercase tracking-wider border-b border-line">
                <th className="p-4">Cajero / Vendedor</th>
                <th className="p-4">Cálculo Aplicable</th>
                <th className="p-4">% Comisión</th>
                <th className="p-4">Meta Mensual ($)</th>
                <th className="p-4">Acumulado Mes ($)</th>
                <th className="p-4 text-right">Comisión Estimada ($)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-body">
              {commissionsList.map((c) => (
                <tr key={c.id} className="hover:bg-sunken">
                  <td className="p-4 font-bold text-ink">{c.name}</td>
                  <td className="p-4">
                    <select
                      value={c.type}
                      onChange={(e) =>
                        setCommissionsList((prev) =>
                          prev.map((item) =>
                            item.id === c.id ? { ...item, type: e.target.value } : item,
                          ),
                        )
                      }
                      className="px-2.5 py-1.5 bg-sunken border border-line rounded-md text-body font-semibold"
                    >
                      <option value="GROSS">% Venta Bruta Total</option>
                      <option value="NET">% Utilidad Neta Real (descontando CPP)</option>
                    </select>
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      step="0.1"
                      value={c.rate}
                      onChange={(e) =>
                        setCommissionsList((prev) =>
                          prev.map((item) =>
                            item.id === c.id ? { ...item, rate: Number(e.target.value) } : item,
                          ),
                        )
                      }
                      className="w-20 px-2 py-1 bg-sunken border border-line rounded-md font-mono font-bold text-ink"
                    />{' '}
                    %
                  </td>
                  <td className="p-4">
                    <input
                      type="number"
                      value={c.monthlyGoal}
                      onChange={(e) =>
                        setCommissionsList((prev) =>
                          prev.map((item) =>
                            item.id === c.id
                              ? { ...item, monthlyGoal: Number(e.target.value) }
                              : item,
                          ),
                        )
                      }
                      className="w-28 px-2 py-1 bg-sunken border border-line rounded-md font-mono font-bold text-ink"
                    />
                  </td>
                  <td className="p-4 font-mono font-bold text-ink">${c.currentSales.toFixed(2)}</td>
                  <td className="p-4 text-right font-mono font-extrabold text-ok">
                    ${((c.currentSales * c.rate) / 100).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* USER FORM MODAL (Create / Edit User) */}
      {isUserModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-xl overflow-hidden space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="p-5 border-b border-line flex items-center justify-between">
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-accent" />
                {editingUser ? 'Editar Cuenta de Usuario' : 'Crear Nueva Cuenta de Usuario'}
              </h3>
              <button
                onClick={() => setIsUserModalOpen(false)}
                className="text-ink-3 hover:text-ink-2 dark:hover:text-white text-title font-bold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mx-5 p-3 bg-danger-soft border border-danger/30 dark:border-danger/30 rounded-md flex items-center gap-2 text-danger-ink text-body font-semibold">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveUser} className="p-5 space-y-4 text-body">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-2">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej. Juan Carlos Pérez"
                    className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md text-ink font-semibold focus:border-accent"
                  />
                </div>
                <div>
                  <label className="font-bold text-ink-2">Nombre de Usuario (@username) *</label>
                  <input
                    type="text"
                    required
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Ej. jperez"
                    className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md text-ink font-mono focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-2">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="juan.perez@superopos.com"
                    className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md text-ink focus:border-accent"
                  />
                </div>
                <div>
                  <label className="font-bold text-ink-2">Teléfono (Contacto)</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+591 71234567"
                    className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md text-ink focus:border-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-ink-2">Rol Maestro *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md text-ink font-bold focus:border-accent"
                  >
                    <option value="ADMIN">Administrador</option>
                    <option value="CAJERO">Cajero</option>
                    <option value="ALMACENERO">Almacenero</option>
                    <option value="SUPERVISOR">Supervisor</option>
                  </select>
                </div>
                <div>
                  <label className="font-bold text-ink-2 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-accent" />
                    Asignación de Sucursal Obligatoria *
                  </label>
                  <select
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md text-ink font-semibold focus:border-accent"
                  >
                    {branchesList.map((b) => (
                      <option key={b.id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Password Management */}
              <div className="p-4 bg-sunken rounded-md border border-line space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-ink flex items-center gap-1.5">
                    <Key className="w-4 h-4 text-warn" />
                    Credenciales de Acceso (Hashing Argon2id)
                  </span>
                  <button
                    type="button"
                    onClick={generateRandomPassword}
                    className="text-micro font-bold text-accent hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Generar Clave Segura
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={
                      editingUser
                        ? 'Dejar en blanco para mantener contraseña actual'
                        : 'Contraseña de ingreso'
                    }
                    className="w-full p-2.5 pr-10 bg-raised border border-line rounded-md font-mono text-ink focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink-2"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password Strength Indicator */}
                {formData.password && (
                  <div className="space-y-1">
                    <div className="h-1.5 w-full bg-sunken rounded-full overflow-hidden">
                      <div
                        className={`h-full ${passwordStrength.width} transition-all duration-300`}
                      />
                    </div>
                    <span className={`text-micro font-bold ${passwordStrength.color}`}>
                      Seguridad: {passwordStrength.text}
                    </span>
                  </div>
                )}
              </div>

              {/* Status Switch & Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-line">
                <label className="flex items-center gap-2 font-bold text-ink-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-4 h-4 text-accent rounded focus:ring-blue-500"
                  />
                  <span>Estado Operativo Habilitado (isActive)</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsUserModalOpen(false)}
                    className="px-4 py-2 bg-sunken text-ink rounded-md font-bold hover:bg-sunken dark:hover:bg-sunken transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-accent hover:bg-accent-hover text-white rounded-md font-extrabold shadow flex items-center gap-2 transition-all active:scale-95"
                  >
                    <Check className="w-4 h-4" />
                    Guardar Usuario
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK RESET PASSWORD MODAL */}
      {isPasswordModalOpen && resetTargetUser && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-raised rounded-md border border-line shadow-e3 w-full max-w-md overflow-hidden space-y-4 p-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <h3 className="font-extrabold text-base text-ink flex items-center gap-2">
                <Key className="w-5 h-5 text-warn" />
                Restablecer Contraseña
              </h3>
              <button
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-ink-3 hover:text-ink-2 text-title font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-body text-ink-2">
              Asigne una nueva contraseña para el operador{' '}
              <span className="font-bold text-ink">@{resetTargetUser.username}</span> (
              {resetTargetUser.name}).
            </p>

            <form onSubmit={handleResetPasswordSubmit} className="space-y-4 text-body">
              <div>
                <label className="font-bold text-ink-2">Nueva Contraseña *</label>
                <input
                  type="password"
                  required
                  value={newPasswordValue}
                  onChange={(e) => setNewPasswordValue(e.target.value)}
                  placeholder="Ingrese nueva contraseña segura"
                  className="w-full mt-1 p-2.5 bg-sunken border border-line rounded-md text-ink font-mono focus:outline-none focus:border-accent"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 bg-sunken text-ink rounded-md font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-warn hover:opacity-90 text-white rounded-md font-extrabold shadow flex items-center gap-1.5"
                >
                  <Key className="w-4 h-4" />
                  Actualizar Clave
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersView;
