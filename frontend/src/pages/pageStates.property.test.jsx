import { render, screen, waitFor, within, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ApplicationsProvider } from '../context/ApplicationsContext';
import { EnrollmentsProvider } from '../context/EnrollmentsContext';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useToastStore } from '../stores/toastStore';

import OverviewPage from './OverviewPage';
import SkillsPage from './SkillsPage';
import JobsPage from './JobsPage';
import JobDetailPage from './JobDetailPage';
import CoursesPage from './CoursesPage';
import CourseContentPage from './CourseContentPage';
import ApplicationsPage from './ApplicationsPage';
import AssessmentsPage from './AssessmentsPage';
import CredentialsPage from './CredentialsPage';
import CertificateDetailPage from './CertificateDetailPage';
import ProfilePage from './ProfilePage';
import BusinessDashboardPage from './BusinessDashboardPage';
import EditJobPage from './EditJobPage';
import JobApplicationsPage from './JobApplicationsPage';
import CompanyProfileEditPage from './CompanyProfileEditPage';
import CompanyProfilePage from './CompanyProfilePage';
import VerifyCertificatePage from './VerifyCertificatePage';
import CourseManagementPage from './CourseManagementPage';
import ProviderDashboardPage from './ProviderDashboardPage';

const ctl = vi.hoisted(() => ({ respond: () => new Promise(() => {}) }));

vi.mock('../api/client', async (importOriginal) => {
  const actual = await importOriginal();
  const call = (...args) => ctl.respond(...args);
  return {
    ...actual,
    api: {
      get: vi.fn(call),
      post: vi.fn(() => new Promise(() => {})),
      put: vi.fn(() => new Promise(() => {})),
      patch: vi.fn(() => new Promise(() => {})),
      delete: vi.fn(() => new Promise(() => {})),
      upload: vi.fn(() => new Promise(() => {})),
      postForm: vi.fn(() => new Promise(() => {})),
    },
  };
});

import { api } from '../api/client';

/**
 * Feature: frontend-design, Property 10: Page states complete
 * **Validates: Requirements 18.1, 18.2, 18.3, 18.9**
 *
 * Every routed page that fetches data (per App.jsx) renders:
 *   - loading: a Skeleton / busy status region while the request is pending,
 *   - empty:   an EmptyState (or the page's designed inline empty text) for an empty response,
 *   - error:   the request's error message plus a Retry button.
 * Pages that are forms/static (Login, Register, Landing, Help, PostJob, legal pages, NotFound, ...) are not data-bound.
 */

const learner = {
  UserId: 1, userId: 1, firstName: 'Test', lastName: 'Learner', role: 'Learner', targetRole: 'Frontend Developer',
};
const recruiter = {
  UserId: 2, userId: 2, firstName: 'Test', lastName: 'Recruiter', role: 'Recruiter', companyId: 5,
};
const provider = {
  UserId: 3, userId: 3, firstName: 'Test', lastName: 'Provider', role: 'CourseProvider', companyId: 6,
};

const notFound = () => Promise.reject(Object.assign(new Error('Not found'), { status: 404 }));

/**
 * emptyKind:
 *   'state'  - at least one EmptyState element renders
 *   'inline' - the page has no list-level EmptyState; it renders `inlineText` for the empty response
 *   'n/a'    - the page has no empty response (a single record); only loading and error apply
 * emptyActions: expected number of primary controls inside each EmptyState ('one' | 'none').
 */
