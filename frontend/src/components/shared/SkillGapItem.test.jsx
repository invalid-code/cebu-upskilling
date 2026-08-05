import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SkillGapItem from './SkillGapItem';

describe('SkillGapItem', () => {
  it('renders the skill name, subtitle and gap label', () => {
    render(<SkillGapItem name="JavaScript" subtitle="Required 4 · Current 3" percent={75} gapLabel="Gap 1" />);
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Required 4 · Current 3')).toBeInTheDocument();
    expect(screen.getByText('Gap 1')).toBeInTheDocument();
  });

  it('shows a Verified tag when verified', () => {
    render(<SkillGapItem name="React" subtitle="Required 4" percent={100} gapLabel="Ready" verified />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('does not show a Verified tag when not verified', () => {
    render(<SkillGapItem name="React" subtitle="Required 4" percent={100} gapLabel="Ready" />);
    expect(screen.queryByText('Verified')).not.toBeInTheDocument();
  });
});
