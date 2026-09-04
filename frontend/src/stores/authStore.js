import { create } from 'zustand';
import { api } from '../api/client';
import { hasValidSession } from '../lib/jwt';

export function getInitialUser() {
  try {
    if (typeof localStorage === 'undefined' || !hasValidSession()) return null;
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

export const useAuthStore = create((set) => ({
  user: getInitialUser(),
  loading: false,

  setUser: (user) => set({ user }),

  login: async (email, password) => {
    const res = await api.post('/auth/login', { emailAddress: email, password });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res));
    set({ user: res });
    return res;
  },

  loginWithGoogle: async (idToken, role) => {
    const res = await api.post('/auth/google', role ? { idToken, role } : { idToken });
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res));
    set({ user: res });
    return res;
  },

  register: async (data) => {
    // If a resume File is present, send as multipart/form-data so the server can
    // validate magic bytes, store to R2 and parse server-side. Otherwise fall back
    // to JSON (used by CourseProvider/Recruiter or tests without a file).
    const hasFile = data?.resumeFile instanceof File || data?.resumeFile instanceof Blob;
    let res;
    if (hasFile) {
      const form = new FormData();
      for (const [key, value] of Object.entries(data)) {
        if (value === null || value === undefined) continue;
        if (key === 'resumeFile') {
          form.append('resumeFile', value);
        } else if (key === 'resume') {
          // legacy string resume is no longer supported – ignore
          continue;
        } else {
          form.append(key, value == null ? '' : String(value));
        }
      }
      res = await api.postForm('/auth/register', form);
    } else {
      // Strip legacy resume string if present – server now expects file upload
      const { resume: _ignored, resumeFile: _ignored2, ...jsonData } = data || {};
      res = await api.post('/auth/register', jsonData);
    }
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res));
    set({ user: res });
    return res;
  },

  registerCompany: async (data) => {
    const res = await api.post('/auth/register-company', data);
    localStorage.setItem('token', res.token);
    localStorage.setItem('user', JSON.stringify(res));
    set({ user: res });
    return res;
  },

  updateProfile: async (data) => {
    const res = await api.patch('/auth/profile', data);
    localStorage.setItem('user', JSON.stringify(res));
    set({ user: res });
    return res;
  },

  logout: async () => {
    const token = localStorage.getItem('token');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null });

    if (token) {
      try {
        await api.post('/auth/logout', undefined, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // best-effort server revocation
      }
    }
  },

  confirmEmail: (email, token) => api.post('/auth/confirm-email', { email, token }),

  resendConfirmation: (email) => api.post('/auth/resend-confirmation', { email }),

  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),

  resetPassword: (email, token, newPassword) =>
    api.post('/auth/reset-password', { email, token, newPassword }),

  hydrate: () => set({ user: getInitialUser() }),

  // Helper to reset for tests
  _reset: () => set({ user: getInitialUser(), loading: false }),
}));

export function isLearner(user) {
  return user?.role?.toLowerCase() === 'learner';
}

export function isRecruiter(user) {
  return user?.role?.toLowerCase() === 'recruiter';
}

export function isCourseProvider(user) {
  return user?.role?.toLowerCase() === 'courseprovider';
}
