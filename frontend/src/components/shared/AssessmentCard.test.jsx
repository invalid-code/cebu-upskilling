import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AssessmentCard from './AssessmentCard';

const baseProps = {
  skillId: 1,
  skillName: 'JavaScript',
  category: 'Lang',
  currentLevel: 2,
  currentLevelLabel: 'Working',
  targetLevel: 3,
  targetLevelLabel: 'Advanced',
  gap: 1,
  hasAssessment: false,
  questionCount: 5,
  timeLimitMinutes: 10,
  sourceLabel: 'AI-generated',
  companyName: null,
  proctored: true,
  isRecommended: true,
  isSkillAssessment: true,
  onStart: vi.fn(),
};

describe('AssessmentCard', () => {
  it('renders the skill name, tags and meta', () => {
    render(<AssessmentCard {...baseProps} />);

    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Recommended next')).toBeInTheDocument();
    expect(screen.getByText('Skill verifier')).toBeInTheDocument();
    expect(screen.getByText('Proctored')).toBeInTheDocument();
    expect(screen.getByText('5 questions')).toBeInTheDocument();
    expect(screen.getByText('10 min')).toBeInTheDocument();
  });

  it('renders the gap-closing description when there is a gap', () => {
    render(<AssessmentCard {...baseProps} />);

    expect(screen.getByText(/Close your 1 level gap for Advanced/)).toBeInTheDocument();
    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('renders the reached-target description when the gap is zero', () => {
    render(<AssessmentCard {...baseProps} gap={0} hasAssessment />);

    expect(screen.getByText(/You've reached the target level/)).toBeInTheDocument();
    expect(screen.getByText('Retake')).toBeInTheDocument();
  });

  it('shows the "establish your level" message when there is no target', () => {
    render(<AssessmentCard {...baseProps} targetLevel={0} />);

    expect(screen.getByText('Take the assessment to establish your level.')).toBeInTheDocument();
  });

  it('shows the Start button and calls onStart with skill details', () => {
    const onStart = vi.fn();
    render(<AssessmentCard {...baseProps} onStart={onStart} />);

    fireEvent.click(screen.getByRole('button', { name: /Start/ }));

    expect(onStart).toHaveBeenCalledWith(1, 'JavaScript');
  });

  it('shows Retake when an assessment already exists', () => {
    render(<AssessmentCard {...baseProps} hasAssessment />);

    expect(screen.getByRole('button', { name: /Retake/ })).toBeInTheDocument();
  });

  it('renders the company tag when a company name is provided', () => {
    render(<AssessmentCard {...baseProps} companyName="Acme Corp" sourceLabel="Company" />);

    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });
});