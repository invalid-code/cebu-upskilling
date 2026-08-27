import { create } from 'zustand';

let timeoutId = null;

export const useToastStore = create((set) => ({
  toast: null,

  showToast: (message) => {
    set({ toast: message });
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => set({ toast: null }), 2300);
  },

  clearToast: () => {
    if (timeoutId) clearTimeout(timeoutId);
    set({ toast: null });
  },

  _reset: () => {
    if (timeoutId) clearTimeout(timeoutId);
    set({ toast: null });
  },
}));
