import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const ApplicationsContext = createContext(null);
const STORAGE_KEY = 'job_applications';

export function ApplicationsProvider({ children }) {
  const [applications, setApplications] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  }, [applications]);

  const applyToJob = useCallback((job) => {
    setApplications((prev) => {
      if (prev.some((a) => a.id === job.id)) return prev;
      return [...prev, { ...job, appliedAt: new Date().toISOString(), status: 'applied' }];
    });
  }, []);

  const updateStatus = useCallback((jobId, status) => {
    setApplications((prev) =>
      prev.map((app) => (app.id === jobId ? { ...app, status } : app))
    );
  }, []);

  const isApplied = useCallback(
    (jobId) => applications.some((a) => a.id === jobId),
    [applications],
  );

  return (
    <ApplicationsContext.Provider value={{ applications, applyToJob, isApplied, updateStatus }}>
      {children}
    </ApplicationsContext.Provider>
  );
}

export function useApplications() {
  const ctx = useContext(ApplicationsContext);
  if (!ctx) throw new Error('useApplications must be used within ApplicationsProvider');
  return ctx;
}
