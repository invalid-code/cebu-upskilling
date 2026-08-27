import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

class MemoryStorage {
  constructor() {
    this.store = new Map();
  }

  get length() {
    return this.store.size;
  }

  clear() {
    this.store.clear();
  }

  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  key(index) {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key) {
    this.store.delete(key);
  }

  setItem(key, value) {
    this.store.set(String(key), String(value));
  }
}

const isBrokenStorage = (value) =>
  value == null || typeof value !== 'object' || typeof value.getItem !== 'function';

if (isBrokenStorage(globalThis.localStorage)) {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  });
}

if (isBrokenStorage(globalThis.sessionStorage)) {
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    writable: true,
    value: new MemoryStorage(),
  });
}

if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() { return false; },
  });
}

afterEach(async () => {
  cleanup();
  localStorage.clear();
  // Reset Zustand stores so tests remain isolated (stores are singletons).
  // Dynamic imports ensure polyfill has run before store evaluation.
  try {
    const { useAuthStore } = await import('../stores/authStore');
    const { useEnrollmentsStore } = await import('../stores/enrollmentsStore');
    const { useApplicationsStore } = await import('../stores/applicationsStore');
    const { useToastStore } = await import('../stores/toastStore');
    const { useCookieConsentStore } = await import('../stores/cookieConsentStore');
    useAuthStore.getState()._reset();
    useEnrollmentsStore.getState()._reset();
    useApplicationsStore.getState()._reset();
    useToastStore.getState()._reset();
    useCookieConsentStore.getState()._reset();
  } catch {
    // ignore if stores not yet loaded
  }
});
