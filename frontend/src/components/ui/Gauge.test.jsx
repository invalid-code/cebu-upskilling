import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Gauge from './Gauge';

describe('Gauge', () => {
  it('shows the percent label', () => {
    render(<Gauge percent={78} />);
    expect(screen.getByText('78%')).toBeInTheDocument();
  });

  it('defaults to 0 percent', () => {
    render(<Gauge />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });
});
