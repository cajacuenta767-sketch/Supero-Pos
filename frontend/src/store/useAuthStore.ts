import { create } from 'zustand';
import { API_BASE_URL, IS_DEMO_MODE } from '../config/env';
import { findDemoAccount } from '../config/demoUsers';

/* Sin el `| string` que llevaba antes: con él la unión no servía de nada y un
   rol mal escrito pasaba la comprobación de tipos sin más. */
export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'CAJERO' | 'ALMACENERO';

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
  /**
   * Contador local de intentos fallidos.
   *
   * Vive en localStorage, así que se borra desde la consola del navegador en
   * dos segundos: no es una barrera de seguridad y no debe confundirse con una.
   * Quien impide la fuerza bruta es el servidor, que ahora bloquea por usuario
   * y limita las peticiones por IP. Esto solo evita que un error de tecleo
   * repetido pase desapercibido y da la cuenta atrás en pantalla.
   */
  recordFailedAttempt: () => { attempts: number; locked: boolean };
  resetLockout: () => void;
  checkLockStatus: () => boolean;
}

/** Lee un valor de localStorage sin dejar que un dato corrupto tumbe la app.
 *
 *  `JSON.parse(storedUser)` se ejecutaba en el ámbito del módulo y sin
 *  try/catch: un valor malformado lanzaba durante la carga del módulo y la
 *  terminal no arrancaba, sin forma de recuperarse desde la interfaz. */
const readJson = <T>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    localStorage.removeItem(key);
    return null;
  }
};

// Initial hydration from localStorage
const storedToken = localStorage.getItem('supero_pos_jwt');
const storedAttempts = parseInt(localStorage.getItem('supero_pos_failed_attempts') || '0', 10);
const storedIsLocked = localStorage.getItem('supero_pos_is_locked') === 'true';
const storedLockUntil = localStorage.getItem('supero_pos_lock_until')
  ? parseInt(localStorage.getItem('supero_pos_lock_until')!, 10)
  : null;
const storedBranch = localStorage.getItem('supero_pos_branch_id') || 'branch-1';

// Initial default user if token exists or fallback mock
/* Antes, un token sin perfil guardado inventaba un usuario 'admin' con rol
   ADMIN. Si el perfil no está, la sesión no es utilizable: se vuelve al login. */
const initialUser: UserProfile | null = readJson<UserProfile>('supero_pos_user');

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
    let reachedServer = false;
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, branchId: activeBranchId }),
      });

      reachedServer = true;
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

    /* 3. Respaldo sin conexión, solo en modo demostración.
       Este camino se activa cuando el backend no responde, así que mientras
       existan credenciales aquí basta con desenchufar la red de la terminal
       para entrar. En un build de producción `findDemoAccount` devuelve siempre
       `undefined` y Vite elimina las cadenas del bundle. */
    const demoAccount = findDemoAccount(username, password);

    if (demoAccount) {
      const userProfile: UserProfile = {
        id: demoAccount.id,
        username: demoAccount.user,
        role: demoAccount.role,
        name: demoAccount.name,
        branchId: activeBranchId,
        branchName: activeBranchObj.name,
      };

      localStorage.setItem('supero_pos_jwt', `demo-session-${demoAccount.role.toLowerCase()}`);
      localStorage.setItem('supero_pos_user', JSON.stringify(userProfile));
      get().resetLockout();

      set({
        token: `demo-session-${demoAccount.role.toLowerCase()}`,
        user: userProfile,
        isAuthenticated: true,
        selectedBranchId: activeBranchId,
      });

      return { success: true };
    }

    if (!IS_DEMO_MODE && !reachedServer) {
      return {
        success: false,
        error: 'No hay conexión con el servidor. Reintente cuando se restablezca la red.',
        isLocked: false,
        remainingAttempts: Math.max(0, 5 - get().failedAttempts),
      };
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
