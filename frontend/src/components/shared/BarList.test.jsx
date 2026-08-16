import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import BarList from './BarList';

describe('BarList', () => {
  it('renders labels, values, sublabels, and proportional bars', () => {
    const { container } = render(<BarList title="Skill demand" items={[
      { label: 'JavaScript', value: 4, sublabel: 'Four roles' },
      { label: 'React', value: 2 },
    ]} />);

    expect(screen.getByText('Skill demand')).toBeInTheDocument();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Four roles')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(container.querySelector('[aria-label="React: 2"] > div')).toHaveStyle({ width: '50%' });
  });
});
