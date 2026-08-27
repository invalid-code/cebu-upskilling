/* eslint-disable react/only-export-components */
import { createContext, useContext, useEffect } from 'react';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useAuth } from './AuthContext';

const ApplicationsContext = createContext(null);

export function ApplicationsProvider({ children }) {
  const { applications, loading, fetchApplications, applyToJob, isApplied, updateStatus } = useApplicationsStore();
  const { user } = useAuth();
  const userId = user?.UserId ?? user?.userId ?? null;

  useEffect(() => {
    const controller = new AbortController();
    fetchApplications(controller.signal, user);
    return () => controller.abort();
  }, [userId, user, fetchApplications]);

  const value = { applications, applyToJob, isApplied, updateStatus, loading, fetchApplications };

  return (
    <ApplicationsContext.Provider value={value}>
      {children}
    </ApplicationsContext.Provider>
  );
}

export function useApplications() {
  const ctx = useContext(ApplicationsContext);
  const store = useApplicationsStore();
  if (ctx) return ctx;
  return store;
}
