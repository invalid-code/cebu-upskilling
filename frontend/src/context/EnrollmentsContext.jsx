/* eslint-disable react/only-export-components */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';
import { useAuth, isRecruiter } from './AuthContext';

const EnrollmentsContext = createContext(null);

export function EnrollmentsProvider({ children }) {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState([]);

  const fetchEnrollments = useCallback(async (signal) => {
    if (!user || isRecruiter(user)) {
      setEnrollments([]);
      return;
    }
    try {
      const data = await api.get('/enrollments', { signal });
      setEnrollments(data || []);
    } catch (err) {
      console.warn('[Enrollments] Failed to fetch enrollments:', err?.message || err);
      setEnrollments([]);
    }
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    fetchEnrollments(controller.signal);
    return () => controller.abort();
  }, [fetchEnrollments]);

  const isEnrolled = useCallback(
    (courseId) => enrollments.some((e) => e.courseId === courseId),
    [enrollments],
  );

  const refreshEnrollments = useCallback(() => fetchEnrollments(), [fetchEnrollments]);

  return (
    <EnrollmentsContext.Provider value={{ enrollments, isEnrolled, refreshEnrollments }}>
      {children}
    </EnrollmentsContext.Provider>
  );
}

export function useEnrollments() {
  const ctx = useContext(EnrollmentsContext);
  if (!ctx) throw new Error('useEnrollments must be used within EnrollmentsProvider');
  return ctx;
}
