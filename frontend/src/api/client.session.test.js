import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, setApiNavigator } from './client';
import { _resetOfflineRetry } from './offlineRetry';
import { useOfflineStore } from '../stores/offlineStore';
import { useRateLimitStore } from '../stores/rateLimitStore';

// Gap-filling coverage for 401 replay-once, 403 dashboards, single-flight refresh,
// SPA navigation hook and connectivity-return retry timing (Requirement 25.1).
describe('api client session handling (gaps)', () => {
  let instances;
  let originalLocation;
  let logSpy;

  beforeEach(() => {
    instances = [];
    localStorage.clear();
    _resetOfflineRetry();
    useRateLimitStore.getState()._reset();
    vi.stubGlobal('XMLHttpRequest', function fakeXHR() {
      this.status = 200;
      this.responseText = '';
      this.open = (m, u) => {
        this.method = m;
        this.url = u;
      };
      this.setRequestHeader = () => {};
      this.send = () => {};
      instances.push(this);
    });
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '', pathname: '/jobs', search: '' },
    });
    logSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    setApiNavigator(null);
    _resetOfflineRetry();
    vi.useRealTimers();
    logSpy.mockRestore();
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation });
    vi.unstubAllGlobals();
  });

  const last = () => instances.at(-1);
  const respond = (xhr, status, body = '{}') => {
    xhr.status = status;
    xhr.responseText = body;
    xhr.onload();
  };
  const refreshCalls = () => instances.filter((x) => x.url.endsWith('/auth/refresh'));
  const tick = () => new Promise((r) => setTimeout(r, 0));

  it('replays once: a second 401 after a successful refresh signs out without refreshing again', async () => {
    localStorage.setItem('token', 'a.b.c');
    localStorage.setItem('refreshToken', 'rt');
    const promise = api.get('/skills', { bypassCache: true });
    respond(last(), 401);
    respond(last(), 200, JSON.stringify({ token: 'n.e.w', refreshToken: 'rt2' }));
    await tick();
    expect(last().url).toMatch(/\/skills$/);
    respond(last(), 401); // replay rejected too

    await expect(promise).resolves.toBeNull();
    expect(instances).toHaveLength(3); // original, refresh, single replay
    expect(refreshCalls()).toHaveLength(1);
    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe(`/login?returnTo=${encodeURIComponent('/jobs')}`);
  });

  it('shares one refresh call between concurrent 401s', async () => {
    localStorage.setItem('token', 'a.b.c');
    localStorage.setItem('refreshToken', 'rt');
    const p1 = api.get('/skills', { bypassCache: true });
    const p2 = api.get('/courses', { bypassCache: true });
    respond(instances[0], 401);
    respond(instances[1], 401);
    expect(refreshCalls()).toHaveLength(1);
    respond(refreshCalls()[0], 200, JSON.stringify({ token: 'n.e.w', refreshToken: 'rt2' }));
    await tick();
    respond(instances[3], 200, '[]');
    respond(instances[4], 200, '[]');
    await expect(Promise.all([p1, p2])).resolves.toEqual([[], []]);
  });

  it('does not refresh when the 401 comes from the refresh endpoint itself', async () => {
    localStorage.setItem('token', 'a.b.c');
    localStorage.setItem('refreshToken', 'rt');
    const promise = api.post('/auth/refresh', {});
    respond(last(), 401);
    await expect(promise).resolves.toBeNull();
    expect(instances).toHaveLength(1);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('does not redirect to /login again when already on /login', async () => {
    window.location.pathname = '/login';
    localStorage.setItem('token', 'a.b.c');
    const promise = api.get('/skills', { bypassCache: true });
    respond(last(), 401);
    await promise;
    expect(window.location.href).toBe('');
  });

  it('redirects through the SPA navigator when one is registered', async () => {
    const nav = vi.fn();
    setApiNavigator(nav);
    localStorage.setItem('token', 'a.b.c');
    const promise = api.get('/skills', { bypassCache: true });
    respond(last(), 401);
    await promise;
    expect(nav).toHaveBeenCalledWith(`/login?returnTo=${encodeURIComponent('/jobs')}`);
    expect(window.location.href).toBe('');
  });

  it.each([
    ['Learner', '/dashboard'],
    ['CourseProvider', '/provider-dashboard'],
    ['Recruiter', '/business-dashboard'],
  ])('403 sends a %s to %s', async (role, dash) => {
    localStorage.setItem('user', JSON.stringify({ role }));
    const caught = api.get('/forbidden', { bypassCache: true }).catch((e) => e);
    respond(last(), 403);
    expect((await caught).status).toBe(403);
    expect(window.location.href).toBe(dash);
  });

  it('403 does not navigate when already on the own dashboard or when signed out', async () => {
    localStorage.setItem('user', JSON.stringify({ role: 'Learner' }));
    window.location.pathname = '/dashboard';
    let caught = api.get('/forbidden', { bypassCache: true }).catch((e) => e);
    respond(last(), 403);
    await caught;
    expect(window.location.href).toBe('');

    localStorage.clear();
    window.location.pathname = '/jobs';
    caught = api.get('/forbidden2', { bypassCache: true }).catch((e) => e);
    respond(last(), 403);
    await caught;
    expect(window.location.href).toBe('');
  });

  it('429 rejects with the 10 second wait message', async () => {
    const caught = api.post('/auth/login', {}).catch((e) => e);
    respond(last(), 429);
    const err = await caught;
    expect(err.status).toBe(429);
    expect(err.message).toMatch(/10 seconds/);
  });

  it('retries within 5 seconds once connectivity returns', async () => {
    vi.useFakeTimers();
    const nav = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    try {
      const caught = api.get('/skills', { bypassCache: true }).catch((e) => e);
      last().onerror();
      await caught;
      await vi.advanceTimersByTimeAsync(60000);
      expect(instances).toHaveLength(1); // waits for connectivity, no blind retries

      nav.mockReturnValue(true);
      window.dispatchEvent(new Event('online'));
      await vi.advanceTimersByTimeAsync(4999);
      expect(instances).toHaveLength(2);
      respond(last(), 200, '[]');
      await vi.advanceTimersByTimeAsync(0);
      expect(useOfflineStore.getState().offline).toBe(false);
    } finally {
      nav.mockRestore();
    }
  });

  it('never writes tokens to the console', async () => {
    const spies = ['log', 'debug', 'info', 'warn', 'error'].map((k) => vi.spyOn(console, k).mockImplementation(() => {}));
    localStorage.setItem('token', 'secret.access.token');
    localStorage.setItem('refreshToken', 'secret-refresh');
    const promise = api.get('/skills', { bypassCache: true });
    respond(last(), 401);
    respond(last(), 401);
    await promise;
    const output = JSON.stringify(spies.flatMap((s) => s.mock.calls));
    expect(output).not.toMatch(/secret/);
    spies.forEach((s) => s.mockRestore());
  });
});
