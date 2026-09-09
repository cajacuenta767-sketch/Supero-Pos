import { create } from 'zustand';

interface SyncState {
  isOnline: boolean;
  pendingCount: number;
  lastSyncTime: string | null;
  setIsOnline: (online: boolean) => void;
  setPendingCount: (count: number) => void;
  setLastSyncTime: (time: string) => void;
}

export const useSyncStore = create<SyncState>((set) => ({
  isOnline: true,
  pendingCount: 0,
  lastSyncTime: new Date().toLocaleTimeString(),
  setIsOnline: (isOnline) => set({ isOnline }),
  setPendingCount: (pendingCount) => set({ pendingCount }),
  setLastSyncTime: (lastSyncTime) => set({ lastSyncTime }),
}));
