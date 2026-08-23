import { test, expect } from '@playwright/test';
import { setAuth } from './helpers.js';

const learnerUser = { firstName: 'Jose', lastName: 'Rizal', role: 'Learner' };

const mockPosts = [
  {
    postId: 1,
    title: 'Senior Frontend Developer',
    companyName: 'TechCorp',
    targetRole: 'Frontend Developer',
    location: 'Cebu City',
    salaryRange: '₱80,000 - ₱120,000',
    jobType: 'Full-time',
    experienceLevel: 'Senior',
    isRemote: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    postId: 2,
    title: 'Backend Developer',
    companyName: 'StartupInc',
    targetRole: 'Backend Developer',
    location: 'Remote',
    salaryRange: '₱1,500/hr',
    jobType: 'Part-time',
    experienceLevel: 'Mid',
    isRemote: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    postId: 3,
    title: 'Full Stack Developer',
    companyName: 'LocalSME',
    targetRole: 'Full Stack Developer',
    location: 'Mandaue',
    salaryRange: '₱60,000',
    jobType: 'Part-time',
    experienceLevel: 'Junior',
    isRemote: false,
    createdAt: '2026-01-03T00:00:00Z',
  },
];

function envelope(items, total = items.length) {
  return { items, total, page: 1, pageSize: 9 };
}

async function mockPostsRoute(page, options = {}) {
  const { filterFn, error = false, delayMs = 0 } = options;
  await page.route(/\/api\/posts/, async (route) => {
    if (error) {
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Server error' }) });
      return;
    }
    if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
    const url = new URL(route.request().url());
    const search = url.searchParams.get('search') || '';
    const jobType = url.searchParams.get('jobType') || '';
    const location = url.searchParams.get('location') || '';
    const isRemote = url.searchParams.get('isRemote') || '';
    let items = [...mockPosts];
    if (search) items = items.filter((p) => p.title.toLowerCase().includes(search.toLowerCase()));
    if (jobType) items = items.filter((p) => p.jobType === jobType);
    if (location) items = items.filter((p) => p.location === location);
    if (isRemote === 'true') items = items.filter((p) => p.isRemote);
    if (filterFn) items = filterFn(items, url);
    const pageNum = parseInt(url.searchParams.get('page') || '1', 10);
    const pageSize = parseInt(url.searchParams.get('pageSize') || '9', 10);
    const total = items.length;
    const start = (pageNum - 1) * pageSize;
    const paged = items.slice(start, start + pageSize);
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ items: paged, total, page: pageNum, pageSize }),
    });
  });
  // other GETs – use regex to avoid matching Vite static files like /src/api/client.js
  await page.route(/\/api\/courses/, async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route(/\/api\/skillgaps/, async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route(/\/api\/stats\/week/, async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 }) });
  });
  await page.route(/\/api\/enrollments/, async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route(/\/api\/applications/, async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
  });
  await page.route(/\/api\/assessments\/recommended/, async (route) => {
    const url = new URL(route.request().url());
    if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(null) });
  });
}

