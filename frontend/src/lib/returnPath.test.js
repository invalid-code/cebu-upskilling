import { describe, it, expect } from 'vitest';
import { loginUrlFor, resolvePostLoginPath } from './returnPath';

const learner = { role: 'Learner' };
const recruiter = { role: 'Recruiter' };
const provider = { role: 'CourseProvider' };
const q = (v) => `?returnTo=${encodeURIComponent(v)}`;

describe('loginUrlFor', () => {
  it('preserves path and query', () => {
    expect(loginUrlFor({ pathname: '/profile', search: '?tab=a' })).toBe(
      `/login?returnTo=${encodeURIComponent('/profile?tab=a')}`,
    );
  });

  it('uses plain /login for the root path', () => {
    expect(loginUrlFor({ pathname: '/', search: '' })).toBe('/login');
    expect(loginUrlFor(undefined)).toBe('/login');
  });
});

describe('resolvePostLoginPath', () => {
  it('honours a permitted return path including its query', () => {
    expect(resolvePostLoginPath(learner, q('/jobs?skill=react'))).toBe('/jobs?skill=react');
    expect(resolvePostLoginPath(recruiter, q('/post-job'))).toBe('/post-job');
    expect(resolvePostLoginPath(provider, q('/company-courses/new'))).toBe('/company-courses/new');
  });

  it('honours /profile and /help for all three roles', () => {
    for (const user of [learner, recruiter, provider]) {
      expect(resolvePostLoginPath(user, q('/profile'))).toBe('/profile');
      expect(resolvePostLoginPath(user, q('/help'))).toBe('/help');
    }
  });

  it('falls back to the role dashboard when the path is not permitted for the role', () => {
    expect(resolvePostLoginPath(learner, q('/business-dashboard'))).toBe('/dashboard');
    expect(resolvePostLoginPath(recruiter, q('/skills'))).toBe('/business-dashboard');
    expect(resolvePostLoginPath(provider, q('/post-job'))).toBe('/provider-dashboard');
    expect(resolvePostLoginPath(learner, q('/provider-dashboard'))).toBe('/dashboard');
  });

  it('falls back for unknown paths and look-alike prefixes', () => {
    expect(resolvePostLoginPath(learner, q('/nope'))).toBe('/dashboard');
    expect(resolvePostLoginPath(learner, q('/jobsearch'))).toBe('/dashboard');
  });

  it('falls back when returnTo is missing or empty', () => {
    expect(resolvePostLoginPath(learner, '')).toBe('/dashboard');
    expect(resolvePostLoginPath(recruiter)).toBe('/business-dashboard');
    expect(resolvePostLoginPath(learner, '?returnTo=')).toBe('/dashboard');
  });

  it('rejects external, protocol-relative, backslash and scheme values', () => {
    for (const bad of ['https://evil.example/jobs', '//evil.example/jobs', '/\\evil.example', 'javascript:alert(1)', 'jobs']) {
      expect(resolvePostLoginPath(learner, q(bad))).toBe('/dashboard');
    }
  });
});
