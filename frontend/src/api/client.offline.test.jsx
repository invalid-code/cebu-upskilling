import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { api } from './client';
import { _resetOfflineRetry, retryOffline } from './offlineRetry';
import { useOfflineStore } from '../stores/offlineStore';
import { useRateLimitStore } from '../stores/rateLimitStore';
import OfflineBanner from '../components/shared/OfflineBanner';

describe('api client offline / status handling', () => {
  let instances;
  let originalLocation;

  beforeEach(() => {
    instances = [];
    localStorage.clear();
    _resetOfflineRetry();
    useRateLimitStore.getState()._reset();
    vi.stubGlobal('XMLHttpRequest', function fakeXHR() {
      this.status = 200;
      this.responseText = '';
      this.open = () => {};
      this.setRequestHeader = () => {};
      this.send = () => {};
      instances.push(this);
    });
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', pathname: '/jobs', search: '?q=react&token=abc' },
    });
  });

  afterEach(() => {
    _resetOfflineRetry();
    vi.useRealTimers();
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation });
    vi.unstubAllGlobals();
  });

  const last = () => instances.at(-1);
  const respond = (xhr, status, body = '{}') => {
    xhr.status = status;
    xhr.responseText = body;
    xhr.onload();
  };

  it('sets offline state, retries, and clears the banner when a retry succeeds', async () => {
    vi.useFakeTimers();
    const promise = api.get('/skills', { bypassCache: true });
    const caught = promise.catch((e) => e);
    last().onerror();
    expect((await caught).status).toBe(0);
    expect(useOfflineStore.getState().offline).toBe(true);

    await vi.advanceTimersByTimeAsync(2000);
    expect(instances).toHaveLength(2);
    respond(last(), 200, '[]');
    await vi.advanceTimersByTimeAsync(0);
    expect(useOfflineStore.getState().offline).toBe(false);
  });

  it('stops after 3 automatic retries, keeps the banner and allows a manual retry', async () => {
    vi.useFakeTimers();
    const caught = api.get('/skills', { bypassCache: true }).catch((e) => e);
    last().onerror();
    await caught;

    for (let i = 0; i < 3; i++) {
      await vi.advanceTimersByTimeAsync(2000);
      last().onerror();
      await vi.advanceTimersByTimeAsync(0);
    }
    expect(instances).toHaveLength(4);
    expect(useOfflineStore.getState().failed).toBe(true);
    await vi.advanceTimersByTimeAsync(20000);
    expect(instances).toHaveLength(4);

    retryOffline();
    await vi.advanceTimersByTimeAsync(0);
    expect(instances).toHaveLength(5);
    respond(last(), 200, '[]');
    await vi.advanceTimersByTimeAsync(0);
    expect(useOfflineStore.getState().offline).toBe(false);
  });

  it('renders the banner text and manual retry after failures', async () => {
    render(<OfflineBanner />);
    expect(screen.queryByText("You're offline")).toBeNull();
    act(() => useOfflineStore.getState().setOffline());
    expect(screen.getByText("You're offline")).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    act(() => useOfflineStore.getState().setFailed());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    act(() => useOfflineStore.getState().setOnline());
    expect(screen.queryByText("You're offline")).toBeNull();
  });

  it('starts a 10 second submit cooldown on 429', async () => {
    vi.useFakeTimers();
    const caught = api.post('/auth/login', {}).catch((e) => e);
    respond(last(), 429, '{}');
    await caught;
    expect(useRateLimitStore.getState().active).toBe(true);
    vi.advanceTimersByTime(9999);
    expect(useRateLimitStore.getState().active).toBe(true);
    vi.advanceTimersByTime(1);
    expect(useRateLimitStore.getState().active).toBe(false);
  });

  it('403 sends a signed-in user to their own dashboard', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Recruiter' }));
    const caught = api.get('/admin', { bypassCache: true }).catch((e) => e);
    respond(last(), 403);
    await caught;
    expect(window.location.href).toBe('/business-dashboard');
  });

  it('401 with failed refresh clears tokens and redirects with a token-free return path', async () => {
    localStorage.setItem('token', 'a.b.c');
    localStorage.setItem('refreshToken', 'rt');
    const promise = api.get('/skills', { bypassCache: true });
    respond(last(), 401);
    respond(last(), 401); // refresh fails
    await promise;
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(window.location.href).toBe(`/login?returnTo=${encodeURIComponent('/jobs?q=react')}`);
    expect(window.location.href).not.toMatch(/abc|a\.b\.c|rt$/);
  });

  it('does not sign out when the refresh request hits a network error', async () => {
    vi.useFakeTimers();
    localStorage.setItem('token', 'a.b.c');
    localStorage.setItem('refreshToken', 'rt');
    const caught = api.get('/skills', { bypassCache: true }).catch((e) => e);
    respond(last(), 401);
    last().onerror(); // refresh network error
    expect((await caught).status).toBe(0);
    expect(localStorage.getItem('refreshToken')).toBe('rt');
    expect(window.location.href).toBe('');
    expect(useOfflineStore.getState().offline).toBe(true);
  });
});
