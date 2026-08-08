import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { EnrollmentsProvider } from '../context/EnrollmentsContext';
import AssessmentsPage from './AssessmentsPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '../api/client';

const mockRecommended = {
  skillName: 'TypeScript',
  currentLevel: 1,
  currentLevelLabel: 'Beginner',
  targetLevelLabel: 'Intermediate',
};

const mockResults = [
  {
    assessmentId: 1,
    skillName: 'JavaScript',
    scoredLevel: 3,
    levelLabel: 'Intermediate',
    completedAt: '2026-01-15T10:00:00Z',
  },
  {
    assessmentId: 2,
    skillName: 'React',
    scoredLevel: 4,
    levelLabel: 'Advanced',
    completedAt: '2026-02-20T14:30:00Z',
  },
];

function renderAssessments(user = { targetRole: 'Frontend Developer' }) {
  localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner', targetRole: user.targetRole }));
  localStorage.setItem('token', 'abc');

  return render(
    <MemoryRouter>
      <AuthProvider>
        <EnrollmentsProvider>
          <ToastProvider>
            <AssessmentsPage />
          </ToastProvider>
        </EnrollmentsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AssessmentsPage', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockImplementation((path) => {
      if (path === '/assessments/recommended') return Promise.resolve(mockRecommended);
      if (path === '/assessments/results') return Promise.resolve(mockResults);
      return Promise.resolve(null);
    });
  });

  it('renders the assessments page heading', async () => {
    renderAssessments();
    expect(await screen.findByRole('heading', { name: 'Assessments' })).toBeInTheDocument();
  });

  it('renders the subtitle', async () => {
    renderAssessments();
    expect(await screen.findByText('Verified results strengthen your profile and your job match.')).toBeInTheDocument();
  });

  it('displays recommended assessment when available', async () => {
    renderAssessments();
    expect(await screen.findByText('Recommended next')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Your current level is 1 Beginner.')).toBeInTheDocument();
    expect(screen.getByText('A verified result can move this skill into your job applications.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /start assessment/i })).toBeInTheDocument();
  });

  it('displays recent results when available', async () => {
    renderAssessments();
    await screen.findByText('Recommended next');
    expect(screen.getByText('Recent results')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Verified Jan 15')).toBeInTheDocument();
    expect(screen.getByText('Verified Feb 20')).toBeInTheDocument();
  });

  it('shows assessment results with correct tags', async () => {
    renderAssessments();
    await screen.findByText('Recommended next');
    expect(screen.getByText('3 Intermediate')).toBeInTheDocument();
    expect(screen.getByText('4 Advanced')).toBeInTheDocument();
  });

  it('shows empty state for recommended when no target role is set', async () => {
    api.get.mockImplementationOnce((path) => {
      if (path === '/assessments/recommended') return Promise.resolve(null);
      return Promise.resolve([]);
    });
    api.get.mockImplementationOnce((path) => {
      if (path === '/assessments/results') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderAssessments({ targetRole: '' });

    expect(await screen.findByText('No recommended assessment')).toBeInTheDocument();
    expect(screen.getByText('Set a target role to see which assessment to take next.')).toBeInTheDocument();
  });

  it('shows all skills matched when no skill gaps remain', async () => {
    api.get.mockImplementationOnce((path) => {
      if (path === '/assessments/recommended') return Promise.resolve(null);
      return Promise.resolve([]);
    });
    api.get.mockImplementationOnce((path) => {
      if (path === '/assessments/results') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderAssessments({ targetRole: 'Frontend Developer' });

    expect(await screen.findByText('All skills matched')).toBeInTheDocument();
    expect(screen.getByText('You have no remaining skill gaps for your target role.')).toBeInTheDocument();
  });

  it('shows empty state for results when no results exist', async () => {
    api.get.mockImplementationOnce((path) => {
      if (path === '/assessments/recommended') return Promise.resolve(null);
      return Promise.resolve([]);
    });
    api.get.mockImplementationOnce((path) => {
      if (path === '/assessments/results') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderAssessments();

    expect(await screen.findByText('No results yet')).toBeInTheDocument();
    expect(screen.getByText('Verified assessment results will appear here.')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    let resolveRec, resolveRes;
    api.get
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRec = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRes = resolve; }));

    renderAssessments();

    expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0);

    resolveRec(mockRecommended);
    resolveRes(mockResults);
    await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
  });

  it('handles API errors gracefully', async () => {
    api.get
      .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
      .mockImplementationOnce(() => Promise.reject(new Error('Network error')));

    renderAssessments();

    expect(await screen.findByText('No recommended assessment')).toBeInTheDocument();
  });
});