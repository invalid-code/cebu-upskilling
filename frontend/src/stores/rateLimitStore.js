import { create } from 'zustand';

export const RATE_LIMIT_COOLDOWN_MS = 10000;
export const RATE_LIMIT_MESSAGE = 'Too many requests — please wait 10 seconds before trying again.';

let timer = null;

// Submit cooldown after an HTTP 429. `active` is true for 10 seconds from the
// moment the response was received, then flips back so submit controls re-enable.
export const useRateLimitStore = create((set) => ({
  active: false,
  message: RATE_LIMIT_MESSAGE,

  start: () => {
    if (timer) clearTimeout(timer);
    set({ active: true });
    timer = setTimeout(() => {
      timer = null;
      set({ active: false });
    }, RATE_LIMIT_COOLDOWN_MS);
  },

  _reset: () => {
    if (timer) clearTimeout(timer);
    timer = null;
    set({ active: false });
  },
}));
