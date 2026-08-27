import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { EnrollmentsProvider } from '../context/EnrollmentsContext';
import { ApplicationsProvider } from '../context/ApplicationsContext';
import { ToastProvider } from '../context/ToastContext';
import OverviewPage from './OverviewPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '../api/client';

const mockCourses = [
  {
    courseId: 1,
    name: 'Modern JavaScript for Frontend Work',
    genre: { name: 'CodeChum Learning' },
    technicalLevel: 18,
    description: 'Closes your largest current gap.',
  },
  {
    courseId: 2,
    name: 'TypeScript from Zero to Confident',
    genre: { name: 'DevCon Cebu Academy' },
    technicalLevel: 12,
    description: 'Build toward Intermediate.',
  },
  {
    courseId: 3,
    name: 'Frontend Portfolio Sprint',
    genre: { name: 'Serbisyo Digital' },
    technicalLevel: 6,
    description: 'Ship one portfolio project.',
  },
];

const mockSkillGaps = [
  { skillId: 1, skillName: 'JavaScript', category: 'Language', requiredLevel: 4, currentLevel: 0, gap: 4, verified: false },
  { skillId: 2, skillName: 'TypeScript', category: 'Language', requiredLevel: 3, currentLevel: 0, gap: 3, verified: false },
  { skillId: 3, skillName: 'React', category: 'Framework', requiredLevel: 4, currentLevel: 0, gap: 4, verified: false },
];

function renderOverview() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <EnrollmentsProvider>
          <ApplicationsProvider>
            <ToastProvider>
              <OverviewPage />
            </ToastProvider>
          </ApplicationsProvider>
        </EnrollmentsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('OverviewPage', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner' }));
    localStorage.setItem('token', 'abc');
    api.get.mockReset();
    api.post.mockReset();
    api.get.mockImplementation((path) => {
      if (path === '/courses') return Promise.resolve(mockCourses);
      if (path === '/enrollments') return Promise.resolve([]);
      if (path === '/skillgaps') return Promise.resolve([]);
      if (path === '/assessments/recommended') return Promise.resolve(null);
      if (path === '/stats/business') return Promise.resolve({
        company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
        talentPool: { totalLearners: 120, avgSkillLevel: 3.4 },
      });
      return Promise.resolve([]);
    });
  });

  it('renders employer landing content for recruiters without learner data', async () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Employer', role: 'Recruiter' }));
    renderOverview();
    expect(await screen.findByText('Welcome back.')).toBeInTheDocument();
    expect(screen.getByText('View business dashboard')).toBeInTheDocument();
    expect(screen.getByText('job postings')).toBeInTheDocument();
    expect(screen.queryByText('Your next move is clear.')).not.toBeInTheDocument();
    expect(screen.queryByText(/of the way to your target role/)).not.toBeInTheDocument();
    expect(screen.queryByText('Pathway rail')).not.toBeInTheDocument();
  });

  it('renders the dashboard heading', async () => {
    renderOverview();
    expect(await screen.findByText(/of the way to your target role/)).toBeInTheDocument();
  });

  it('shows empty states when there is no backend data', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/courses') return Promise.resolve([]);
      if (path === '/enrollments') return Promise.resolve([]);
      if (path === '/skillgaps') return Promise.resolve([]);
      if (path === '/assessments/recommended') return Promise.resolve(null);
      return Promise.resolve([]);
    });
    renderOverview();
    expect(await screen.findByText('Set a target role to see your gaps')).toBeInTheDocument();
    expect(screen.getByText('No score yet')).toBeInTheDocument();
    expect(screen.getByText('Pathway rail')).toBeInTheDocument();
    expect(screen.getByText('1 of 5 steps')).toBeInTheDocument();
  });

  it('displays the target role in the pathway rail when the user has one', async () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner', targetRole: 'Frontend Developer' }));
    renderOverview();
    expect(await screen.findByText('Frontend Developer · Cebu / Remote')).toBeInTheDocument();
    expect(screen.getByText('2 of 5 steps')).toBeInTheDocument();
    expect(screen.queryByText('Your pathway will appear here')).not.toBeInTheDocument();
  });

  it('derives the target role from an applied job when the profile has none', async () => {
    localStorage.setItem('user', JSON.stringify({ UserId: 1, firstName: 'Test', role: 'Learner' }));
    api.get.mockImplementation((path) => {
      if (path === '/applications') return Promise.resolve([
        { postId: 1, title: 'Backend Developer', company: 'Acme Corp', targetRole: 'Backend Developer' },
      ]);
      if (path === '/courses') return Promise.resolve(mockCourses);
      if (path === '/enrollments') return Promise.resolve([]);
      if (path === '/skillgaps') return Promise.resolve([]);
      if (path === '/assessments/recommended') return Promise.resolve(null);
      return Promise.resolve([]);
    });
    renderOverview();
    expect(await screen.findByText('Backend Developer · Cebu / Remote')).toBeInTheDocument();
    expect(screen.getByText('2 of 5 steps')).toBeInTheDocument();
  });

  it('displays skill gaps when the user has a target role', async () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner', targetRole: 'Frontend Developer' }));
    api.get.mockImplementation((path) => {
      if (path === '/courses') return Promise.resolve(mockCourses);
      if (path === '/enrollments') return Promise.resolve([]);
      if (path === '/skillgaps') return Promise.resolve(mockSkillGaps);
      if (path === '/assessments/recommended') return Promise.resolve({ skillName: 'JavaScript' });
      return Promise.resolve([]);
    });
    renderOverview();
    expect(await screen.findByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getAllByText(/Gap/)).toHaveLength(3);
  });

  it('renders recommended courses fetched from the backend', async () => {
    renderOverview();
    expect(await screen.findByText('Modern JavaScript for Frontend Work')).toBeInTheDocument();
    expect(screen.getByText('TypeScript from Zero to Confident')).toBeInTheDocument();
    expect(screen.getByText('Frontend Portfolio Sprint')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '→ Enroll free' })).toHaveLength(3);
  });

  it('shows a toast when a course is enrolled', async () => {
    api.post.mockResolvedValue({ courseId: 1, started: '2026-01-01T00:00:00Z' });
    renderOverview();
    const enroll = await screen.findAllByRole('button', { name: '→ Enroll free' });
    fireEvent.click(enroll[0]);
    expect(await screen.findByText(/Course added to your pathway|Enrolled in/)).toBeInTheDocument();
  });
});
