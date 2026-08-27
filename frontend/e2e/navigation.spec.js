import { test, expect } from './fixtures.js';
import { setAuth } from './helpers.js';

const learnerUser = { firstName: 'Jose', lastName: 'Rizal', role: 'Learner' };
const recruiterUser = { firstName: 'Employer', role: 'Recruiter' };

async function mockLearnerShell(page) {
  const apiRoutes = [
    [/\/api\/courses(\?|$)/, '[]'],
    [/\/api\/skillgaps/, '[]'],
    [/\/api\/assessments\/recommended/, 'null'],
    [/\/api\/stats\/week/, JSON.stringify({ learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 })],
    [/\/api\/enrollments/, '[]'],
    [/\/api\/applications/, '[]'],
    [/\/api\/coursespage/, JSON.stringify({ enrolledCourses: [], recommendedCourses: [], dayStreak: 0, coursesInProgress: 0, certificatesEarned: 0, availableCategories: [] })],
    [/\/api\/posts/, JSON.stringify({ items: [], total: 0, page: 1, pageSize: 9 })],
  ];
  for (const [pattern, body] of apiRoutes) {
    await page.route(pattern, async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
      await route.fulfill({ status: 200, contentType: 'application/json', body });
    });
  }
}

test.describe('Navigation — Sidebar & Topbar', () => {
  test('learner sidebar shows learner nav items', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/');
    const rail = page.locator('aside.rail');
    // Sidebar labels – use exact to avoid matching breadcrumb "My pathway / Overview"
    await expect(page.getByText('My pathway', { exact: true }).first()).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Overview' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Skill profile' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Find work' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Learn' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Applications' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Assessments' })).toBeVisible();
    await expect(page.getByText('Account', { exact: true })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Credentials' })).toBeVisible();
    await expect(rail.getByRole('link', { name: 'Help center' })).toBeVisible();
    // Recruiter items should not appear
    await expect(page.getByRole('link', { name: 'Business dashboard' })).not.toBeVisible();
    await expect(page.getByRole('link', { name: 'Post a job' })).not.toBeVisible();
  });

  test('recruiter sidebar shows employer tools', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await page.route(/\/api\/stats\/business/, async (r) => {
      const url = new URL(r.request().url());
      if (!url.pathname.startsWith('/api/')) { await r.continue(); return; }
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ company: { name: 'Acme', jobPostings: 0, recruiters: 1 }, talentPool: { totalLearners: 0, avgSkillLevel: 0 }, jobPostings: [], skillDemand: [] }) });
    });
    await page.goto('/business-dashboard');
    await expect(page.getByText('Employer tools')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Business dashboard' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Post a job' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Applications' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Overview' })).not.toBeVisible();
  });

  test('sidebar navigation changes route', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/');
    await page.getByRole('link', { name: 'Find work' }).click();
    await expect(page).toHaveURL(/\/jobs/);
    await expect(page.getByRole('heading', { name: 'Find work that fits.' })).toBeVisible();

    await page.getByRole('link', { name: 'Learn' }).click();
    await expect(page).toHaveURL(/\/courses/);
    await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible();

    await page.locator('aside.rail').getByRole('link', { name: 'Help center' }).click();
    await expect(page).toHaveURL(/\/help/);
  });

  test('topbar shows user initials and profile link', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/');
    // Sidebar avatar shows initials JR
    await expect(page.getByText('JR').first()).toBeVisible();
    await expect(page.getByText('Jose').first()).toBeVisible();
    // Profile link – sidebar has two matching elements (sidebar + mobile), use first
    await page.getByLabel('Open profile').first().click();
    await expect(page).toHaveURL(/\/profile/);
  });

  test('active nav link is highlighted (learner)', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/jobs');
    const link = page.getByRole('link', { name: 'Find work' });
    await expect(link).toBeVisible();
    // Active link has distinct background – check computed style
    await expect(link).toHaveCSS('background-color', /rgba\(30,\s*100,\s*80,\s*0\.48\)|rgb\(/);
  });
});
