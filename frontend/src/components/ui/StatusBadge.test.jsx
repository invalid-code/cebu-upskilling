import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import StatusBadge from './StatusBadge';

describe('StatusBadge', () => {
  it('renders "Saved" for the default status', () => {
    render(<StatusBadge />);
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('renders "Under review" for review status', () => {
    render(<StatusBadge status="review" />);
    expect(screen.getByText('Under review')).toBeInTheDocument();
  });

  it('renders "Interview" for interview status', () => {
    render(<StatusBadge status="interview" />);
    expect(screen.getByText('Interview')).toBeInTheDocument();
  });

  it('applies the status as a class name', () => {
    render(<StatusBadge status="interview" />);
    expect(screen.getByText('Interview')).toHaveClass('status interview');
  });
});
