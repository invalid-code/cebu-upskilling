import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastProvider } from '../context/ToastContext';
import SkillsPage from './SkillsPage';

function renderSkills() {
  return render(
    <ToastProvider>
      <SkillsPage />
    </ToastProvider>,
  );
}

describe('SkillsPage', () => {
  it('renders the skill profile', () => {
    renderSkills();
    expect(screen.getByRole('heading', { name: 'Skill profile' })).toBeInTheDocument();
    expect(screen.getByText('No target role set')).toBeInTheDocument();
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
