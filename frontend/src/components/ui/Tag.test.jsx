import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Tag from './Tag';

describe('Tag', () => {
  it('renders its children', () => {
    render(<Tag>Free</Tag>);
    expect(screen.getByText('Free')).toBeInTheDocument();
  });

  it('uses the default variant by default', () => {
    render(<Tag>Free</Tag>);
    expect(screen.getByText('Free')).toHaveStyle({ background: 'var(--teal-soft)' });
  });

  it('applies a custom variant', () => {
    render(<Tag variant="good">Verified</Tag>);
    expect(screen.getByText('Verified')).toHaveStyle({ background: 'rgb(210, 240, 220)' });
  });
});