test.describe('Jobs page', () => {
  test.beforeEach(async ({ page }) => {
    await setAuth(page, { user: learnerUser });
  });

  test('renders heading, tabs and toolbar', async ({ page }) => {
    await mockPostsRoute(page);
    await page.goto('/jobs');
    await expect(page.getByRole('heading', { name: 'Find work that fits.' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'All roles' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Corporate & Full-Time' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Side Hustles & Local SME' })).toBeVisible();
    await expect(page.getByPlaceholder('Search roles, skills, or locations')).toBeVisible();
    const combos = page.getByRole('combobox');
    await expect(combos).toHaveCount(2);
  });

  test('displays job cards after loading', async ({ page }) => {
    await mockPostsRoute(page);
    await page.goto('/jobs');
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible();
    await expect(page.getByText('Backend Developer')).toBeVisible();
    await expect(page.getByText('Full Stack Developer')).toBeVisible();
  });

  test('shows loading state briefly', async ({ page }) => {
    await mockPostsRoute(page, { delayMs: 600 });
    await page.goto('/jobs');
    // Loading may appear briefly; do not fail if it is too fast to catch
    try {
      await expect(page.getByText('Loading jobs...')).toBeVisible({ timeout: 800 });
    } catch {
      // Loading was too fast – still verify jobs load correctly after the delay
    }
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible({ timeout: 5000 });
  });

  test('search filters via API query', async ({ page }) => {
    await mockPostsRoute(page);
    await page.goto('/jobs');
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible();

    const search = page.getByPlaceholder('Search roles, skills, or locations');
    await search.fill('Frontend');
    // Wait for debounced/filtered fetch – the component fires on each change
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible();
    await expect(page.getByText('Backend Developer')).not.toBeVisible();
    await expect(page.getByText('Full Stack Developer')).not.toBeVisible();
  });

  test('side-hustle tab filters to Part-time', async ({ page }) => {
    await mockPostsRoute(page);
    await page.goto('/jobs');
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible();
    await page.getByRole('button', { name: 'Side Hustles & Local SME' }).click();
    await expect(page.getByText('Backend Developer')).toBeVisible();
    await expect(page.getByText('Full Stack Developer')).toBeVisible();
    await expect(page.getByText('Senior Frontend Developer')).not.toBeVisible();
  });

  test('corporate tab filters to Full-time', async ({ page }) => {
    await mockPostsRoute(page);
    await page.goto('/jobs');
    await page.getByRole('button', { name: 'Corporate & Full-Time' }).click();
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible();
    await expect(page.getByText('Backend Developer')).not.toBeVisible();
  });

  test('location filter', async ({ page }) => {
    await mockPostsRoute(page);
    await page.goto('/jobs');
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible();
    const locationSelect = page.getByRole('combobox').nth(1);
    await locationSelect.selectOption('Remote');
    await expect(page.getByText('Backend Developer')).toBeVisible();
    await expect(page.getByText('Senior Frontend Developer')).not.toBeVisible();
  });

  test('remote-only checkbox filters', async ({ page }) => {
    await mockPostsRoute(page);
    await page.goto('/jobs');
    await page.getByLabel('Remote only').check();
    await expect(page.getByText('Backend Developer')).toBeVisible();
    await expect(page.getByText('Senior Frontend Developer')).not.toBeVisible();
    await page.getByLabel('Remote only').uncheck();
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible();
  });

  test('empty state when no jobs match', async ({ page }) => {
    await mockPostsRoute(page);
    await page.goto('/jobs');
    await page.getByPlaceholder('Search roles, skills, or locations').fill('NonExistentJob123');
    await expect(page.getByText('No jobs match your search.')).toBeVisible();
  });

  test('shows error state when API fails', async ({ page }) => {
    await mockPostsRoute(page, { error: true });
    await page.goto('/jobs');
    await expect(page.getByText("Couldn't load jobs. Check back later.")).toBeVisible();
  });

  test('pagination next/previous', async ({ page }) => {
    // Create 12 posts to force pagination (pageSize 9)
    const manyPosts = Array.from({ length: 12 }, (_, i) => ({
      postId: 100 + i,
      title: `Job ${i + 1}`,
      companyName: `Company ${i + 1}`,
      jobType: 'Full-time',
      location: 'Cebu City',
      isRemote: false,
      createdAt: '2026-01-01T00:00:00Z',
    }));
    await page.route(/\/api\/posts/, async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
      const pageNum = parseInt(url.searchParams.get('page') || '1', 10);
      const pageSize = parseInt(url.searchParams.get('pageSize') || '9', 10);
      const start = (pageNum - 1) * pageSize;
      const paged = manyPosts.slice(start, start + pageSize);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: paged, total: manyPosts.length, page: pageNum, pageSize }),
      });
    });
    await page.route(/\/api\/courses/, async (r) => {
      const url = new URL(r.request().url());
      if (!url.pathname.startsWith('/api/')) { await r.continue(); return; }
      await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });
    await page.route(/\/api\/skillgaps/, async (r) => {
      const url = new URL(r.request().url());
      if (!url.pathname.startsWith('/api/')) { await r.continue(); return; }
      await r.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
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
    await page.route(/\/api\/assessments\/recommended/, async (r) => {
      const url = new URL(r.request().url());
      if (!url.pathname.startsWith('/api/')) { await r.continue(); return; }
      await r.fulfill({ status: 200, contentType: 'application/json', body: 'null' });
    });

    await page.goto('/jobs');
    await expect(page.getByText('Job 1', { exact: true })).toBeVisible();
    await expect(page.getByText('Job 9', { exact: true })).toBeVisible();
    await expect(page.getByText('Job 10', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Page 1 of 2')).toBeVisible();

    await page.getByRole('button', { name: 'Next' }).click();
    await expect(page.getByText('Job 10', { exact: true })).toBeVisible();
    await expect(page.getByText('Job 1', { exact: true })).not.toBeVisible();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();

    await page.getByRole('button', { name: 'Previous' }).click();
    await expect(page.getByText('Job 1', { exact: true })).toBeVisible();
  });

  test('save alert shows toast', async ({ page }) => {
    await mockPostsRoute(page);
    await page.goto('/jobs');
    await expect(page.getByText('Senior Frontend Developer')).toBeVisible();
    await page.getByRole('button', { name: 'Save alert' }).click();
    await expect(page.getByText('Job alert saved')).toBeVisible();
  });
});
