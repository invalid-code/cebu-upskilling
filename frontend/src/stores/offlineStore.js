import { create } from 'zustand';

// Connectivity state driven by the API client (XHR network errors).
//  offline  – a request failed with a network error and has not yet recovered
//  retrying – automatic or manual retries are in flight
//  failed   – all automatic retries failed; the user can retry manually
export const useOfflineStore = create((set) => ({
  offline: false,
  retrying: false,
  failed: false,

  setOffline: () => set({ offline: true, retrying: true, failed: false }),
  setRetrying: () => set({ retrying: true, failed: false }),
  setFailed: () => set({ offline: true, retrying: false, failed: true }),
  setOnline: () => set({ offline: false, retrying: false, failed: false }),

  _reset: () => set({ offline: false, retrying: false, failed: false }),
}));
