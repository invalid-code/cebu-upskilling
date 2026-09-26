import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ToastProvider, useToast } from './ToastContext';

function ToastProbe() {
  const { toast, showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast('Hello toast')}>Show</button>
      <button onClick={() => showToast('Saved failed', 'error')}>Show error</button>
      <span data-testid="toast">{toast?.message || ''}</span>
      <span data-testid="variant">{toast?.variant || ''}</span>
    </div>
  );
}

describe('ToastContext', () => {
  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  beforeEach(() => {
    localStorage.removeItem('notifications');
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
    expect(screen.getByTestId('variant')).toHaveTextContent('info');
  });

  it('keeps the variant so the notification feed can style it', () => {
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    );

    fireEvent.click(screen.getByText('Show error'));

    expect(screen.getByTestId('toast')).toHaveTextContent('Saved failed');
    expect(screen.getByTestId('variant')).toHaveTextContent('error');
  });

  it('is announced politely via a status live region', () => {
    render(
      <ToastProvider>
        <ToastProbe />
      </ToastProvider>,
    );

    const region = document.querySelector('.toast');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toHaveAttribute('aria-live', 'polite');
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
