import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures.js';
import { mockApi, setAuth, fakeJwt } from './helpers.js';

/**
 * Accessibility scans (Requirements 21.1, 25.4): every page is scanned with
 * axe-core in the light theme, the dark theme and with
 * `reducedMotion: 'reduce'`. Any violation of impact serious or critical fails.
 * The API is mocked; unmocked GETs resolve to empty payloads.
 */

const THEME_KEY = 'theme'; // themeStore.js STORAGE_KEY ('light' | 'dark')

const USERS = {
  Learner: { firstName: 'Jose', lastName: 'Rizal', role: 'Learner', emailAddress: 'jose@example.com', targetRole: '' },
  Recruiter: { firstName: 'Maria', lastName: 'Santos', role: 'Recruiter', emailAddress: 'maria@example.com', companyId: 1 },
  CourseProvider: { firstName: 'Paolo', lastName: 'Reyes', role: 'CourseProvider', emailAddress: 'paolo@example.com' },
};

const PAGES = [
  // public (visitor)
  { group: 'public', path: '/' },
  { group: 'public', path: '/login' },
  { group: 'public', path: '/register' },
  { group: 'public', path: '/forgot-password' },
  { group: 'public', path: '/reset-password?token=abc&email=a%40b.co' },
  { group: 'public', path: '/confirm-email?token=abc&email=a%40b.co' },
  { group: 'public', path: '/privacy' },
  { group: 'public', path: '/terms' },
  { group: 'public', path: '/companies/1' },
  { group: 'public', path: '/verify/CERT-0001' },
  { group: 'public', path: '/no-such-page' },
  // learner
  ...[
    '/dashboard',
    '/skills',
    '/jobs',
    '/jobs/1',
    '/courses',
    '/courses/1/learn',
    '/applications',
    '/assessments',
    '/credentials',
    '/credentials/1',
  ].map((path) => ({ group: 'Learner', path })),
  // recruiter
  ...['/business-dashboard', '/post-job', '/edit-job/1', '/job-applications', '/company-profile'].map((path) => ({
    group: 'Recruiter',
    path,
  })),
  // provider
  ...['/provider-dashboard', '/company-courses', '/company-courses/new', '/company-courses/1/edit'].map((path) => ({
    group: 'CourseProvider',
    path,
  })),
  // shared (all three roles)
  ...['Learner', 'Recruiter', 'CourseProvider'].flatMap((group) =>
    ['/profile', '/help'].map((path) => ({ group, path, shared: true })),
  ),
];

const MODES = [
  { name: 'light', theme: 'light', reducedMotion: 'no-preference' },
  { name: 'dark', theme: 'dark', reducedMotion: 'no-preference' },
  { name: 'reduced-motion', theme: 'light', reducedMotion: 'reduce' },
];

async function mockEverything(page) {
  await mockApi(page, {
    'GET /api/stats/business': {
      company: { name: 'Acme Corp', jobPostings: 0, recruiters: 1 },
      talentPool: { totalLearners: 0, avgSkillLevel: 0 },
      jobPostings: [],
      skillDemand: [],
    },
    'GET /api/stats/week': { learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 },
    'GET /api/assessments/recommended': null,
    'GET /api/coursespage': {
      enrolledCourses: [],
      recommendedCourses: [],
      dayStreak: 0,
      coursesInProgress: 0,
      certificatesEarned: 0,
      availableCategories: [],
    },
    'GET /api/posts': { items: [], total: 0, page: 1, pageSize: 9 },
    'GET /api/certificates/verify/': { status: 404, body: { message: 'Not found' } },
  });
}

// Keep failure output small: no video/screenshot/trace artefacts for scans.
test.use({ video: 'off', screenshot: 'off', trace: 'off' });

const seen = new Set();
for (const mode of MODES) {
  test.describe(`a11y — ${mode.name}`, () => {
    test.use({ reducedMotion: mode.reducedMotion });

    for (const p of PAGES) {
      test(`${p.group}${p.shared ? ' (shared)' : ''} ${p.path}`, async ({ page }) => {
        seen.add(p.path);
        await page.addInitScript(
          ([key, theme]) => localStorage.setItem(key, theme),
          [THEME_KEY, mode.theme],
        );
        await mockEverything(page);
        if (p.group !== 'public') {
          await setAuth(page, { user: USERS[p.group], token: fakeJwt() });
        }

        await page.goto(p.path);
        await expect(page.locator('body')).toBeVisible();
        await page.waitForLoadState('networkidle');
        // let TideTransition / entrance animations settle so contrast is measured on final colours
        await page.waitForTimeout(500);

        const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark')
          || document.documentElement.dataset.theme === 'dark');
        if (mode.theme === 'dark') expect(isDark, 'dark theme applied').toBe(true);

        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
          .analyze();
        const blocking = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
        const summary = blocking.map(
          (v) =>
            `[${v.impact}] ${v.id}: ${v.help}\n` +
            v.nodes.slice(0, 5).map((n) => `    ${n.target.join(' ')}  ${n.failureSummary?.split('\n')[1] ?? ''}`).join('\n'),
        );
        expect(blocking.length, `axe violations on ${p.path} (${mode.name}):\n${summary.join('\n')}`).toBe(0);
      });
    }
  });
}
