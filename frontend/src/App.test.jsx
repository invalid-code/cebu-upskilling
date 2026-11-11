import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import App from './App';

vi.mock('./api/client', () => ({
  api: { get: vi.fn().mockResolvedValue([]), post: vi.fn(), delete: vi.fn(), put: vi.fn(), patch: vi.fn() },
}));

import { api } from './api/client';

const recruiterBusinessStats = {
  company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
  talentPool: { totalLearners: 120, avgSkillLevel: 3.4 },
  jobPostings: [],
  skillDemand: [],
};

afterEach(() => {
  cleanup();
  window.history.pushState({}, '', '/');
  localStorage.clear();
  api.get.mockReset();
  api.get.mockResolvedValue([]);
});

function seedRecruiter() {
  localStorage.setItem(
    'user',
    JSON.stringify({ firstName: 'Employer', role: 'Recruiter' }),
  );
  localStorage.setItem('token', 'abc');
  api.get.mockResolvedValue(recruiterBusinessStats);
}

describe('App routing', () => {
  it('renders the public landing page at the root path', async () => {
    render(<App />);
    expect(await screen.findByRole('heading', { name: /know which skills stand between you and the job you want/i }, { timeout: 8000 })).toBeInTheDocument();
  });

  it('redirects unauthenticated users to the login page from protected routes', async () => {
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('renders the protected dashboard for authenticated users', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ firstName: 'Jose', role: 'learner' }),
    );
    localStorage.setItem('token', 'abc');
    window.history.pushState({}, '', '/dashboard');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Next move' }, { timeout: 8000 })).toBeInTheDocument();
  });

  it('renders the employer overview for recruiter users', async () => {
    seedRecruiter();
    window.history.pushState({}, '', '/business-dashboard');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Business Dashboard' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Next move' })).not.toBeInTheDocument();
  });

  it('redirects recruiter away from direct learner route access', async () => {
    seedRecruiter();
    window.history.pushState({}, '', '/skills');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Business Dashboard' })).toBeInTheDocument();
  });

  it('renders provider dashboard for CourseProvider users', async () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Prov', role: 'CourseProvider' }));
    localStorage.setItem('token', 'abc');
    api.get.mockResolvedValue([]);
    window.history.pushState({}, '', '/provider-dashboard');
    render(<App />);
    expect(await screen.findByText('Course provider')).toBeInTheDocument();
  });

  it('redirects learner away from provider dashboard', async () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Jose', role: 'learner' }));
    localStorage.setItem('token', 'abc');
    window.history.pushState({}, '', '/provider-dashboard');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Next move' })).toBeInTheDocument();
  });

  it('allows CourseProvider to access course studio', async () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Prov', role: 'CourseProvider' }));
    localStorage.setItem('token', 'abc');
    api.get.mockResolvedValue([]);
    window.history.pushState({}, '', '/company-courses');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Course studio' })).toBeInTheDocument();
  });

  it('redirects public route to correct dashboard per role', async () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Prov', role: 'CourseProvider' }));
    localStorage.setItem('token', 'abc');
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(await screen.findByText('Course provider')).toBeInTheDocument();
  });

  it.each(['/profile', '/help'])('redirects a visitor from %s to login preserving the path', async (path) => {
    window.history.pushState({}, '', `${path}?x=1`);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
    expect(new URLSearchParams(window.location.search).get('returnTo')).toBe(`${path}?x=1`);
  });

  it('renders /profile and /help for a signed-in recruiter instead of redirecting', async () => {
    seedRecruiter();
    window.history.pushState({}, '', '/help');
    render(<App />);
    expect(await screen.findByRole('heading', { level: 1, name: 'Help center' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/help');
  });

  it('ignores a returnTo the signed-in role may not open', async () => {
    seedRecruiter();
    window.history.pushState({}, '', `/login?returnTo=${encodeURIComponent('/skills')}`);
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Business Dashboard' })).toBeInTheDocument();
    expect(window.location.pathname).toBe('/business-dashboard');
  });

  it('does not expose AI course builder route and shows 404', async () => {
    seedRecruiter();
    window.history.pushState({}, '', '/company-courses/generate');
    render(<App />);
    expect(await screen.findByText(/Page not found|Not Found/i)).toBeInTheDocument();
    expect(screen.queryByText(/Generate a course with AI/)).not.toBeInTheDocument();
  });
});