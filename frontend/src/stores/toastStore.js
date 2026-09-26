import { create } from 'zustand';
import { useNotificationStore } from './notificationStore';

let timeoutId = null;

export const useToastStore = create((set) => ({
  toast: null,

  showToast: (message, variant = 'info') => {
    set({ toast: { message, variant } });
    useNotificationStore.getState().push(message, variant);
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
