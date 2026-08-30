import { createContext, useContext, useEffect } from 'react';
import { useAuthStore, getInitialUser } from '../stores/authStore';
import { isLearner as isLearnerStore, isRecruiter as isRecruiterStore, isCourseProvider as isCourseProviderStore } from '../stores/authStore';

const AuthContext = createContext(null);

/**
 * AuthProvider delegates state to Zustand (useAuthStore) while preserving
 * React Context for backwards compatibility. The initial user is derived
 * synchronously from localStorage so the first render reflects the current
 * storage (important for tests that set localStorage before rendering).
 */
export function AuthProvider({ children }) {
  const store = useAuthStore();

  // Derive initial user synchronously from localStorage so first render reflects
  // current storage (important for tests that set localStorage before rendering).
  const initialUser = getInitialUser();
  const needsSync = JSON.stringify(store.user) !== JSON.stringify(initialUser);

  useEffect(() => {
    if (needsSync) store.setUser(initialUser);
  }, [needsSync, initialUser, store]);

  const value = needsSync ? { ...store, user: initialUser } : store;

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  const store = useAuthStore();
  if (ctx) return ctx;
  // Fallback to Zustand directly when no provider is present
  return store;
}

// Re-export helpers
export function isLearner(user) {
  return isLearnerStore(user);
}

export function isRecruiter(user) {
  return isRecruiterStore(user);
}

export function isCourseProvider(user) {
  return isCourseProviderStore(user);
}

export function getDashboardPath(user) {
  if (isRecruiterStore(user)) return '/business-dashboard';
  if (isCourseProviderStore(user)) return '/provider-dashboard';
  return '/dashboard';
}
