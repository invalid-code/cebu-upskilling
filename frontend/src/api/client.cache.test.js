import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from './client';

function makeToken(payload) {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${body}.signature`;
}

const future = Math.floor(Date.now() / 1000) + 3600;

describe('api client GET cache', () => {
  let instances;

  beforeEach(() => {
    instances = [];
    localStorage.clear();
    sessionStorage.clear();
    api._clearCache();
    vi.stubGlobal('XMLHttpRequest', function fakeXHR() {
      this.headers = {};
      this.status = 200;
      this.responseText = '';
      this.listeners = {};
      this.open = (method, url) => {
        this.opened = { method, url };
      };
      this.setRequestHeader = (key, value) => {
        this.headers[key] = value;
      };
      this.addEventListener = (type, fn) => {
        this.listeners[type] = fn;
      };
      this.removeEventListener = () => {};
      this.abort = () => {
        if (typeof this.onabort === 'function') this.onabort();
      };
      this.send = () => {
        instances.push(this);
      };
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function respond(xhr, { status = 200, body = '' } = {}) {
    xhr.status = status;
    xhr.responseText = body;
    if (typeof xhr.onload === 'function') xhr.onload();
  }

  it('coalesces concurrent identical GETs into a single request', async () => {
    const p1 = api.get('/posts');
    const p2 = api.get('/posts');
    expect(instances.length).toBe(1);
    respond(instances[0], { body: '{"items":[]}' });
    await expect(p1).resolves.toEqual({ items: [] });
    await expect(p2).resolves.toEqual({ items: [] });
  });

  it('re-issues a coalesced GET when the originating caller aborts (StrictMode remount)', async () => {
    const first = new AbortController();
    const p1 = api.get('/courses', { signal: first.signal });
    const second = new AbortController();
    const p2 = api.get('/courses', { signal: second.signal });
    first.abort();
    await expect(p1).rejects.toMatchObject({ name: 'AbortError' });
    await vi.waitFor(() => expect(instances.length).toBe(2));
    respond(instances[1], { body: '[1]' });
    await expect(p2).resolves.toEqual([1]);
  });

  it('does not hand an aborted request to a caller that arrives after the abort', async () => {
    const first = new AbortController();
    const p1 = api.get('/courses', { signal: first.signal });
    first.abort();
    const p2 = api.get('/courses');
    expect(instances.length).toBe(2);
    respond(instances[1], { body: '[2]' });
    await expect(p1).rejects.toMatchObject({ name: 'AbortError' });
    await expect(p2).resolves.toEqual([2]);
  });

  it('serves a repeated GET from memory without a new request', async () => {
    const first = api.get('/skills');
    respond(instances[0], { body: '{"a":1}' });
    await expect(first).resolves.toEqual({ a: 1 });

    await expect(api.get('/skills')).resolves.toEqual({ a: 1 });
    expect(instances.length).toBe(1);
  });

  it('scopes the cache per session token', async () => {
    localStorage.setItem('token', makeToken({ exp: future }));
    const first = api.get('/skills');
    respond(instances[0], { body: '{"a":1}' });
    await first;

    localStorage.setItem('token', `${makeToken({ exp: future })}-other`);
    const second = api.get('/skills');
    expect(instances.length).toBe(2);
    respond(instances[1], { body: '{"a":2}' });
    await expect(second).resolves.toEqual({ a: 2 });
  });

  it('evicts the cache after a successful mutation', async () => {
    const first = api.get('/applications');
    respond(instances[0], { body: '[]' });
    await first;
    expect(instances.length).toBe(1);

    const posted = api.post('/applications', { postId: 1 });
    respond(instances[1], { body: '{}' });
    await posted;

    const second = api.get('/applications');
    expect(instances.length).toBe(3);
    respond(instances[2], { body: '[]' });
    await second;
  });

  it('skips the cache when bypassCache is set', async () => {
    const first = api.get('/posts');
    respond(instances[0], { body: '{"v":1}' });
    await first;

    const second = api.get('/posts', { bypassCache: true });
    expect(instances.length).toBe(2);
    respond(instances[1], { body: '{"v":2}' });
    await expect(second).resolves.toEqual({ v: 2 });
  });

  it('never caches auth endpoints', async () => {
    const first = api.get('/auth/profile');
    respond(instances[0], { body: '{"ok":true}' });
    await first;

    const second = api.get('/auth/profile');
    expect(instances.length).toBe(2);
    respond(instances[1], { body: '{"ok":true}' });
    await second;
  });

  it('never caches failed responses', async () => {
    const first = api.get('/boom');
    respond(instances[0], { status: 500, body: '{}' });
    await expect(first).rejects.toThrow();

    const second = api.get('/boom');
    expect(instances.length).toBe(2);
    respond(instances[1], { status: 500, body: '{}' });
    await expect(second).rejects.toThrow();
  });

  it('persists catalog reads to session storage across memory clears', async () => {
    const first = api.get('/posts');
    respond(instances[0], { body: '{"items":[1]}' });
    await expect(first).resolves.toEqual({ items: [1] });

    api._clearMemoryCache();
    await expect(api.get('/posts')).resolves.toEqual({ items: [1] });
    expect(instances.length).toBe(1);
  });

  it('does not persist write-heavy lists to session storage', async () => {
    const first = api.get('/applications');
    respond(instances[0], { body: '[]' });
    await first;

    api._clearMemoryCache();
    const second = api.get('/applications');
    expect(instances.length).toBe(2);
    respond(instances[1], { body: '[]' });
    await second;
  });
});
