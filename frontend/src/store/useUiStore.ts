import { create } from 'zustand';

export interface ToastNotification {
  id: string;
  type: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING';
  message: string;
}

interface UiState {
  isSidebarOpen: boolean;
  activeModal: string | null;
  toasts: ToastNotification[];

  // Actions
  toggleSidebar: () => void;
  openModal: (modalId: string) => void;
  closeModal: () => void;
  addToast: (message: string, type?: 'SUCCESS' | 'ERROR' | 'INFO' | 'WARNING') => void;
  removeToast: (id: string) => void;
  resetUiState: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isSidebarOpen: true,
  activeModal: null,
  toasts: [],

  toggleSidebar: () => set(state => ({ isSidebarOpen: !state.isSidebarOpen })),
  openModal: (modalId) => set({ activeModal: modalId }),
  closeModal: () => set({ activeModal: null }),
  addToast: (message, type = 'SUCCESS') => {
    const id = `toast-${Date.now()}`;
    set(state => ({ toasts: [...state.toasts, { id, type, message }] }));
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  resetUiState: () => set({ isSidebarOpen: true, activeModal: null, toasts: [] })
}));
