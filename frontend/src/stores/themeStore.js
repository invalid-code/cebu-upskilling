import { create } from 'zustand';

const STORAGE_KEY = 'theme';

function getInitial() {
  try {
    if (typeof localStorage === 'undefined') return false;
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark') return true;
    if (saved === 'light') return false;
    // Default to light unless system prefers dark and no saved preference
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
    return false;
  } catch {
    return false;
  }
}

export const useThemeStore = create((set) => ({
  isDark: getInitial(),
  toggle: () => set((state) => {
    const next = !state.isDark;
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light');
    } catch {
      // ignore storage errors
    }
    return { isDark: next };
  }),
  setDark: (value) => set({ isDark: !!value }),
}));
