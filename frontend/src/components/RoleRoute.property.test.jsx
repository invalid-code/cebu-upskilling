import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import fc from 'fast-check';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider, getDashboardPath } from '../context/AuthContext';
import { LearnerRoute, RecruiterRoute, CourseProviderRoute, CourseStudioRoute } from './RoleRoute';

/**
 * Feature: frontend-design, Property 1: Role isolation
 * **Validates: Requirements 1.2, 1.3**
 */

const ROLES = ['Learner', 'Recruiter', 'CourseProvider'];

// Guarded paths, grouped by guard. `allowed` lists the roles the guard lets through.
const GUARDED = [
  { Guard: LearnerRoute, allowed: ['Learner'], paths: ['/learner-a', '/learner-b'] },
  { Guard: RecruiterRoute, allowed: ['Recruiter'], paths: ['/recruiter-a', '/recruiter-b'] },
  { Guard: CourseProviderRoute, allowed: ['CourseProvider'], paths: ['/provider-a', '/provider-b'] },
  { Guard: CourseStudioRoute, allowed: ['Recruiter', 'CourseProvider'], paths: ['/studio-a', '/studio-b'] },
];

const DASHBOARDS = ['/dashboard', '/business-dashboard', '/provider-dashboard'];

const FOREIGN_CASES = ROLES.flatMap((role) =>
  GUARDED.filter((g) => !g.allowed.includes(role)).flatMap((g) => g.paths.map((path) => ({ role, path }))),
);

function Location() {
  const { pathname } = useLocation();
  return <div data-testid="location">{pathname}</div>;
}

function renderAs(role, path) {
  localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role }));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Location />
        <Routes>
          {DASHBOARDS.map((d) => (
            <Route key={d} path={d} element={<div>{`dashboard:${d}`}</div>} />
          ))}
          {GUARDED.map(({ Guard, paths }) => (
            <Route key={paths[0]} element={<Guard />}>
              {paths.map((p) => (
                <Route key={p} path={p} element={<div>{`page:${p}`}</div>} />
              ))}
            </Route>
          ))}
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Property 1: Role isolation', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('foreign-guarded paths end at the role dashboard with no foreign page content', () => {
    expect(FOREIGN_CASES.length).toBeGreaterThan(0);
    fc.assert(
      fc.property(fc.constantFrom(...FOREIGN_CASES), ({ role, path }) => {
        const expected = getDashboardPath({ role });
        renderAs(role, path);

        const ok =
          screen.getByTestId('location').textContent === expected &&
          screen.queryByText(`dashboard:${expected}`) !== null &&
          document.body.textContent.includes('page:') === false;

        cleanup();
        return ok;
      }),
      { numRuns: 100 },
    );
  });

  it('a role is not redirected on its own guarded paths', () => {
    const own = ROLES.flatMap((role) =>
      GUARDED.filter((g) => g.allowed.includes(role)).flatMap((g) => g.paths.map((path) => ({ role, path }))),
    );
    fc.assert(
      fc.property(fc.constantFrom(...own), ({ role, path }) => {
        renderAs(role, path);
        const ok = screen.queryByText(`page:${path}`) !== null;
        cleanup();
        return ok;
      }),
      { numRuns: 100 },
    );
  });
});
