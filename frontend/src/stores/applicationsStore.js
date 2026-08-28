import { create } from 'zustand';
import { api } from '../api/client';
import { useAuthStore } from './authStore';

function normalize(summary) {
  return {
    id: summary.postId,
    title: summary.title,
    company: summary.company,
    targetRole: summary.targetRole,
    status: summary.status,
    appliedAt: summary.appliedAt,
    savedAt: summary.savedAt,
    resumeUrl: summary.resumeUrl || null,
    coverLetterUrl: summary.coverLetterUrl || null,
  };
}

export const useApplicationsStore = create((set, get) => ({
  applications: [],
  loading: false,

  fetchApplications: async (signal, explicitUser) => {
    const user = explicitUser !== undefined ? explicitUser : useAuthStore.getState().user;
    const userId = user?.UserId ?? user?.userId ?? null;
    if (!userId) {
      set({ applications: [] });
      return;
    }
    set({ loading: true });
    try {
      const data = await api.get('/applications', { signal });
      set({ applications: (data || []).map(normalize) });
    } catch (err) {
      if (err?.name === 'AbortError') return;
      set({ applications: [] });
    } finally {
      if (!signal?.aborted) set({ loading: false });
    }
  },

  applyToJob: async (job, options = {}) => {
    const { user } = useAuthStore.getState();
    const userId = user?.UserId ?? user?.userId ?? null;
    if (!userId) return;
    const id = job.postId ?? job.id;
    if (get().applications.some((a) => a.id === id)) return;
    const body = { postId: id };
    if (options.resumeUrl) body.resumeUrl = options.resumeUrl;
    if (options.coverLetterUrl) body.coverLetterUrl = options.coverLetterUrl;
    try {
      const created = await api.post('/applications', body);
      set((state) => ({
        applications: [
          ...state.applications,
          normalize(created) || {
            id,
            title: job.title,
            company: job.company,
            targetRole: job.targetRole || job.title,
            status: 'applied',
            appliedAt: new Date().toISOString(),
            resumeUrl: options.resumeUrl || null,
            coverLetterUrl: options.coverLetterUrl || null,
          },
        ],
      }));
    } catch (err) {
      console.warn('[Applications] Failed to apply to job:', id, err?.message || err);
      throw err;
    }
  },

  updateStatus: async (jobId, status) => {
    set((state) => ({
      applications: state.applications.map((app) =>
        app.id === jobId
          ? {
              ...app,
              status,
              savedAt: status === 'saved' ? app.savedAt || new Date().toISOString() : app.savedAt,
            }
          : app,
      ),
    }));
    try {
      await api.patch(`/applications/${jobId}`, { status });
    } catch (err) {
      console.warn('[Applications] Failed to update status for job:', jobId, err?.message || err);
    }
  },

  isApplied: (jobId) => get().applications.some((a) => a.id === jobId),

  _reset: () => set({ applications: [], loading: false }),
}));
