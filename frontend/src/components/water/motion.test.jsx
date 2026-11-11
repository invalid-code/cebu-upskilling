import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import WaveDivider from './WaveDivider';
import TideTransition from './TideTransition';
import Button from '../ui/Button';

function mockReduced(reduced) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  delete window.matchMedia;
});

describe('WaveDivider', () => {
  it('has two decorative layers that drift under normal motion', () => {
    mockReduced(false);
    render(<WaveDivider tone="surface" />);
    const el = screen.getByTestId('wave-divider');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el.querySelectorAll('svg')).toHaveLength(2);
    expect(el).toHaveAttribute('data-frozen', 'false');
  });

  it('is frozen and flips when requested', () => {
    mockReduced(true);
    render(<WaveDivider flip />);
    const el = screen.getByTestId('wave-divider');
    expect(el).toHaveAttribute('data-frozen', 'true');
    expect(el.style.transform).toBe('scaleY(-1)');
  });
});

describe('TideTransition', () => {
  it('animates under normal motion and remounts on key change', () => {
    mockReduced(false);
    const { rerender } = render(<TideTransition transitionKey="a"><p>one</p></TideTransition>);
    const first = screen.getByText('one').parentElement;
    expect(first).toHaveAttribute('data-tide', 'animated');
    rerender(<TideTransition transitionKey="b"><p>two</p></TideTransition>);
    expect(screen.getByText('two').parentElement).not.toBe(first);
  });

  it('does not animate when reduced', () => {
    mockReduced(true);
    render(<TideTransition transitionKey="a"><p>one</p></TideTransition>);
    expect(screen.getByText('one').parentElement).toHaveAttribute('data-tide', 'reduced');
  });
});

describe('useRipple on primary Button', () => {
  it('adds a ripple on press and removes it after 450ms', () => {
    mockReduced(false);
    render(<Button>Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' });
    fireEvent.pointerDown(btn, { clientX: 5, clientY: 5, button: 0 });
    expect(btn.querySelectorAll('[data-ripple]')).toHaveLength(1);
    act(() => { vi.advanceTimersByTime(500); });
    expect(btn.querySelectorAll('[data-ripple]')).toHaveLength(0);
  });

  it('flashes opacity for 120ms with no ripple element when reduced', () => {
    mockReduced(true);
    render(<Button>Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' });
    fireEvent.pointerDown(btn, { button: 0 });
    expect(btn.querySelectorAll('[data-ripple]')).toHaveLength(0);
    expect(btn).toHaveAttribute('data-flash');
    act(() => { vi.advanceTimersByTime(130); });
    expect(btn).not.toHaveAttribute('data-flash');
  });

  it('does not ripple on non-primary buttons', () => {
    mockReduced(false);
    render(<Button variant="secondary">Go</Button>);
    const btn = screen.getByRole('button', { name: 'Go' });
    fireEvent.pointerDown(btn, { button: 0 });
    expect(btn.querySelectorAll('[data-ripple]')).toHaveLength(0);
  });
});
