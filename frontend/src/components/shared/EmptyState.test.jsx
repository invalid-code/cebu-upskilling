import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import EmptyState from './EmptyState';

describe('EmptyState', () => {
  it('renders the title and description', () => {
    render(<EmptyState title="No data" description="Add some data" />);

    expect(screen.getByText('No data')).toBeInTheDocument();
    expect(screen.getByText('Add some data')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <EmptyState title="No data">
        <button>Create one</button>
      </EmptyState>,
    );

    expect(screen.getByRole('button', { name: 'Create one' })).toBeInTheDocument();
  });

  it('renders without an optional title or description', () => {
    const { container } = render(<EmptyState />);

    expect(container.querySelector('.empty-state')).toBeInTheDocument();
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });
});