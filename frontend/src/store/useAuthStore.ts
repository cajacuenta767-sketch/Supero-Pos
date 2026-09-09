import { create } from 'zustand';

export type UserRole = 'ADMIN' | 'CAJERO' | 'ALMACENERO' | string;

export interface UserProfile {
  id: string | number;
  username: string;
  role: UserRole;
  name: string;
  branchId?: string;
  branchName?: string;
}

export interface BranchOption {
  id: string;
  name: string;
  address: string;
}

export const DEMO_BRANCHES: BranchOption[] = [
  { id: 'branch-1', name: 'Sucursal Central - Av. Principal #123', address: 'Av. Principal #123' },
  { id: 'branch-2', name: 'Sucursal Norte - Mall Plaza Local 45', address: 'Mall Plaza Local 45' },
  { id: 'branch-3', name: 'Sucursal Sur - Av. Comercial #789', address: 'Av. Comercial #789' },
];

interface AuthState {
  token: string | null;
  user: UserProfile | null;
  isAuthenticated: boolean;
  failedAttempts: number;
  isLocked: boolean;
  lockoutUntil: number | null;
  selectedBranchId: string;

  login: (
    username: string,
    password: string,
    branchId?: string,
  ) => Promise<{
    success: boolean;
    error?: string;
    isLocked?: boolean;
    remainingAttempts?: number;
  }>;
  logout: () => void;
  setSelectedBranchId: (branchId: string) => void;
  recordFailedAttempt: () => { attempts: number; locked: boolean };
  resetLockout: () => void;
  checkLockStatus: () => boolean;
}

// Initial hydration from localStorage
const storedToken = localStorage.getItem('supero_pos_jwt');
const storedUser = localStorage.getItem('supero_pos_user');
const storedAttempts = parseInt(localStorage.getItem('supero_pos_failed_attempts') || '0', 10);
const storedIsLocked = localStorage.getItem('supero_pos_is_locked') === 'true';
const storedLockUntil = localStorage.getItem('supero_pos_lock_until')
  ? parseInt(localStorage.getItem('supero_pos_lock_until')!, 10)
  : null;
const storedBranch = localStorage.getItem('supero_pos_branch_id') || 'branch-1';

// Initial default user if token exists or fallback mock
const initialUser: UserProfile | null = storedUser
  ? JSON.parse(storedUser)
  : storedToken
    ? {
        id: 'usr-1',
        username: 'admin',
        role: 'ADMIN',
        name: 'Administrador Demo',
        branchId: storedBranch,
      }
    : null;

