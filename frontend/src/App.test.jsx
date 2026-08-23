import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import App from './App';

vi.mock('./api/client', () => ({
  api: { get: vi.fn().mockResolvedValue([]), post: vi.fn() },
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
  it('redirects unauthenticated users to the login page', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('renders the protected dashboard for authenticated users', async () => {
    localStorage.setItem(
      'user',
      JSON.stringify({ firstName: 'Jose', role: 'learner' }),
    );
    localStorage.setItem('token', 'abc');
    render(<App />);
    expect(await screen.findByText('Your next move is clear.')).toBeInTheDocument();
  });

  it('renders the employer overview for recruiter users', async () => {
    seedRecruiter();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Welcome back.' })).toBeInTheDocument();
    expect(screen.queryByText('Your next move is clear.')).not.toBeInTheDocument();
  });

  it('redirects recruiter away from direct learner route access', async () => {
    seedRecruiter();
    window.history.pushState({}, '', '/skills');
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'Business Dashboard' })).toBeInTheDocument();
  });
});