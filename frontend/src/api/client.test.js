import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './client';

function makeToken(payload) {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${body}.signature`;
}

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 3600;

const API_BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

describe('api client', () => {
  let instances;
  let originalLocation;

  beforeEach(() => {
    instances = [];
    localStorage.clear();
    vi.stubGlobal('XMLHttpRequest', function fakeXHR() {
      this.headers = {};
      this.status = 200;
      this.responseText = '';
      this.opened = { method: null, url: null };
      this.sent = null;
      this.open = (method, url) => {
        this.opened.method = method;
        this.opened.url = url;
      };
      this.setRequestHeader = (key, value) => {
        this.headers[key] = value;
      };
      this.send = (body) => {
        this.sent = body;
      };
      instances.push(this);
    });
    originalLocation = window.location;
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
    vi.unstubAllGlobals();
  });

  const lastRequest = () => instances.at(-1);

  function respond(xhr, { status = 200, body = '' } = {}) {
    xhr.status = status;
    xhr.responseText = body;
    if (typeof xhr.onload === 'function') xhr.onload();
  }

  it('sends GET requests with JSON headers to the API base', () => {
    api.get('/skillgaps');

    const xhr = lastRequest();
    expect(xhr.opened.method).toBe('GET');
    expect(xhr.opened.url).toBe(`${API_BASE}/skillgaps`);
    expect(xhr.headers['Content-Type']).toBe('application/json');
    expect(xhr.sent).toBeUndefined();
  });

  it('resolves with parsed JSON on success', async () => {
    const promise = api.get('/skillgaps');
    respond(lastRequest(), { body: '{"a":1}' });

    await expect(promise).resolves.toEqual({ a: 1 });
  });

  it('resolves with raw text when the body is not JSON', async () => {
    const promise = api.get('/plain');
    respond(lastRequest(), { body: 'hello' });

    await expect(promise).resolves.toBe('hello');
  });

  it('resolves with null on 204 No Content', async () => {
    const promise = api.delete('/posts/1');
    respond(lastRequest(), { status: 204, body: '' });

    await expect(promise).resolves.toBeNull();
  });

  it('rejects with the server error message', async () => {
    const promise = api.get('/fail');
    respond(lastRequest(), { status: 400, body: '{"error":"Bad input"}' });

    await expect(promise).rejects.toThrow('Bad input');
  });

  it('rejects with a generic HTTP error when the body is not JSON', async () => {
    const promise = api.get('/boom');
    respond(lastRequest(), { status: 502, body: '<html>bad gateway</html>' });

    await expect(promise).rejects.toThrow('Server error');
  });

  it('rejects with a network error when the request fails', async () => {
    const promise = api.get('/offline');
    const xhr = lastRequest();
    if (typeof xhr.onerror === 'function') xhr.onerror();

    await expect(promise).rejects.toThrow('Network error');
  });

  it('sends the Authorization header for a valid token', () => {
    localStorage.setItem('token', makeToken({ exp: future }));
    api.get('/courses');

    expect(lastRequest().headers.Authorization).toBe(`Bearer ${localStorage.getItem('token')}`);
  });

  it('clears an expired token and omits the Authorization header', async () => {
    localStorage.setItem('token', makeToken({ exp: past }));
    localStorage.setItem('user', '{}');

    const promise = api.get('/courses');
    respond(lastRequest(), { body: '[]' });
    await promise;

    expect(lastRequest().headers.Authorization).toBeUndefined();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('clears the session and redirects to /login on 401 with a token', async () => {
    localStorage.setItem('token', makeToken({ exp: future }));

    const promise = api.get('/courses');
    respond(lastRequest(), { status: 401, body: '{"error":"Unauthorized"}' });

    await expect(promise).resolves.toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('rejects on 401 when there is no token (failed login)', async () => {
    const promise = api.get('/courses');
    respond(lastRequest(), { status: 401, body: '{"error":"Invalid credentials"}' });

    await expect(promise).rejects.toThrow('Invalid credentials');
    expect(window.location.href).toBe('');
  });

  it('retries once after a silent refresh on 401 when a refresh token exists', async () => {
    const fresh = makeToken({ exp: future, nonce: 'retry-401' });
    localStorage.setItem('token', makeToken({ exp: future }));
    localStorage.setItem('refreshToken', 'rt-1');

    const promise = api.get('/courses');
    respond(lastRequest(), { status: 401, body: '{"error":"Unauthorized"}' });

    // Silent refresh fires synchronously from the 401 handler.
    expect(lastRequest().opened.url).toBe(`${API_BASE}/auth/refresh`);
    expect(lastRequest().sent).toBe('{"refreshToken":"rt-1"}');
    respond(lastRequest(), {
      body: JSON.stringify({ token: fresh, refreshToken: 'rt-2', userId: 'u1', emailAddress: 'a@b.c' }),
    });

    // Retry happens on the next microtask with the rotated pair.
    await new Promise((r) => setTimeout(r, 0));
    expect(lastRequest().opened.url).toBe(`${API_BASE}/courses`);
    expect(lastRequest().headers.Authorization).toBe(`Bearer ${fresh}`);
    respond(lastRequest(), { body: '[]' });

    await expect(promise).resolves.toEqual([]);
    expect(localStorage.getItem('token')).toBe(fresh);
    expect(localStorage.getItem('refreshToken')).toBe('rt-2');
  });

  it('clears the session when the silent refresh fails on 401', async () => {
    localStorage.setItem('token', makeToken({ exp: future }));
    localStorage.setItem('refreshToken', 'rt-stale');
    localStorage.setItem('user', '{}');

    const promise = api.get('/courses');
    respond(lastRequest(), { status: 401, body: '{"error":"Unauthorized"}' });

    expect(lastRequest().opened.url).toBe(`${API_BASE}/auth/refresh`);
    respond(lastRequest(), { status: 401, body: '{"error":"Invalid refresh token"}' });

    await expect(promise).resolves.toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('proactively refreshes an expired access token before sending', async () => {
    const fresh = makeToken({ exp: future, nonce: 'proactive' });
    localStorage.setItem('token', makeToken({ exp: past }));
    localStorage.setItem('refreshToken', 'rt-1');

    const promise = api.get('/courses');

    // First XHR is the proactive refresh, not the data request.
    expect(lastRequest().opened.url).toBe(`${API_BASE}/auth/refresh`);
    respond(lastRequest(), {
      body: JSON.stringify({ token: fresh, refreshToken: 'rt-2' }),
    });

    await new Promise((r) => setTimeout(r, 0));
    expect(lastRequest().opened.url).toBe(`${API_BASE}/courses`);
    expect(lastRequest().headers.Authorization).toBe(`Bearer ${fresh}`);
    respond(lastRequest(), { body: '[]' });

    await expect(promise).resolves.toEqual([]);
  });

  it('stringifies bodies for post, put, and patch', () => {
    api.post('/enrollments', { courseId: 1 });
    expect(lastRequest().opened.method).toBe('POST');
    expect(lastRequest().sent).toBe('{"courseId":1}');

    api.put('/courses/1', { name: 'X' });
    expect(lastRequest().opened.method).toBe('PUT');
    expect(lastRequest().sent).toBe('{"name":"X"}');

    api.patch('/auth/profile', { targetRole: 'Backend' });
    expect(lastRequest().opened.method).toBe('PATCH');
    expect(lastRequest().sent).toBe('{"targetRole":"Backend"}');
  });

  it('does not send a body when the post body is undefined', () => {
    api.post('/logout');
    expect(lastRequest().sent).toBeUndefined();
  });
});