const PAGES = [
  {
    name: 'OverviewPage', Component: OverviewPage, path: '/dashboard', url: '/dashboard', user: learner,
    emptyKind: 'inline', inlineText: /No skill gaps are open for Frontend Developer/,
    empty: (u) => (u.startsWith('/stats') ? {} : []),
  },
  {
    name: 'SkillsPage', Component: SkillsPage, path: '/skills', url: '/skills', user: learner,
    emptyKind: 'state', emptyActions: 'none', empty: () => [],
  },
  {
    name: 'JobsPage', Component: JobsPage, path: '/jobs', url: '/jobs', user: learner,
    emptyKind: 'state', emptyActions: 'one', empty: () => ({ items: [], total: 0 }),
  },
  {
    name: 'JobDetailPage', Component: JobDetailPage, path: '/jobs/:postId', url: '/jobs/7', user: learner,
    emptyKind: 'n/a', empty: () => [],
  },
  {
    name: 'CoursesPage', Component: CoursesPage, path: '/courses', url: '/courses', user: learner,
    emptyKind: 'state', emptyActions: 'none',
    empty: (u) => (u.startsWith('/coursespage') ? { enrolledCourses: [], recommendedCourses: [], availableCategories: [] } : []),
  },
  {
    name: 'CourseContentPage', Component: CourseContentPage, path: '/courses/:courseId/learn/:lessonId',
    url: '/courses/3/learn/9', user: learner,
    emptyKind: 'state', emptyActions: 'one', empty: () => ({ modules: [], currentLesson: null }),
  },
  {
    name: 'ApplicationsPage', Component: ApplicationsPage, path: '/applications', url: '/applications', user: learner,
    emptyKind: 'state', emptyActions: 'none', empty: () => [],
  },
  {
    name: 'AssessmentsPage', Component: AssessmentsPage, path: '/assessments', url: '/assessments', user: learner,
    emptyKind: 'state', emptyActions: 'none',
    empty: (u) => (u.startsWith('/assessments/available') ? { assessments: [], matchPercent: 0, verifiedSkillsCount: 0, recommendedCount: 0 } : []),
  },
  {
    name: 'CredentialsPage', Component: CredentialsPage, path: '/credentials', url: '/credentials', user: learner,
    emptyKind: 'state', emptyActions: 'none', empty: () => [],
  },
  {
    name: 'CertificateDetailPage', Component: CertificateDetailPage, path: '/credentials/:certificateId',
    url: '/credentials/c1', user: learner, emptyKind: 'n/a', empty: () => null,
  },
  {
    name: 'ProfilePage', Component: ProfilePage, path: '/profile', url: '/profile', user: learner,
    emptyKind: 'inline', inlineText: /No parsed skills yet/, empty: () => [],
  },
  {
    name: 'BusinessDashboardPage', Component: BusinessDashboardPage, path: '/business-dashboard',
    url: '/business-dashboard', user: recruiter, emptyKind: 'state', emptyActions: 'none',
    empty: () => ({ company: {}, talentPool: {}, jobPostings: [], skillDemand: [] }),
  },
  {
    name: 'EditJobPage', Component: EditJobPage, path: '/edit-job/:postId', url: '/edit-job/7', user: recruiter,
    emptyKind: 'n/a', empty: () => null,
  },
  {
    name: 'JobApplicationsPage', Component: JobApplicationsPage, path: '/job-applications',
    url: '/job-applications', user: recruiter, emptyKind: 'state', emptyActions: 'one', empty: () => [],
  },
  {
    name: 'CompanyProfileEditPage', Component: CompanyProfileEditPage, path: '/company-profile',
    url: '/company-profile', user: recruiter, emptyKind: 'n/a', empty: () => null,
  },
  {
    name: 'CourseManagementPage (list)', Component: CourseManagementPage, path: '/company-courses',
    url: '/company-courses', user: recruiter, emptyKind: 'state', emptyActions: 'one', empty: () => [],
  },
  {
    name: 'CourseManagementPage (edit)', Component: CourseManagementPage, path: '/company-courses/:courseId/edit',
    url: '/company-courses/4/edit', user: recruiter, emptyKind: 'n/a', empty: () => null,
  },
  {
    name: 'ProviderDashboardPage', Component: ProviderDashboardPage, path: '/provider-dashboard',
    url: '/provider-dashboard', user: provider, emptyKind: 'state', emptyActions: 'one', empty: () => [],
  },
  {
    name: 'CompanyProfilePage', Component: CompanyProfilePage, path: '/companies/:companyId', url: '/companies/5',
    user: null, emptyKind: 'inline', inlineText: /no job posts available/i,
    empty: (u) => (u.endsWith('/posts') ? { items: [] } : { companyId: 5, name: 'Acme Cebu' }),
  },
  {
    name: 'VerifyCertificatePage', Component: VerifyCertificatePage, path: '/verify/:serialNumber',
    url: '/verify/CU-1', user: null, emptyKind: 'state', emptyActions: 'one', empty: notFound,
    // Requirement 10.7 defines fixed copy for every verification failure (network, timeout, 5xx).
    fixedError: 'Verification could not be completed',
  },
];

