import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import ToastViewport from './Toast';
import { useToastStore } from '../../stores/toastStore';

const show = (...args) => act(() => useToastStore.getState().showToast(...args));

describe('Toast viewport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.getState()._reset();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('is a polite live region and auto-dismisses after 5s', () => {
    render(<ToastViewport />);
    expect(document.querySelector('[aria-live="polite"]')).toBeInTheDocument();
    show('Saved', 'success');
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(4900));
    expect(screen.getByText('Saved')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  it('pauses while the pointer is inside and resumes with remaining time', () => {
    render(<ToastViewport />);
    show('Hover me');
    const item = screen.getByText('Hover me').parentElement;
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.pointerEnter(item);
    act(() => vi.advanceTimersByTime(60000));
    expect(screen.getByText('Hover me')).toBeInTheDocument();
    fireEvent.pointerLeave(item);
    act(() => vi.advanceTimersByTime(1900));
    expect(screen.getByText('Hover me')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(200));
    expect(screen.queryByText('Hover me')).not.toBeInTheDocument();
  });

  it('pauses while focus is within the toast', () => {
    render(<ToastViewport />);
    show('Focus me');
    const button = screen.getByRole('button', { name: /dismiss/i });
    fireEvent.focus(button);
    act(() => vi.advanceTimersByTime(20000));
    expect(screen.getByText('Focus me')).toBeInTheDocument();
    fireEvent.blur(button);
    act(() => vi.advanceTimersByTime(5100));
    expect(screen.queryByText('Focus me')).not.toBeInTheDocument();
  });

  it('renders an empty polite region with no toasts and dismisses manually', () => {
    render(<ToastViewport />);
    const region = document.querySelector('[aria-live="polite"]');
    expect(region).toBeEmptyDOMElement();
    show('One');
    expect(screen.getByText('One')).toBeInTheDocument();
    show('Two', 'error');
    expect(screen.queryByText('One')).not.toBeInTheDocument();
    expect(screen.getByText('Two')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('Two')).not.toBeInTheDocument();
  });

  it('keeps the certificate variant at least 5s and allows manual dismissal', () => {
    render(<ToastViewport />);
    show('Certificate earned', 'certificate');
    act(() => vi.advanceTimersByTime(5000));
    expect(screen.getByText('Certificate earned')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));
    expect(screen.queryByText('Certificate earned')).not.toBeInTheDocument();
  });
});
