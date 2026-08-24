import { test, expect } from './fixtures.js';
import { setAuth } from './helpers.js';

const recruiterUser = { firstName: 'Employer', lastName: 'Corp', role: 'Recruiter', companyId: 1 };

function statsPayload(postings) {
  return {
    company: { name: 'Acme Corp', jobPostings: postings.length, recruiters: 3 },
    talentPool: { totalLearners: 120, avgSkillLevel: 3.4 },
    jobPostings: postings,
    skillDemand: [],
  };
}

const postingA = {
  postId: 11,
  title: 'Frontend Developer',
  description: 'Build the CebuUpskilling learner experience.',
  jobType: 'Full-time',
  location: 'Cebu City',
  isRemote: false,
  salaryRange: 'PHP 40k-60k',
  experienceLevel: 'Mid',
  isActive: true,
};
const postingB = { ...postingA, postId: 12, title: 'QA Engineer' };

test.describe('Business dashboard — delete job posting', () => {
  test('deletes via /api/posts/{id} (single prefix), toasts, refetches without reload', async ({ page }) => {
    const deleted = new Set();
    const deleteRequests = [];

    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (req.method() === 'GET' && url.pathname === '/api/stats/business') {
        // StrictMode/dev may refetch any number of times: derive state from deletes.
        const postings = [postingA, postingB].filter((p) => !deleted.has(p.postId));
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statsPayload(postings)) });
      }
      if (req.method() === 'DELETE' && url.pathname.startsWith('/api/posts/')) {
        // Capture the RAW pathname — this is the regression guard against a
        // doubled prefix ("/api/api/posts/...") which still matches '**/api/**'.
        const id = Number(url.pathname.split('/').pop());
        deleteRequests.push(url.pathname);
        deleted.add(id);
        return route.fulfill({ status: 204, body: '' });
      }
      if (req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await setAuth(page, { user: recruiterUser });
    await page.goto('/business-dashboard');
    await expect(page.getByRole('heading', { name: 'Business Dashboard' })).toBeVisible();
    await expect(page.getByText('Frontend Developer')).toBeVisible();

    // Mark the window; a full reload would wipe it.
    await page.evaluate(() => { window.__qaNoReloadMarker = true; });

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete', exact: true }).first().click();

    await expect(page.getByText('Job posting deleted')).toBeVisible();
    expect(deleteRequests).toEqual(['/api/posts/11']);

    // Row removed via state refresh, not window.location.reload()
    await expect(page.getByText('Frontend Developer')).toBeHidden();
    await expect(page.getByText('QA Engineer')).toBeVisible();
    const markerAlive = await page.evaluate(() => window.__qaNoReloadMarker === true);
    expect(markerAlive).toBe(true);
  });

  test('shows error toast and keeps the row when deletion fails', async ({ page }) => {
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (req.method() === 'GET' && url.pathname === '/api/stats/business') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statsPayload([postingA])) });
      }
      if (req.method() === 'DELETE' && url.pathname.startsWith('/api/posts/')) {
        return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Cannot delete a post with applicants' }) });
      }
      if (req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await setAuth(page, { user: recruiterUser });
    await page.goto('/business-dashboard');
    await expect(page.getByText('Frontend Developer')).toBeVisible();

    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete', exact: true }).click();

    await expect(page.getByText('Cannot delete a post with applicants')).toBeVisible();
    await expect(page.getByText('Frontend Developer')).toBeVisible();
  });

  test('dismissed confirm dialog sends no request', async ({ page }) => {
    let deletes = 0;
    await page.route('**/api/**', async (route) => {
      const req = route.request();
      const url = new URL(req.url());
      if (!url.pathname.startsWith('/api/')) return route.continue();
      if (req.method() === 'GET' && url.pathname === '/api/stats/business') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statsPayload([postingA])) });
      }
      if (req.method() === 'DELETE') {
        deletes += 1;
        return route.fulfill({ status: 204, body: '' });
      }
      if (req.method() === 'GET') {
        return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
    });

    await setAuth(page, { user: recruiterUser });
    await page.goto('/business-dashboard');
    await expect(page.getByText('Frontend Developer')).toBeVisible();

    page.once('dialog', (dialog) => dialog.dismiss());
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await expect(page.getByText('Frontend Developer')).toBeVisible();
    expect(deletes).toBe(0);
  });
});