const loadingRegion = (container) => container.querySelector('[role="status"][aria-busy="true"], .skeleton');
const controlsIn = (el) => el.querySelectorAll('button, a[href]').length;

function renderPage(page) {
  localStorage.clear();
  if (page.user) localStorage.setItem('user', JSON.stringify(page.user));
  const { Component } = page;
  return render(
    <MemoryRouter initialEntries={[page.url]}>
      <AuthProvider>
        <EnrollmentsProvider>
          <ApplicationsProvider>
            <ToastProvider>
              <Routes>
                <Route path={page.path} element={<Component />} />
              </Routes>
            </ToastProvider>
          </ApplicationsProvider>
        </EnrollmentsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

function useMode(page, mode, message = 'Service temporarily unavailable') {
  ctl.respond = (url) => {
    const path = String(url);
    if (mode === 'loading') return new Promise(() => {});
    if (mode === 'error') return Promise.reject(new Error(message));
    return Promise.resolve(page.empty(path));
  };
}

async function expectErrorState(container, message) {
  const alert = await waitFor(() => {
    const found = [...container.querySelectorAll('[role="alert"]')].find((el) => el.textContent.includes(message));
    expect(found, `an alert containing "${message}"`).toBeTruthy();
    return found;
  });
  expect(within(alert).getByRole('button', { name: /^retry$/i })).toBeInTheDocument();
}

beforeEach(() => {
  vi.clearAllMocks();
  useApplicationsStore.getState()._reset();
  useToastStore.getState()._reset();
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Property 10: page states complete', () => {
  it('covers every data-bound routed page', () => {
    expect(api.get).toBeDefined();
    expect(PAGES.length).toBeGreaterThanOrEqual(19);
  });

  describe.each(PAGES)('$name', (page) => {
    it('shows a Skeleton while data is loading', async () => {
      useMode(page, 'loading');
      const { container } = renderPage(page);
      await waitFor(() => expect(loadingRegion(container)).toBeTruthy());
      expect(container.querySelector('.empty-state')).toBeNull();
      expect(container.querySelector('[role="alert"]')).toBeNull();
    });

    it('shows an EmptyState (or designed empty text) for an empty response', async () => {
      if (page.emptyKind === 'n/a') return;
      useMode(page, 'empty');
      const { container } = renderPage(page);
      if (page.emptyKind === 'inline') {
        expect(await screen.findByText(page.inlineText)).toBeInTheDocument();
        return;
      }
      await waitFor(() => expect(container.querySelector('.empty-state')).toBeTruthy());
      const empties = [...container.querySelectorAll('.empty-state')];
      empties.forEach((el) => {
        expect(el.textContent.trim().length).toBeGreaterThan(0);
        expect(controlsIn(el)).toBeLessThanOrEqual(1);
      });
      if (page.emptyActions === 'one') {
        expect(empties.some((el) => controlsIn(el) === 1)).toBe(true);
      }
    });

    it('shows the error message and a Retry button when the request fails', async () => {
      useMode(page, 'error', 'Service temporarily unavailable');
      const { container } = renderPage(page);
      await expectErrorState(container, page.fixedError ?? 'Service temporarily unavailable');
    });
  });

  it('error state always surfaces the request error message with Retry (any message, any page)', async () => {
    const message = fc.stringMatching(/^[A-Za-z][A-Za-z ]{6,28}[A-Za-z]$/).filter((s) => !s.includes('  '));
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...PAGES), message, async (page, text) => {
        useMode(page, 'error', text);
        const { container, unmount } = renderPage(page);
        try {
          await expectErrorState(container, page.fixedError ?? text);
        } finally {
          unmount();
          cleanup();
        }
      }),
      { numRuns: 100 },
    );
  }, 120000);
});
