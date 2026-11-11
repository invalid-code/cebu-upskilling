import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { LearnerRoute, RecruiterRoute, CourseProviderRoute, CourseStudioRoute } from '../components/RoleRoute';
import { navItemsFor, canAccessPath } from './navItems';

const labels = (user) => navItemsFor(user).map((g) => g.label);

describe('navItemsFor', () => {
  it('returns [] for null, missing or unknown roles', () => {
    expect(navItemsFor(null)).toEqual([]);
    expect(navItemsFor(undefined)).toEqual([]);
    expect(navItemsFor({})).toEqual([]);
    expect(navItemsFor({ role: 'Admin' })).toEqual([]);
    expect(navItemsFor({ role: '' })).toEqual([]);
  });

  it('returns My pathway then Account for Learner', () => {
    expect(labels({ role: 'Learner' })).toEqual(['My pathway', 'Account']);
  });

  it('returns Employer tools for Recruiter', () => {
    expect(labels({ role: 'Recruiter' })).toEqual(['Employer tools']);
  });

  it('returns Provider studio for CourseProvider', () => {
    expect(labels({ role: 'CourseProvider' })).toEqual(['Provider studio']);
  });

  it('only includes items allowed by the role guard and no empty groups', () => {
    for (const role of ['Learner', 'Recruiter', 'CourseProvider']) {
      const user = { role };
      const groups = navItemsFor(user);
      for (const g of groups) {
        expect(g.items.length).toBeGreaterThan(0);
        for (const item of g.items) expect(canAccessPath(user, item.to)).toBe(true);
      }
    }
  });
});

function renderGuard(role, element) {
  localStorage.setItem('user', JSON.stringify({ firstName: 'T', role }));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <AuthProvider>
        <Routes>
          <Route path="/dashboard" element={<>LearnerHome</>} />
          <Route path="/business-dashboard" element={<>RecruiterHome</>} />
          <Route path="/provider-dashboard" element={<>ProviderHome</>} />
          <Route path="/protected" element={element}>
            <Route index element={<div>PageContent</div>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('route guards redirect to own dashboard without rendering content', () => {
  const home = { Learner: 'LearnerHome', Recruiter: 'RecruiterHome', CourseProvider: 'ProviderHome' };
  const cases = [
    ['LearnerRoute', <LearnerRoute />, ['Recruiter', 'CourseProvider']],
    ['RecruiterRoute', <RecruiterRoute />, ['Learner', 'CourseProvider']],
    ['CourseProviderRoute', <CourseProviderRoute />, ['Learner', 'Recruiter']],
    ['CourseStudioRoute', <CourseStudioRoute />, ['Learner']],
  ];
  for (const [name, el, blocked] of cases) {
    for (const role of blocked) {
      it(`${name} sends ${role} to ${home[role]}`, () => {
        const { unmount } = renderGuard(role, el);
        expect(screen.getByText(home[role])).toBeInTheDocument();
        expect(screen.queryByText('PageContent')).not.toBeInTheDocument();
        unmount();
      });
    }
  }
});
