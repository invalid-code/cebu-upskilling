import { create } from 'zustand';

const STORAGE_KEY = 'cebu-cookie-consent';

export function getInitialConsent() {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export const useCookieConsentStore = create((set) => ({
  consent: getInitialConsent(),

  accept: () => {
    localStorage.setItem(STORAGE_KEY, 'accepted');
    set({ consent: 'accepted' });
  },

  decline: () => {
    localStorage.setItem(STORAGE_KEY, 'declined');
    set({ consent: 'declined' });
  },

  hydrate: () => set({ consent: getInitialConsent() }),

  _reset: () => set({ consent: getInitialConsent() }),
}));

export const COOKIE_STORAGE_KEY = STORAGE_KEY;
