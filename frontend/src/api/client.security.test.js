import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './client';

function makeToken(payload) {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${body}.signature`;
}
const future = Math.floor(Date.now() / 1000) + 3600;

describe('api client security hardening', () => {
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
      this.listeners = {};
      this.open = (method, url) => {
        this.opened.method = method;
        this.opened.url = url;
      };
      this.setRequestHeader = (k, v) => { this.headers[k] = v; };
      this.send = (body) => { this.sent = body; };
      this.addEventListener = (type, cb) => {
        this.listeners[type] = this.listeners[type] || [];
        this.listeners[type].push(cb);
      };
      this.removeEventListener = (type, cb) => {
        if (!this.listeners[type]) return;
        this.listeners[type] = this.listeners[type].filter((fn) => fn !== cb);
      };
      this.abort = () => {
        if (typeof this.onabort === 'function') this.onabort();
      };
      instances.push(this);
    });
    originalLocation = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { href: '' } });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, writable: true, value: originalLocation });
    vi.unstubAllGlobals();
  });

  const lastRequest = () => instances.at(-1);
  function respond(xhr, { status = 200, body = '' } = {}) {
    xhr.status = status;
    xhr.responseText = body;
    if (typeof xhr.onload === 'function') xhr.onload();
  }

  // ---- Friendly error mapping (prevents stack leak, aids UX) ----
  it('maps 429 to friendly rate-limit message when body is generic', async () => {
    const promise = api.get('/limited');
    respond(lastRequest(), { status: 429, body: '{"error":"HTTP 429"}' });
    await expect(promise).rejects.toThrow('Too many requests');
  });

  it('preserves server 429 message when already friendly', async () => {
    const promise = api.get('/limited');
    respond(lastRequest(), { status: 429, body: '{"error":"Too many requests — slow down"}' });
    await expect(promise).rejects.toThrow('Too many requests — slow down');
  });

  it('maps 403 to permission message when generic', async () => {
    const promise = api.get('/forbidden');
    respond(lastRequest(), { status: 403, body: '{}' });
    await expect(promise).rejects.toThrow("You don’t have permission");
  });

  it('maps 404 to not-found message when generic', async () => {
    const promise = api.get('/missing');
    respond(lastRequest(), { status: 404, body: '{}' });
    await expect(promise).rejects.toThrow('Not found');
  });

  it('maps 500 to server error when generic', async () => {
    const promise = api.get('/boom');
    respond(lastRequest(), { status: 500, body: '{}' });
    await expect(promise).rejects.toThrow('Server error');
  });

  it('maps unknown HTTP fallback to Request failed', async () => {
    const promise = api.get('/teapot');
    respond(lastRequest(), { status: 418, body: '{}' });
    await expect(promise).rejects.toThrow('Request failed');
  });

  // ---- Abort signal ----
  it('aborts via AbortController signal', async () => {
    const controller = new AbortController();
    const promise = api.get('/slow', { signal: controller.signal });
    // before respond, abort
    controller.abort();
    // fake XHR abort triggers onabort
    lastRequest().abort();
    await expect(promise).rejects.toThrow();
  });

  it('rejects immediately if signal already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const promise = api.get('/slow', { signal: controller.signal });
    await expect(promise).rejects.toThrow('Aborted');
  });

  // ---- Upload hardening ----
  it('sends Authorization header on upload for valid token', async () => {
    localStorage.setItem('token', makeToken({ exp: future }));
    const file = new File(['hello'], 'video.mp4', { type: 'video/mp4' });
    const promise = api.upload('/media/lessons/1/video', file);
    expect(lastRequest().headers.Authorization).toMatch(/^Bearer /);
    respond(lastRequest(), { status: 201, body: '{"url":"https://cdn.example/video.mp4"}' });
    await expect(promise).resolves.toEqual({ url: 'https://cdn.example/video.mp4' });
  });

  it('clears expired token and omits Authorization on upload', async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    localStorage.setItem('token', makeToken({ exp: past }));
    localStorage.setItem('user', '{}');
    const file = new File(['hello'], 'video.mp4', { type: 'video/mp4' });
    const promise = api.upload('/media/lessons/1/video', file);
    expect(lastRequest().headers.Authorization).toBeUndefined();
    respond(lastRequest(), { status: 201, body: '{"url":"https://cdn.example/video.mp4"}' });
    await promise;
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('clears session and redirects to /login on 401 upload with token', async () => {
    localStorage.setItem('token', makeToken({ exp: future }));
    const file = new File(['hello'], 'video.mp4', { type: 'video/mp4' });
    const promise = api.upload('/media/lessons/1/video', file);
    respond(lastRequest(), { status: 401, body: '{"error":"expired"}' });
    await expect(promise).resolves.toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/login');
  });

  it('maps 413 file too large on upload', async () => {
    localStorage.setItem('token', makeToken({ exp: future }));
    const file = new File(['x'], 'big.mp4', { type: 'video/mp4' });
    const promise = api.upload('/media/lessons/1/video', file);
    respond(lastRequest(), { status: 413, body: '{"error":"payload too large"}' });
    await expect(promise).rejects.toThrow('File too large');
  });

  it('maps 429 on upload to rate-limit message', async () => {
    const file = new File(['x'], 'v.mp4', { type: 'video/mp4' });
    const promise = api.upload('/media/lessons/1/video', file);
    respond(lastRequest(), { status: 429, body: '{}' });
    await expect(promise).rejects.toThrow('Too many requests');
  });

  it('rejects when upload response missing url', async () => {
    const file = new File(['x'], 'v.mp4', { type: 'video/mp4' });
    const promise = api.upload('/media/lessons/1/video', file);
    respond(lastRequest(), { status: 201, body: '{}' });
    await expect(promise).rejects.toThrow('Upload did not complete');
  });

  it('rejects on network error during upload', async () => {
    const file = new File(['x'], 'v.mp4', { type: 'video/mp4' });
    const promise = api.upload('/media/lessons/1/video', file);
    const xhr = lastRequest();
    if (typeof xhr.onerror === 'function') xhr.onerror();
    await expect(promise).rejects.toThrow('Network error');
  });

  it('maps generic upload 500 to server error', async () => {
    const file = new File(['x'], 'v.mp4', { type: 'video/mp4' });
    const promise = api.upload('/media/lessons/1/video', file);
    respond(lastRequest(), { status: 500, body: '{}' });
    await expect(promise).rejects.toThrow('Server error');
  });
});
