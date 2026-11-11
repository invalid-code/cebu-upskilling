import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import LiquidMeter from './LiquidMeter';
import ProgressBar from '../ui/ProgressBar';

describe('LiquidMeter', () => {
  afterEach(() => vi.restoreAllMocks());

  it('prints the rounded percentage and exposes the label as accessible name', () => {
    render(<LiquidMeter value={72.5} label="Course progress" />);
    expect(screen.getByText('73%')).toBeInTheDocument();
    expect(screen.getByRole('meter', { name: 'Course progress' })).toBeInTheDocument();
  });

  it.each([undefined, null, NaN])('shows an em dash, never 0%, for %s', (value) => {
    render(<LiquidMeter value={value} label="Skill" />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0%')).toBeNull();
  });

  it.each([undefined, '', '   '])('logs an error and renders nothing for label %j', (label) => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { container } = render(<LiquidMeter value={50} label={label} />);
    expect(container).toBeEmptyDOMElement();
    expect(spy).toHaveBeenCalled();
  });

  it.each(['bar', 'vessel', 'ring'])('renders the %s variant with its text', (variant) => {
    render(<LiquidMeter value={40} label="X" variant={variant} tone="warn" />);
    expect(screen.getByText('40%')).toBeInTheDocument();
  });
});

describe('ProgressBar wrapper', () => {
  it('shows an em dash when percent is missing or NaN', () => {
    const { rerender } = render(<ProgressBar />);
    expect(screen.getByText('—')).toBeInTheDocument();
    rerender(<ProgressBar percent={NaN} />);
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0%')).toBeNull();
  });
});
