import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { EnrollmentsProvider } from '../context/EnrollmentsContext';
import { ApplicationsProvider } from '../context/ApplicationsContext';
import AssessmentsPage from './AssessmentsPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '../api/client';

const mockAvailable = {
  assessments: [
    {
      skillId: 1,
      skillName: 'TypeScript',
      category: 'Programming',
      currentLevel: 1,
      currentLevelLabel: 'No Knowledge',
      targetLevel: 3,
      targetLevelLabel: 'Intermediate',
      gap: 2,
      hasAssessment: false,
      questionCount: 25,
      timeLimitMinutes: 40,
      sourceLabel: 'AI-generated',
      companyName: null,
      proctored: true,
      isSkillAssessment: false,
    },
    {
      skillId: 2,
      skillName: 'JavaScript',
      category: 'Programming',
      currentLevel: 3,
      currentLevelLabel: 'Intermediate',
      targetLevel: 4,
      targetLevelLabel: 'Advanced',
      gap: 1,
      hasAssessment: true,
      questionCount: 30,
      timeLimitMinutes: 45,
      sourceLabel: 'Company',
      companyName: 'Acme Corp',
      proctored: false,
      isSkillAssessment: false,
    },
  ],
  matchPercent: 78,
  verifiedSkillsCount: 3,
  recommendedCount: 2,
};

const mockResults = [
  {
    assessmentId: 1,
    skillName: 'CSS',
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
          <ApplicationsProvider>
            <ToastProvider>
              <AssessmentsPage />
            </ToastProvider>
          </ApplicationsProvider>
        </EnrollmentsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('AssessmentsPage', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.get.mockImplementation((path) => {
      if (path === '/assessments/available') return Promise.resolve(mockAvailable);
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
    expect(await screen.findByText(/Verified results strengthen your skill profile/)).toBeInTheDocument();
  });

  it('displays stat cards when data loads', async () => {
    renderAssessments();
    await screen.findByText('78%');
    expect(screen.getByText('Verified skills')).toBeInTheDocument();
    expect(screen.getByText('Recommended assessment')).toBeInTheDocument();
  });

  it('displays available assessments', async () => {
    renderAssessments();
    expect(await screen.findByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Available assessments')).toBeInTheDocument();
  });

  it('shows retake button for completed assessments', async () => {
    renderAssessments();
    await screen.findByText('TypeScript');
    const retakeButtons = screen.getAllByText('Retake');
    expect(retakeButtons.length).toBeGreaterThan(0);
    const startButtons = screen.getAllByText('Start');
    expect(startButtons.length).toBeGreaterThan(0);
  });

  it('displays recent results when available', async () => {
    renderAssessments();
    await screen.findByText('TypeScript');
    expect(screen.getByText('Recent results')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
  });

  it('shows assessment results with correct tags', async () => {
    renderAssessments();
    await screen.findByText('TypeScript');
    expect(screen.getByText('3 Intermediate')).toBeInTheDocument();
    expect(screen.getByText('4 Advanced')).toBeInTheDocument();
  });

  it('shows how verification works section', async () => {
    renderAssessments();
    await screen.findByText('How verification works');
    expect(screen.getByText(/Proctored assessments request camera, mic, and focus up front/)).toBeInTheDocument();
    expect(screen.getByText(/Pass a quick device check before a proctored timer starts/)).toBeInTheDocument();
    expect(screen.getByText(/Your verified level is added/)).toBeInTheDocument();
  });

  it('distinguishes company and AI assessment sources on cards', async () => {
    renderAssessments();
    await screen.findByText('TypeScript');
    expect(screen.getByText('AI-generated')).toBeInTheDocument();
    expect(screen.getByText('Proctored')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Not proctored')).toBeInTheDocument();
  });

  it('shows skill assessment tag for parsed-skill assessments', async () => {
    api.get.mockImplementationOnce((path) => {
      if (path === '/assessments/available') return Promise.resolve({
        assessments: [{
          skillId: 3,
          skillName: 'GraphQL',
          category: undefined,
          currentLevel: 0,
          currentLevelLabel: 'No Knowledge',
          targetLevel: 0,
          targetLevelLabel: 'No Knowledge',
          gap: 0,
          hasAssessment: false,
          questionCount: 5,
          timeLimitMinutes: 45,
          sourceLabel: 'AI-generated',
          companyName: null,
          proctored: true,
          isSkillAssessment: true,
        }],
        matchPercent: 0,
        verifiedSkillsCount: 0,
        recommendedCount: 0,
      });
      if (path === '/assessments/results') return Promise.resolve([]);
      return Promise.resolve(null);
    });

    renderAssessments();

    expect(await screen.findByText('GraphQL')).toBeInTheDocument();
    expect(screen.getByText('Skill verifier')).toBeInTheDocument();
  });

  it('marks every gapped assessment as recommended next', async () => {
    renderAssessments();
    await screen.findByText('TypeScript');
    const recommendedNext = screen.getAllByText('Recommended next');
    expect(recommendedNext.length).toBe(2);
  });

  it('starts non-proctored company assessments directly without device check', async () => {
    renderAssessments();
    await screen.findByText('TypeScript');

    await userEvent.click(screen.getByText('Retake'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/assessments/start', { skillId: 2 });
    });
    expect(screen.queryByText('Before the timer starts')).not.toBeInTheDocument();
  });

  it('opens the device check modal for proctored assessments', async () => {
    renderAssessments();
    await screen.findByText('TypeScript');

    await userEvent.click(screen.getByText('Start'));

    expect(await screen.findByText('Before the timer starts')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows empty state for assessments when no target role is set', async () => {
    api.get.mockImplementationOnce((path) => {
      if (path === '/assessments/available') return Promise.resolve(null);
      return Promise.resolve([]);
    });
    api.get.mockImplementationOnce((path) => {
      if (path === '/assessments/results') return Promise.resolve([]);
      return Promise.resolve([]);
    });

    renderAssessments({ targetRole: '' });

    expect(await screen.findByText('No available assessments')).toBeInTheDocument();
    expect(screen.getByText('Set a target role to see which assessments to take.')).toBeInTheDocument();
  });

  it('shows empty state for results when no results exist', async () => {
    api.get.mockImplementationOnce((path) => {
      if (path === '/assessments/available') return Promise.resolve(mockAvailable);
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
    let resolveAvail, resolveRes;
    api.get
      .mockImplementationOnce(() => new Promise((resolve) => { resolveAvail = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveRes = resolve; }));

    renderAssessments();

    expect(screen.getAllByText('Loading...').length).toBeGreaterThan(0);

    resolveAvail(mockAvailable);
    resolveRes(mockResults);
    await screen.findByText('78%');
  });

  it('handles API errors gracefully', async () => {
    api.get
      .mockImplementationOnce(() => Promise.reject(new Error('Network error')))
      .mockImplementationOnce(() => Promise.reject(new Error('Network error')));

    renderAssessments();

    expect(await screen.findByText('No available assessments')).toBeInTheDocument();
  });
});
