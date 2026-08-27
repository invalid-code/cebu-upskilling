import { create } from 'zustand';
import { api } from '../api/client';
import { useAuthStore, isRecruiter } from './authStore';

export const useEnrollmentsStore = create((set, get) => ({
  enrollments: [],

  fetchEnrollments: async (signal, explicitUser) => {
    const user = explicitUser !== undefined ? explicitUser : useAuthStore.getState().user;
    if (!user || isRecruiter(user)) {
      set({ enrollments: [] });
      return;
    }
    try {
      const data = await api.get('/enrollments', { signal });
      set({ enrollments: data || [] });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      console.warn('[Enrollments] Failed to fetch enrollments:', err?.message || err);
      set({ enrollments: [] });
    }
  },

  isEnrolled: (courseId) => get().enrollments.some((e) => e.courseId === courseId),

  refreshEnrollments: async (signal, explicitUser) => {
    await get().fetchEnrollments(signal, explicitUser);
  },

  _reset: () => set({ enrollments: [] }),
}));
