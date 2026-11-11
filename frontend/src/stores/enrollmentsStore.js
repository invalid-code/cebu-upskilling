import { create } from 'zustand';
import { api } from '../api/client';
import { useAuthStore, isRecruiter } from './authStore';

export const useEnrollmentsStore = create((set, get) => ({
  enrollments: [],
  lastFetchedAt: null,
  lastUserId: null,

  fetchEnrollments: async (signal, explicitUser, options = {}) => {
    const user = explicitUser !== undefined ? explicitUser : useAuthStore.getState().user;
    const userId = user?.UserId ?? user?.userId ?? null;
    if (!user || isRecruiter(user)) {
      set({ enrollments: [], lastFetchedAt: null, lastUserId: null });
      return;
    }
    const { lastFetchedAt, lastUserId } = get();
    const staleTimeMs = options.staleTimeMs ?? 30000;
    if (
      !options.force &&
      lastUserId === userId &&
      lastFetchedAt &&
      Date.now() - lastFetchedAt < staleTimeMs
    ) {
      return;
    }
    try {
      const data = await api.get('/enrollments', { signal });
      set({ enrollments: data || [], lastFetchedAt: Date.now(), lastUserId: userId });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.warn('[Enrollments] Failed to fetch enrollments:', err?.message || err);
      set({ enrollments: [] });
    }
  },

  isEnrolled: (courseId) => get().enrollments.some((e) => e.courseId === courseId),

  refreshEnrollments: async (signal, explicitUser) => {
    // Post-mutation refresh (e.g. right after enrolling): always revalidate.
    await get().fetchEnrollments(signal, explicitUser, { force: true });
  },

  _reset: () => set({ enrollments: [], lastFetchedAt: null, lastUserId: null }),
}));
