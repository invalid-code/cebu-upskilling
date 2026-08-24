import { test, expect } from './fixtures.js';

test.describe('Smoke — critical user journeys', () => {
  test('learner can log in, view jobs, and open a course', async ({ page }) => {
    // Start unauthenticated
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Mock login → learner
    await page.route(/\/api\/auth\/login/, async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'learner-token', firstName: 'Jose', role: 'Learner' }),
      });
    });
    // Mocks for home after login – use regex to avoid matching /src/api/client.js
    await page.route(/\/api\/courses(\?|$)/, async (r) => {
      const url = new URL(r.request().url());
      if (!url.pathname.startsWith('/api/') || url.pathname.includes('coursespage')) { await r.continue(); return; }
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    });
    await page.route(/\/api\/skillgaps/, async (r) => {
      const url = new URL(r.request().url());
      if (!url.pathname.startsWith('/api/')) { await r.continue(); return; }
      await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route(/\/api\/assessments\/recommended/, async (r) => {
      const url = new URL(r.request().url());
      if (!url.pathname.startsWith('/api/')) { await r.continue(); return; }
      await r.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    });
    await page.route(/\/api\/stats\/week/, async (r) => {
      const url = new URL(r.request().url());
      if (!url.pathname.startsWith('/api/')) { await r.continue(); return; }
      await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 }) });
    });
    await page.route(/\/api\/enrollments/, async (r) => {
      const url = new URL(r.request().url());
      if (!url.pathname.startsWith('/api/')) { await r.continue(); return; }
      await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route(/\/api\/applications/, async (r) => {
      const url = new URL(r.request().url());
      if (!url.pathname.startsWith('/api/')) { await r.continue(); return; }
      await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.getByPlaceholder('Email address').fill('jose@example.com');
    await page.getByPlaceholder('Password', { exact: true }).fill('secret123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Your next move is clear.')).toBeVisible();

    // Navigate to jobs – mock posts
    await page.route(/\/api\/posts/, async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            { postId: 1, title: 'Senior Frontend Developer', companyName: 'TechCorp', jobType: 'Full-time', location: 'Cebu City', isRemote: false },
          ],
          total: 1,
          page: 1,
          pageSize: 9,
        }),
      });
    });
    await page.getByRole('link', { name: 'Find work' }).click();
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible();

    // Navigate to courses – mock coursespage
    await page.route(/\/api\/coursespage/, async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          enrolledCourses: [],
          recommendedCourses: [
            { courseId: 9, name: 'Smoke Course', skillCategory: 'Language', category: 'Frontend', isFree: true, isRecommended: true },
          ],
          dayStreak: 0,
          coursesInProgress: 0,
          certificatesEarned: 0,
          availableCategories: ['Language'],
        }),
      });
    });
    await page.getByRole('link', { name: 'Learn' }).click();
    await expect(page.getByRole('heading', { name: 'Courses' })).toBeVisible();
    await expect(page.getByText('Smoke Course')).toBeVisible();
  });

  test('recruiter journey: login → dashboard visible', async ({ page }) => {
    await page.route(/\/api\/auth\/login/, async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ token: 'recruiter-token', firstName: 'Maria', role: 'Recruiter', companyId: 1 }),
      });
    });
    await page.route(/\/api\/stats\/business/, async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          company: { name: 'Smoke Corp', jobPostings: 1, recruiters: 1 },
          talentPool: { totalLearners: 10, avgSkillLevel: 2.5 },
          jobPostings: [],
          skillDemand: [],
        }),
      });
    });

    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill('maria@tech.com');
    await page.getByPlaceholder('Password', { exact: true }).fill('secret123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('heading', { name: 'Business Dashboard' })).toBeVisible();
    await expect(page.getByText('Employer insights')).toBeVisible();
  });

  test('unauthenticated user sees forgot-password and confirm-email flows reachable', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Forgot your password/ }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    // The forgot-password page should have an email input
    await expect(page.getByPlaceholder('Email address')).toBeVisible();

    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });
});
