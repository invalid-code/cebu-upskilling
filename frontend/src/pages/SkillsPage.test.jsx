import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import { ApplicationsProvider } from '../context/ApplicationsContext';
import SkillsPage from './SkillsPage';
import { api } from '../api/client';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

function renderSkills() {
  return render(
    <ToastProvider>
      <AuthProvider>
        <ApplicationsProvider>
          <SkillsPage />
        </ApplicationsProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

describe('SkillsPage', () => {
  beforeEach(() => {
    localStorage.removeItem('job_applications_1');
  });

  it('renders the skill profile', () => {
    renderSkills();
    expect(screen.getByRole('heading', { name: 'Skill profile' })).toBeInTheDocument();
    expect(screen.getByText('Target role')).toBeInTheDocument();
  });

  it('shows the target role prompt when no target role is set', () => {
    renderSkills();
    expect(screen.getByText('Target role')).toBeInTheDocument();
    expect(screen.getByText(/Choose a target role so we can show the skills you need/)).toBeInTheDocument();
  });

  it('shows the proficiency scale legend', () => {
    renderSkills();
    expect(screen.getByText('1 · No Knowledge')).toBeInTheDocument();
    expect(screen.getByText('5 · Expert')).toBeInTheDocument();
  });

  it('shows an empty state when no skills are assessed', () => {
    renderSkills();
    expect(screen.getByText('Apply for a job to see required skills')).toBeInTheDocument();
  });

  it('shows the assessed skills empty state once the learner has applied for a job', async () => {
    localStorage.setItem('user', JSON.stringify({
      UserId: 1,
      firstName: 'Test',
      role: 'Learner',
      targetRole: 'Frontend Developer',
    }));
    localStorage.setItem('token', 'abc');
    api.get.mockImplementation((path) =>
      path === '/applications' ? Promise.resolve([{ postId: 1 }]) : Promise.resolve([]));
    renderSkills();
    expect(await screen.findByText('No assessed skills yet')).toBeInTheDocument();
  });

  it('shows a toast when Assess a skill is clicked', () => {
    renderSkills();
    fireEvent.click(screen.getByRole('button', { name: 'Assess a skill' }));
    expect(screen.getByText('Assessment flow opened')).toBeInTheDocument();
  });

  it('displays the learner address in the target role card', () => {
    localStorage.setItem('user', JSON.stringify({
      UserId: 1,
      firstName: 'Test',
      role: 'Learner',
      targetRole: 'Frontend Developer',
      address: '123 Main St',
    }));
    localStorage.setItem('token', 'abc');
    api.get.mockResolvedValue([]);
    renderSkills();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('123 Main St · On-site')).toBeInTheDocument();
  });
});