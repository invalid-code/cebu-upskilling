import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Clock } from 'lucide-react';
import StatCard from './StatCard';

describe('StatCard', () => {
  it('renders the value and label', () => {
    render(<StatCard value="4.5h" label="learning time" />);
    expect(screen.getByText('4.5h')).toBeInTheDocument();
    expect(screen.getByText('learning time')).toBeInTheDocument();
  });

  it('renders an icon when provided', () => {
    const { container } = render(<StatCard value="2" label="courses active" icon={Clock} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});
