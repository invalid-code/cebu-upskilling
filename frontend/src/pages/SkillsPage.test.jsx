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
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
  });

  it('renders all assessed skills and their levels', () => {
    renderSkills();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Communication')).toBeInTheDocument();
  });

  it('marks verified skills with a Verified tag', () => {
    renderSkills();
    expect(screen.getAllByText('Verified')).toHaveLength(2);
  });

  it('shows a toast when Assess a skill is clicked', () => {
    renderSkills();
    fireEvent.click(screen.getByRole('button', { name: 'Assess a skill' }));
    expect(screen.getByText('Assessment flow opened')).toBeInTheDocument();
  });
});
