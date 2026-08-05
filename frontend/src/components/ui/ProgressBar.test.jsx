import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('renders the percent as the fill width', () => {
    const { container } = render(<ProgressBar percent={75} />);
    const fill = container.querySelector('.bar i');
    expect(fill).toHaveStyle({ width: '75%' });
  });

  it('clamps percent above 100 to 100', () => {
    const { container } = render(<ProgressBar percent={150} />);
    const fill = container.querySelector('.bar i');
    expect(fill).toHaveStyle({ width: '100%' });
  });

  it('clamps percent below 0 to 0', () => {
    const { container } = render(<ProgressBar percent={-20} />);
    const fill = container.querySelector('.bar i');
    expect(fill).toHaveStyle({ width: '0%' });
  });

  it('defaults to 0 percent', () => {
    const { container } = render(<ProgressBar />);
    const fill = container.querySelector('.bar i');
    expect(fill).toHaveStyle({ width: '0%' });
  });
});
