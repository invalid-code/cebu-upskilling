import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';

function ToastProbe() {
  const { toast, showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast('Hello toast')}>Show</button>
      <span data-testid="toast">{toast || ''}</span>
    </div>
  );
}

describe('ToastContext', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('renders children and exposes a toast message', () => {
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    );

    expect(screen.getByText('Show')).toBeInTheDocument();
    expect(screen.getByTestId('toast')).toHaveTextContent('');
  });

  it('shows a message when showToast is called', () => {
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show'));

    expect(screen.getByTestId('toast')).toHaveTextContent('Hello toast');
  });

  it('clears the toast automatically after the timeout', () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show'));
    expect(screen.getByTestId('toast')).toHaveTextContent('Hello toast');

    act(() => vi.advanceTimersByTime(2400));
    expect(screen.getByTestId('toast')).toHaveTextContent('');
  });
});