import { createContext, useContext, useState } from 'react';
import { api } from '../api/client';
import { hasValidSession } from '../lib/jwt';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (!hasValidSession()) return null;
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading] = useState(false);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { emailAddress: email, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res));
    setUser(res);
    return res;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res));
    setUser(res);
    return res;
  };

  const registerCompany = async (data) => {
    const res = await api.post('/auth/register-company', data);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res));
    setUser(res);
    return res;
  };

  const updateProfile = async (data) => {
    const res = await api.patch('/auth/profile', data);
    localStorage.setItem('user', JSON.stringify(res));
    setUser(res);
    return res;
  };

  const logout = async () => {
    const token = localStorage.getItem('token');
    // Discard the token from the client immediately so it can't be reused,
    // even if the server revocation call below fails.
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);

    if (token) {
      try {
        // The token was just removed from storage, so pass it explicitly.
        await api.post('/auth/logout', undefined, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Server-side revocation is best-effort; the client token is already gone.
      }
    }
  };

  const confirmEmail = (email, token) =>
    api.post('/auth/confirm-email', { email, token });

  const resendConfirmation = (email) =>
    api.post('/auth/resend-confirmation', { email });

  const forgotPassword = (email) =>
    api.post('/auth/forgot-password', { email });

  const resetPassword = (email, token, newPassword) =>
    api.post('/auth/reset-password', { email, token, newPassword });

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        loading,
        login,
        register,
        registerCompany,
        logout,
        updateProfile,
        confirmEmail,
        resendConfirmation,
        forgotPassword,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function isLearner(user) {
  return user?.role?.toLowerCase() === 'learner';
}

export function isRecruiter(user) {
  return user?.role?.toLowerCase() === 'recruiter';
}

export function isCourseProvider(user) {
  return user?.role?.toLowerCase() === 'courseprovider';
}
