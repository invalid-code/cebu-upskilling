import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import PathwayStep from './PathwayStep';

describe('PathwayStep', () => {
  it('renders the step number and title', () => {
    render(<PathwayStep step={1} title="Set your target role" description="Pick a role" />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('Set your target role')).toBeInTheDocument();
    expect(screen.getByText('Pick a role')).toBeInTheDocument();
  });

  it('shows a checkmark for completed steps', () => {
    render(<PathwayStep step={2} title="Map skills" description="x" completed />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('marks the current step with the current class', () => {
    const { container } = render(
      <PathwayStep step={3} title="Close gaps" description="x" current />,
    );
    expect(container.querySelector('.path-step')).toHaveClass('current');
  });
});
