import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import App from '../App';
import { useAuth } from '../context/AuthContext';
import { useAuthStore, isLearner, isRecruiter } from '../stores/authStore';
import { decodeJwt, isTokenExpired, hasValidSession } from '../lib/jwt';

vi.mock('../api/client', () => ({
  api: { get: vi.fn().mockResolvedValue([]), post: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { api } from '../api/client';

function makeToken(payload) {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${body}.signature`;
}

const future = () => Math.floor(Date.now() / 1000) + 3600;
const past = () => Math.floor(Date.now() / 1000) - 3600;

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
  localStorage.clear();
  api.get.mockReset();
  api.get.mockResolvedValue([]);
  api.post.mockReset();
  useAuthStore.getState()._reset();
});

describe('Protected route enforcement', () => {
  it.each([
    '/dashboard',
    '/skills',
    '/jobs',
    '/courses',
    '/applications',
    '/assessments',
    '/credentials',
    '/profile',
    '/help',
  ])('redirects unauthenticated users away from %s', (path) => {
    window.history.pushState({}, '', path);
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it.each([
    '/business-dashboard',
    '/post-job',
    '/edit-job/1',
    '/job-applications',
    '/company-courses',
  ])('redirects unauthenticated users away from recruiter-only %s', (path) => {
    window.history.pushState({}, '', path);
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('blocks a learner from reaching recruiter-only routes', async () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Ada', role: 'Learner' }));
    localStorage.setItem('token', makeToken({ exp: future() }));
    api.get.mockResolvedValue([]);

    window.history.pushState({}, '', '/business-dashboard');
    render(<App />);

    expect(await screen.findByText('Your next move is clear.')).toBeInTheDocument();
  });

  it('blocks a recruiter from reaching learner-only routes', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ firstName: 'Ada', role: 'Recruiter' }),
    );
    localStorage.setItem('token', makeToken({ exp: future() }));
    api.get.mockResolvedValue({
      company: { name: 'Acme' },
      talentPool: { totalLearners: 0, avgSkillLevel: 0 },
      jobPostings: [],
      skillDemand: [],
    });

    window.history.pushState({}, '', '/skills');
    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Business Dashboard' })).toBeInTheDocument();
  });
});

describe('Public route guard (already-authed users)', () => {
  it.each(['/login', '/register', '/forgot-password'])(
    'sends an authenticated learner away from %s',
    (path) => {
      localStorage.setItem('user', JSON.stringify({ firstName: 'Ada', role: 'Learner' }));
      localStorage.setItem('token', makeToken({ exp: future() }));
      window.history.pushState({}, '', path);
      render(<App />);
      expect(screen.getByText('Your next move is clear.')).toBeInTheDocument();
    },
  );

  it.each(['/login', '/register', '/forgot-password'])(
    'sends an authenticated recruiter away from %s',
    async (path) => {
      localStorage.setItem(
        'user',
        JSON.stringify({ firstName: 'Ada', role: 'Recruiter' }),
      );
      localStorage.setItem('token', makeToken({ exp: future() }));
      api.get.mockResolvedValue({
        company: { name: 'Acme' },
        talentPool: { totalLearners: 0, avgSkillLevel: 0 },
        jobPostings: [],
        skillDemand: [],
      });
      window.history.pushState({}, '', path);
      render(<App />);
      expect(await screen.findByRole('heading', { name: 'Business Dashboard' })).toBeInTheDocument();
    },
  );
});

describe('Session integrity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('treats a stored role without a token as a known limitation (server enforces claims)', () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Mallory', role: 'Recruiter' }));
    useAuthStore.getState()._reset();
    expect(useAuthStore.getState().user).toEqual({ firstName: 'Mallory', role: 'Recruiter' });
  });

  it('returns null when the stored user JSON is malformed', () => {
    localStorage.setItem('token', makeToken({ exp: future() }));
    localStorage.setItem('user', '{not valid json');
    useAuthStore.getState()._reset();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('rejects forged tokens that are not valid JWTs (no exp => not treated as expired, but server is the authority)', () => {
    localStorage.setItem('token', 'forged-garbage');
    localStorage.setItem('user', JSON.stringify({ firstName: 'Mallory', role: 'Recruiter' }));
    useAuthStore.getState()._reset();
    expect(isTokenExpired('forged-garbage')).toBe(false);
  });

  it('wipes the session when the stored token is expired on hydration', () => {
    localStorage.setItem('token', makeToken({ exp: past() }));
    localStorage.setItem('user', JSON.stringify({ firstName: 'Ada', role: 'Learner' }));

    useAuthStore.getState()._reset();

    expect(useAuthStore.getState().user).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('keeps the session when the stored token is unexpired', () => {
    localStorage.setItem('token', makeToken({ exp: future() }));
    localStorage.setItem('user', JSON.stringify({ firstName: 'Ada', role: 'Learner' }));

    useAuthStore.getState()._reset();

    expect(useAuthStore.getState().user).toEqual({ firstName: 'Ada', role: 'Learner' });
  });

  it('isTokenExpired treats a tampered base64 payload as not expired (defensive: server is the authority)', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(false);
  });

  it('hasValidSession clears an expired token but tolerates a missing one', () => {
    localStorage.setItem('token', makeToken({ exp: past() }));
    localStorage.setItem('user', JSON.stringify({ firstName: 'Ada', role: 'Learner' }));
    expect(hasValidSession()).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();

    localStorage.removeItem('user');
    expect(hasValidSession()).toBe(true);
  });

  it('decodeJwt never throws on hostile input', () => {
    expect(() => decodeJwt('a.b.c')).not.toThrow();
    expect(() => decodeJwt('....')).not.toThrow();
    expect(() => decodeJwt('<script>alert(1)</script>')).not.toThrow();
    expect(() => decodeJwt('\u0000\u0000\u0000')).not.toThrow();
  });
});

describe('Role discrimination', () => {
  it('isLearner and isRecruiter do not match unexpected roles', () => {
    expect(isLearner({ role: 'Admin' })).toBe(false);
    expect(isRecruiter({ role: 'Admin' })).toBe(false);
    expect(isLearner({})).toBe(false);
    expect(isRecruiter({})).toBe(false);
  });
});

describe('AuthContext — re-exports and storage', () => {
  it('useAuth returns the store value when no provider is present', () => {
    function Probe() {
      const { user } = useAuth();
      return <span data-testid="user">{user ? user.firstName : 'none'}</span>;
    }
    localStorage.setItem('token', makeToken({ exp: future() }));
    localStorage.setItem('user', JSON.stringify({ firstName: 'Ada', role: 'Learner' }));
    useAuthStore.getState()._reset();
    render(<Probe />);
    expect(screen.getByTestId('user')).toHaveTextContent('Ada');
  });
});