export const useAuthStore = create<AuthState>((set, get) => ({
  token: storedToken,
  user: initialUser,
  isAuthenticated: !!storedToken,
  failedAttempts: storedAttempts,
  isLocked: storedIsLocked && (storedLockUntil ? Date.now() < storedLockUntil : true),
  lockoutUntil: storedLockUntil,
  selectedBranchId: storedBranch,

  checkLockStatus: () => {
    const { lockoutUntil, isLocked } = get();
    if (isLocked && lockoutUntil && Date.now() >= lockoutUntil) {
      // Lock period expired
      localStorage.removeItem('supero_pos_is_locked');
      localStorage.removeItem('supero_pos_lock_until');
      localStorage.setItem('supero_pos_failed_attempts', '0');
      set({ isLocked: false, lockoutUntil: null, failedAttempts: 0 });
      return false;
    }
    return get().isLocked;
  },

  setSelectedBranchId: (branchId: string) => {
    localStorage.setItem('supero_pos_branch_id', branchId);
    set({ selectedBranchId: branchId });
  },

  recordFailedAttempt: () => {
    const currentAttempts = get().failedAttempts + 1;
    const isNowLocked = currentAttempts >= 5;
    const lockUntil = isNowLocked ? Date.now() + 15 * 60 * 1000 : null; // 15 minutos

    localStorage.setItem('supero_pos_failed_attempts', currentAttempts.toString());
    if (isNowLocked) {
      localStorage.setItem('supero_pos_is_locked', 'true');
      if (lockUntil) localStorage.setItem('supero_pos_lock_until', lockUntil.toString());
    }

    set({
      failedAttempts: currentAttempts,
      isLocked: isNowLocked,
      lockoutUntil: lockUntil,
    });

    return { attempts: currentAttempts, locked: isNowLocked };
  },

  resetLockout: () => {
    localStorage.removeItem('supero_pos_failed_attempts');
    localStorage.removeItem('supero_pos_is_locked');
    localStorage.removeItem('supero_pos_lock_until');
    set({ failedAttempts: 0, isLocked: false, lockoutUntil: null });
  },

  login: async (username: string, password: string, branchId?: string) => {
    // 1. Check lockout status first
    if (get().checkLockStatus()) {
      return {
        success: false,
        error: 'Cuenta bloqueada temporalmente por superar el límite de 5 intentos fallidos.',
        isLocked: true,
        remainingAttempts: 0,
      };
    }

    const activeBranchId = branchId || get().selectedBranchId;
    const activeBranchObj = DEMO_BRANCHES.find((b) => b.id === activeBranchId) || DEMO_BRANCHES[0];

    // 2. Try Backend authentication endpoint
    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, branchId: activeBranchId }),
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        const token = resData.data.access_token;
        const userProfile: UserProfile = {
          id: resData.data.user.id,
          username: resData.data.user.username,
          role: resData.data.user.role,
          name: resData.data.user.name || resData.data.user.username,
          branchId: resData.data.user.branchId || activeBranchId,
          branchName: resData.data.user.branchName || activeBranchObj.name,
        };

        localStorage.setItem('supero_pos_jwt', token);
        localStorage.setItem('supero_pos_user', JSON.stringify(userProfile));
        get().resetLockout();

        set({
          token,
          user: userProfile,
          isAuthenticated: true,
          selectedBranchId: activeBranchId,
        });

        return { success: true };
      } else if (response.status === 401 || response.status === 403) {
        const { attempts, locked } = get().recordFailedAttempt();
        const serverMsg =
          resData.message ||
          (locked
            ? 'Cuenta bloqueada tras 5 intentos fallidos.'
            : `Credenciales incorrectas. Intento ${attempts} de 5.`);
        return {
          success: false,
          error: serverMsg,
          isLocked: locked,
          remainingAttempts: Math.max(0, 5 - attempts),
        };
      }
    } catch {
      // Backend unreachable -> Local offline fallback mode for POS terminal resilience
    }

    // 3. Local Demo/Offline Authentication Fallback
    const cleanUser = username.trim().toLowerCase();
    const isDemoAdmin =
      (cleanUser === 'admin' || cleanUser === 'administrador') && password === 'SuperoPOS2026';
    const isDemoSupervisor = cleanUser === 'supervisor' && password === 'supervisor123';
    const isDemoCajero =
      (cleanUser === 'cajero' || cleanUser === 'cajero_demo') && password === 'cajero123';
    const isDemoAlmacen = cleanUser === 'almacenero' && password === 'almacen123';

    if (isDemoAdmin || isDemoSupervisor || isDemoCajero || isDemoAlmacen) {
      let role: UserRole = 'ADMIN';
      let name = 'Administrador General';
      let id = 'usr-admin';

      if (isDemoSupervisor) {
        role = 'SUPERVISOR';
        name = 'María López (Supervisor)';
        id = 'usr-supervisor';
      } else if (isDemoCajero) {
        role = 'CAJERO';
        name = 'Juan Pérez (Cajero)';
        id = 'usr-cajero';
      } else if (isDemoAlmacen) {
        role = 'ALMACENERO';
        name = 'Carlos Ruiz (Almacén)';
        id = 'usr-almacen';
      }

      const mockToken = `mock-jwt-token-${role.toLowerCase()}-${Date.now()}`;
      const userProfile: UserProfile = {
        id,
        username,
        role,
        name,
        branchId: activeBranchId,
        branchName: activeBranchObj.name,
      };

      localStorage.setItem('supero_pos_jwt', mockToken);
      localStorage.setItem('supero_pos_user', JSON.stringify(userProfile));
      get().resetLockout();

      set({
        token: mockToken,
        user: userProfile,
        isAuthenticated: true,
        selectedBranchId: activeBranchId,
      });

      return { success: true };
    }

    // Invalid credentials offline fallback
    const { attempts, locked } = get().recordFailedAttempt();
    const remaining = Math.max(0, 5 - attempts);
    const errorMsg = locked
      ? 'Cuenta bloqueada tras 5 intentos fallidos. Intente más tarde.'
      : `Credenciales incorrectas. Intento ${attempts} de 5. Quedan ${remaining} intento(s).`;

    return {
      success: false,
      error: errorMsg,
      isLocked: locked,
      remainingAttempts: remaining,
    };
  },

  logout: () => {
    // 1. Wipe local storage session keys
    localStorage.removeItem('supero_pos_jwt');
    localStorage.removeItem('supero_pos_user');
    localStorage.removeItem('supero_pos_branch_id');
    localStorage.removeItem('supero_pos_failed_attempts');
    localStorage.removeItem('supero_pos_is_locked');
    localStorage.removeItem('supero_pos_lock_until');

    // 2. Reset Zustand Stores (POS cart/state & UI modals/toasts)
    try {
      // Dynamic import to avoid circular dependency
      import('./usePosStore').then(({ usePosStore }) => usePosStore.getState().resetPosCycle());
      import('./useUiStore').then(({ useUiStore }) => useUiStore.getState().resetUiState());
    } catch {
      // Fallback safe reset
    }

    // 3. Clear Auth State & immediately force redirect to LoginView
    set({
      token: null,
      user: null,
      isAuthenticated: false,
      failedAttempts: 0,
      isLocked: false,
      lockoutUntil: null,
    });
  },
}));
