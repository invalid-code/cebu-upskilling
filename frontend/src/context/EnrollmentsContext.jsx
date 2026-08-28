/* eslint-disable react/only-export-components */
import { createContext, useContext, useEffect } from 'react';
import { useEnrollmentsStore } from '../stores/enrollmentsStore';
import { useAuth } from './AuthContext';

const EnrollmentsContext = createContext(null);

export function EnrollmentsProvider({ children }) {
  const { enrollments, fetchEnrollments, isEnrolled } = useEnrollmentsStore();
  const { user } = useAuth();

  useEffect(() => {
    const controller = new AbortController();
    fetchEnrollments(controller.signal, user);
    return () => controller.abort();
  }, [user, fetchEnrollments]);

  const refreshEnrollments = (signal) => fetchEnrollments(signal, user);

  const value = { enrollments, isEnrolled, refreshEnrollments, fetchEnrollments };

  return (
    <EnrollmentsContext.Provider value={value}>
      {children}
    </EnrollmentsContext.Provider>
  );
}

export function useEnrollments() {
  const ctx = useContext(EnrollmentsContext);
  const store = useEnrollmentsStore();
  if (ctx) return ctx;
  return store;
}
