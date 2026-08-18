/* eslint-disable react/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { api } from '../api/client';

const ApplicationsContext = createContext(null);

function normalize(summary) {
  return {
    id: summary.postId,
    title: summary.title,
    company: summary.company,
    targetRole: summary.targetRole,
    status: summary.status,
    appliedAt: summary.appliedAt,
    savedAt: summary.savedAt,
  };
}

export function ApplicationsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.UserId ?? user?.userId ?? null;
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) {
      setApplications([]);
      return;
    }
    setLoading(true);
    api.get('/applications')
      .then((data) => setApplications((data || []).map(normalize)))
      .catch(() => setApplications([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const applyToJob = useCallback(async (job) => {
    if (!userId) return;
    if (applications.some((a) => a.id === job.id)) return;
    try {
      const created = await api.post('/applications', { postId: job.id });
      setApplications((prev) => [
        ...prev,
        normalize(created) || {
          id: job.id,
          title: job.title,
          company: job.company,
          targetRole: job.targetRole || job.title,
          status: 'applied',
          appliedAt: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.warn('[Applications] Failed to apply to job:', job.id, err?.message || err);
    }
  }, [userId, applications]);

  const updateStatus = useCallback(async (jobId, status) => {
    setApplications((prev) =>
      prev.map((app) =>
        app.id === jobId
          ? {
              ...app,
              status,
              savedAt: status === 'saved' ? app.savedAt || new Date().toISOString() : app.savedAt,
            }
          : app,
      ),
    );
    try {
      await api.patch(`/applications/${jobId}`, { status });
    } catch (err) {
      console.warn('[Applications] Failed to update status for job:', jobId, err?.message || err);
    }
  }, []);

  const isApplied = useCallback(
    (jobId) => applications.some((a) => a.id === jobId),
    [applications],
  );

  return (
    <ApplicationsContext.Provider value={{ applications, applyToJob, isApplied, updateStatus, loading }}>
      {children}
    </ApplicationsContext.Provider>
  );
}

export function useApplications() {
  const ctx = useContext(ApplicationsContext);
  if (!ctx) throw new Error('useApplications must be used within ApplicationsProvider');
  return ctx;
}
