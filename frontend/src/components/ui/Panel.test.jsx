import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Panel from './Panel';

describe('Panel', () => {
  it('renders its children', () => {
    render(<Panel>Content</Panel>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies the panel class name', () => {
    const { container } = render(<Panel />);
    expect(container.querySelector('.panel')).toBeInTheDocument();
  });
});
