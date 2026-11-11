import { create } from 'zustand';

const STORAGE_KEY = 'notifications';
const MAX_ITEMS = 30;

function load() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(items) {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // storage full/unavailable — feed still works in memory
  }
}

export function unreadCount(items) {
  return items.reduce((n, item) => (item.read ? n : n + 1), 0);
}

export const useNotificationStore = create((set, get) => ({
  items: load(),

  // Every toast is also archived here so the bell has a history.
  push: (message, variant = 'info') => {
    const items = get().items;
    const now = Date.now();
    const existingIndex = items.findIndex((i) => i.message === message && i.variant === variant);
    let next;
    if (existingIndex >= 0) {
      const [existing] = items.splice(existingIndex, 1);
      next = [{ ...existing, at: now, read: false }, ...items];
    } else {
      next = [
        { id: `${now}-${Math.random().toString(36).slice(2, 8)}`, message, variant, at: now, read: false },
        ...items,
      ];
    }
    if (next.length > MAX_ITEMS) next = next.slice(0, MAX_ITEMS);
    set({ items: next });
    persist(next);
  },

  markAllRead: () => {
    const items = get().items;
    if (!items.some((i) => !i.read)) return;
    const next = items.map((i) => (i.read ? i : { ...i, read: true }));
    set({ items: next });
    persist(next);
  },

  clear: () => {
    set({ items: [] });
    persist([]);
  },

  _reset: () => {
    set({ items: [] });
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  },
}));
