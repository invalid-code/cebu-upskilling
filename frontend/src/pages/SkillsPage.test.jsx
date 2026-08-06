import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider } from '../context/ToastContext';
import { AuthProvider } from '../context/AuthContext';
import SkillsPage from './SkillsPage';

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
        <SkillsPage />
      </AuthProvider>
    </ToastProvider>
  );
}

describe('SkillsPage', () => {
  it('renders the skill profile', () => {
    renderSkills();
    expect(screen.getByRole('heading', { name: 'Skill profile' })).toBeInTheDocument();
    expect(screen.getByText('Target role')).toBeInTheDocument();
  });

  it('shows radio options when no target role is set', () => {
    renderSkills();
    expect(screen.getByRole('radio', { name: 'Frontend Developer' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Backend Developer' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Other' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('allows selecting a target role', () => {
    renderSkills();
    fireEvent.click(screen.getByRole('radio', { name: 'Data Analyst' }));
    expect(screen.getByRole('radio', { name: 'Data Analyst' })).toBeChecked();
  });

  it('shows the proficiency scale legend', () => {
    renderSkills();
    expect(screen.getByText('1 · No Knowledge')).toBeInTheDocument();
    expect(screen.getByText('5 · Expert')).toBeInTheDocument();
  });

  it('shows an empty state when no skills are assessed', () => {
    renderSkills();
    expect(screen.getByText('No assessed skills yet')).toBeInTheDocument();
  });

  it('shows a toast when Assess a skill is clicked', () => {
    renderSkills();
    fireEvent.click(screen.getByRole('button', { name: 'Assess a skill' }));
    expect(screen.getByText('Assessment flow opened')).toBeInTheDocument();
  });
});