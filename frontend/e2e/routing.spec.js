import { test, expect } from './fixtures.js';
import { setAuth, mockApi } from './helpers.js';

const learnerUser = { firstName: 'Jose', lastName: 'Rizal', role: 'Learner' };
const recruiterUser = { firstName: 'Employer', role: 'Recruiter', companyId: 1 };

async function mockLearnerShell(page) {
  await mockApi(page, {
    'GET /api/courses': [],
    'GET /api/enrollments': [],
    'GET /api/skillgaps': [],
    'GET /api/assessments/recommended': null,
    'GET /api/stats/week': { learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 },
    'GET /api/applications': [],
    'GET /api/coursespage': {
      enrolledCourses: [],
      recommendedCourses: [],
      dayStreak: 0,
      coursesInProgress: 0,
      certificatesEarned: 0,
      availableCategories: [],
    },
    'GET /api/posts': { items: [], total: 0, page: 1, pageSize: 9 },
    'GET /api/stats/business': {
      company: { name: 'Acme Corp', jobPostings: 0, recruiters: 1 },
      talentPool: { totalLearners: 0, avgSkillLevel: 0 },
      jobPostings: [],
      skillDemand: [],
    },
  });
}

test.describe('Routing and role guards', () => {
  test('learner can visit learner routes', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/skills');
    // SkillsPage has heading "Skill profile" or similar – assert URL stays
    await expect(page).toHaveURL(/\/skills/);
    // The page should not redirect to business-dashboard
    await expect(page).not.toHaveURL(/business-dashboard/);
  });

  test('recruiter is redirected away from learner routes', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockApi(page, {
      'GET /api/stats/business': {
        company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
        talentPool: { totalLearners: 120, avgSkillLevel: 3.4 },
        jobPostings: [],
        skillDemand: [],
      },
    });
    await page.goto('/skills');
    await expect(page).toHaveURL(/\/business-dashboard/);
    await expect(page.getByRole('heading', { name: 'Business Dashboard' })).toBeVisible();
  });

  test('learner is redirected away from recruiter routes', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/business-dashboard');
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByText('Your next move is clear.')).toBeVisible();
  });

  test('recruiter can visit recruiter routes', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockApi(page, {
      'GET /api/stats/business': {
        company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
        talentPool: { totalLearners: 120, avgSkillLevel: 3.4 },
        jobPostings: [],
        skillDemand: [],
      },
    });
    await page.goto('/business-dashboard');
    await expect(page).toHaveURL(/\/business-dashboard/);
    await expect(page.getByRole('heading', { name: 'Business Dashboard' })).toBeVisible();
  });

  test('learner visiting /business-dashboard via direct navigation goes home', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/post-job');
    await expect(page).toHaveURL('http://localhost:5173/');
  });

  test('not-found route shows NotFoundPage', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-123');
    // App always renders NotFoundPage for unknown routes (no auth needed)
    await expect(page.getByText(/not found|404/i).first()).toBeVisible();
  });

  test('public routes redirect authenticated learner to home', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/register');
    await expect(page).toHaveURL('http://localhost:5173/');
  });

  test('public routes redirect authenticated recruiter to business dashboard', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockApi(page, {
      'GET /api/stats/business': {
        company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
        talentPool: { totalLearners: 120, avgSkillLevel: 3.4 },
        jobPostings: [],
        skillDemand: [],
      },
    });
    await page.goto('/register');
    await expect(page).toHaveURL(/\/business-dashboard/);
  });

  test('expired token is treated as unauthenticated', async ({ page }) => {
    // token with exp in the past – hasValidSession should clear it
    const expiredToken = (() => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '');
      const body = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) - 3600 })).replace(/=+$/, '');
      return `${header}.${body}.sig`;
    })();
    await setAuth(page, { user: learnerUser, token: expiredToken });
    // App should clear token and redirect to login
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
