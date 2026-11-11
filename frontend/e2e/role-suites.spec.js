import { test, expect } from './fixtures.js';
import { mockApi } from './helpers.js';

/**
 * Role suites (Requirement 25.3): for each in-scope role, sign in through the
 * real login form (API mocked), land on the role's dashboard, visit every item
 * in that role's navigation and assert the browser logged zero console errors
 * at every step.
 *
 * The navigation list is read from `src/lib/navItems.js` (navItemsFor) inside
 * the page, so Vite resolves `import.meta.env` and the module graph exactly as
 * the app does and this spec can never drift from the real nav.
 */

const ROLES = [
  {
    name: 'Learner',
    login: { token: 'learner-token', firstName: 'Jose', lastName: 'Rizal', role: 'Learner' },
    dashboard: '/dashboard',
  },
  {
    name: 'Recruiter',
    login: { token: 'recruiter-token', firstName: 'Maria', lastName: 'Santos', role: 'Recruiter', companyId: 1 },
    dashboard: '/business-dashboard',
  },
  {
    name: 'CourseProvider',
    login: { token: 'provider-token', firstName: 'Paolo', lastName: 'Reyes', role: 'CourseProvider' },
    dashboard: '/provider-dashboard',
  },
];

const emptyBusinessStats = {
  company: { name: 'Acme Corp', jobPostings: 0, recruiters: 1 },
  talentPool: { totalLearners: 0, avgSkillLevel: 0 },
  jobPostings: [],
  skillDemand: [],
};

/** Collect console messages of type 'error' (and uncaught page errors). */
function trackConsoleErrors(page) {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()} @ ${msg.location().url}`);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

async function loadNavPaths(page, user) {
  const paths = await page.evaluate(async (u) => {
    const { navItemsFor } = await import('/src/lib/navItems.js');
    return navItemsFor(u).flatMap((g) => g.items.map((i) => i.to));
  }, user);
  return [...new Set(paths)];
}

for (const role of ROLES) {
  test.describe(`Role suite — ${role.name}`, () => {
    test(`login, ${role.dashboard} and every nav item without console errors`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      const step = (label) => expect(errors, `console errors after: ${label}`).toEqual([]);

      await mockApi(page, {
        'POST /api/auth/login': role.login,
        'GET /api/stats/business': emptyBusinessStats,
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
        'GET /api/courses': [],
        'GET /api/enrollments': [],
        'GET /api/skillgaps': [],
        'GET /api/applications': [],
      });

      // Login
      await page.goto('/login');
      await page.getByPlaceholder('Email address').fill(`${role.name.toLowerCase()}@example.com`);
      await page.getByPlaceholder('Password', { exact: true }).fill('secret123');
      await page.getByRole('button', { name: 'Sign in' }).click();

      // Lands on the role dashboard
      await expect(page).toHaveURL(new RegExp(`${role.dashboard}$`));
      await expect(page.locator('main#main-content')).toBeVisible();
      await page.waitForLoadState('networkidle');
      step(`login -> ${role.dashboard}`);

      // Every nav item for this role (source of truth: navItemsFor)
      const paths = await loadNavPaths(page, role.login);
      expect(paths.length).toBeGreaterThan(0);
      expect(paths).toContain(role.dashboard);

      for (const to of paths) {
        const link = page.locator(`a[href="${to}"]`).first();
        await expect(link, `nav link ${to} present`).toBeAttached();
        // Click the real nav link when visible (desktop rail); the mobile layout
        // is covered by other suites.
        if (await link.isVisible()) await link.click();
        else await page.goto(to);

        await expect(page).toHaveURL(new RegExp(`${to.replace(/[/-]/g, '\\$&')}(\\?.*)?$`));
        await expect(page.locator('main#main-content')).toBeVisible();
        await page.waitForLoadState('networkidle');
        step(`visit ${to}`);
      }
    });
  });
}
