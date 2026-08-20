import { describe, it, expect, beforeEach } from 'vitest';
import { decodeJwt, isTokenExpired, hasValidSession } from './jwt';

function makeToken(payload) {
  const body = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_');
  return `header.${body}.signature`;
}

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 3600;

describe('decodeJwt', () => {
  it('returns null for falsy or non-string tokens', () => {
    expect(decodeJwt(null)).toBeNull();
    expect(decodeJwt(undefined)).toBeNull();
    expect(decodeJwt('')).toBeNull();
    expect(decodeJwt(42)).toBeNull();
  });

  it('returns null for tokens without three parts', () => {
    expect(decodeJwt('a.b')).toBeNull();
    expect(decodeJwt('a.b.c.d')).toBeNull();
  });

  it('decodes the JWT payload', () => {
    const payload = decodeJwt(makeToken({ name: 'Jose', exp: future }));
    expect(payload).toEqual({ name: 'Jose', exp: future });
  });

  it('returns null when the payload is not valid JSON', () => {
    const token = `a.${btoa('not json')}.c`;
    expect(decodeJwt(token)).toBeNull();
  });
});

describe('isTokenExpired', () => {
  it('treats tokens without an exp claim as not expired', () => {
    expect(isTokenExpired(makeToken({ name: 'Jose' }))).toBe(false);
  });

  it('returns true for an expired token', () => {
    expect(isTokenExpired(makeToken({ exp: past }))).toBe(true);
  });

  it('returns false for a future exp', () => {
    expect(isTokenExpired(makeToken({ exp: future }))).toBe(false);
  });

  it('applies leeway in seconds', () => {
    const now = Math.floor(Date.now() / 1000);
    const token = makeToken({ exp: now - 10 });
    expect(isTokenExpired(token, 5)).toBe(true);
    expect(isTokenExpired(token, 15)).toBe(false);
  });

  it('returns false for an unparseable token', () => {
    expect(isTokenExpired('not-a-jwt')).toBe(false);
  });
});

describe('hasValidSession', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns true when no token is stored', () => {
    expect(hasValidSession()).toBe(true);
  });

  it('keeps a non-expired token and returns true', () => {
    localStorage.setItem('token', makeToken({ exp: future }));
    localStorage.setItem('user', '{}');
    expect(hasValidSession()).toBe(true);
    expect(localStorage.getItem('token')).not.toBeNull();
    expect(localStorage.getItem('user')).not.toBeNull();
  });

  it('clears an expired token and returns false', () => {
    localStorage.setItem('token', makeToken({ exp: past }));
    localStorage.setItem('user', '{}');
    expect(hasValidSession()).toBe(false);
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });
});