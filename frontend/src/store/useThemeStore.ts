import { create } from 'zustand';

const KEY = 'supero_pos_theme';

/** Lee el tema ya aplicado por el script anti-parpadeo de index.html. */
const readInitial = (): boolean => {
  if (typeof document === 'undefined') return false;
  return document.documentElement.classList.contains('dark');
};

const apply = (dark: boolean) => {
  document.documentElement.classList.toggle('dark', dark);
  try {
    localStorage.setItem(KEY, dark ? 'dark' : 'light');
  } catch {
    /* almacenamiento no disponible: el tema vive solo en memoria */
  }
};

interface ThemeState {
  isDarkMode: boolean;
  toggleTheme: () => void;
  setTheme: (dark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDarkMode: readInitial(),
  toggleTheme: () =>
    set((state) => {
      const next = !state.isDarkMode;
      apply(next);
      return { isDarkMode: next };
    }),
  setTheme: (dark: boolean) => {
    apply(dark);
    set({ isDarkMode: dark });
  },
}));
