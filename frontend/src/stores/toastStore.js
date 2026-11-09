import { create } from 'zustand';
import { useNotificationStore } from './notificationStore';

/** Default auto-dismiss time. Timing is owned by the Toast viewport so it can pause on hover/focus. */
export const TOAST_DURATION_MS = 5000;
/** Certificate toasts stay longer than the minimum 5s (and can be dismissed manually). */
export const CERTIFICATE_TOAST_DURATION_MS = 8000;

let nextId = 1;

export const useToastStore = create((set) => ({
  toast: null,

  showToast: (message, variant = 'info', options = {}) => {
    const duration =
      options.duration ?? (variant === 'certificate' ? CERTIFICATE_TOAST_DURATION_MS : TOAST_DURATION_MS);
    set({ toast: { id: nextId++, message, variant, duration } });
    useNotificationStore.getState().push(message, variant);
  },

  clearToast: () => set({ toast: null }),

  _reset: () => set({ toast: null }),
}));
