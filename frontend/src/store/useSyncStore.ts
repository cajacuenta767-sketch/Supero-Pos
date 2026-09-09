import { create } from 'zustand';

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  /**
   * Ventas que agotaron sus reintentos y siguen sin llegar al servidor.
   *
   * Antes no se contaban en ningún sitio: `getPendingCount` solo miraba las
   * pendientes, así que al agotarse los cinco intentos el indicador bajaba a
   * cero y una venta que nunca se registró desaparecía de la vista de todos.
   */
  failedCount: number;
  lastSyncTime: string | null;
  setIsOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
  setFailedCount: (count: number) => void;
  setLastSyncTime: (time: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  pendingCount: 0,
  failedCount: 0,
  lastSyncTime: new Date().toLocaleTimeString(),
  setIsOnline: (isOnline) => set({ isOnline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setFailedCount: (failedCount) => set({ failedCount }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
}));
