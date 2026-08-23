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
    resumeUrl: summary.resumeUrl || null,
    coverLetterUrl: summary.coverLetterUrl || null,
  };
}

export function ApplicationsProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.UserId ?? user?.userId ?? null;
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchApplications = useCallback(async (signal) => {
    if (!userId) {
      setApplications([]);
      return;
    }
    setLoading(true);
    try {
      const data = await api.get('/applications', { signal });
      setApplications((data || []).map(normalize));
    } catch (err) {
      if (err?.name === 'AbortError') return;
      setApplications([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const controller = new AbortController();
    fetchApplications(controller.signal);
    return () => controller.abort();
  }, [fetchApplications]);

  const applyToJob = useCallback(async (job, options = {}) => {
    if (!userId) return;
    const id = job.postId ?? job.id;
    if (applications.some((a) => a.id === id)) return;
    const body = { postId: id };
    if (options.resumeUrl) body.resumeUrl = options.resumeUrl;
    if (options.coverLetterUrl) body.coverLetterUrl = options.coverLetterUrl;
    try {
      const created = await api.post('/applications', body);
      setApplications((prev) => [
        ...prev,
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
      ]);
    } catch (err) {
      console.warn('[Applications] Failed to apply to job:', id, err?.message || err);
      throw err;
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
