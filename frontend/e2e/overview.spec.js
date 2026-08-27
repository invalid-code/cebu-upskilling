import { test, expect } from './fixtures.js';
import { setAuth } from './helpers.js';

const learnerUser = { firstName: 'Jose', lastName: 'Rizal', role: 'Learner', targetRole: 'Frontend Developer' };
const bareLearner = { firstName: 'Jose', lastName: 'Rizal', role: 'Learner' };

async function mockOverview(page, { courses = [], skillGaps = [], recommended = null, weekly = { learningTimeHours: 5, coursesActive: 2, jobsWorthApplying: 4 } } = {}) {
  const routes = [
    [/\/api\/courses(\?|$)/, JSON.stringify(courses), (url) => !url.pathname.includes('coursespage')],
    [/\/api\/skillgaps/, JSON.stringify(skillGaps)],
    [/\/api\/assessments\/recommended/, JSON.stringify(recommended)],
    [/\/api\/stats\/week/, JSON.stringify(weekly)],
    [/\/api\/enrollments/, '[]'],
    [/\/api\/applications/, '[]'],
    [/\/api\/coursespage/, JSON.stringify({ enrolledCourses: [], recommendedCourses: [], dayStreak: 0, coursesInProgress: 0, certificatesEarned: 0, availableCategories: [] })],
  ];
  for (const [pattern, body, extraCheck] of routes) {
    await page.route(pattern, async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
      if (extraCheck && !extraCheck(url)) { await route.continue(); return; }
      await route.fulfill({ status: 200, contentType: 'application/json', body });
    });
  }
}

const sampleCourses = [
  { courseId: 1, name: 'Modern JavaScript for Frontend Work', genre: { name: 'CodeChum Learning' }, technicalLevel: 18, description: 'Closes gap' },
  { courseId: 2, name: 'TypeScript from Zero to Confident', genre: { name: 'DevCon Cebu Academy' }, technicalLevel: 12, description: 'Build toward Intermediate' },
];

const sampleGaps = [
  { skillId: 1, skillName: 'JavaScript', requiredLevel: 4, currentLevel: 2, gap: 2, verified: false },
  { skillId: 2, skillName: 'TypeScript', requiredLevel: 3, currentLevel: 0, gap: 3, verified: false },
];

test.describe('Overview page (learner)', () => {
  test('renders hero and pathway rail', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockOverview(page, { courses: sampleCourses, skillGaps: sampleGaps, recommended: { skillName: 'JavaScript' } });
    await page.goto('/');
    await expect(page.getByText('Your next move is clear.')).toBeVisible();
    await expect(page.getByText(/of the way to your target role/)).toBeVisible();
    await expect(page.getByText('Pathway rail')).toBeVisible();
    await expect(page.getByText('This week')).toBeVisible();
  });

  test('shows empty skill gaps when no target role', async ({ page }) => {
    await setAuth(page, { user: bareLearner });
    await mockOverview(page, { courses: [], skillGaps: [] });
    await page.goto('/');
    await expect(page.getByText('Set a target role to see your gaps')).toBeVisible();
    await expect(page.getByText('No score yet')).toBeVisible();
  });

  test('shows skill gaps when target role present', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockOverview(page, { courses: [], skillGaps: sampleGaps });
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'JavaScript' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'TypeScript' })).toBeVisible();
  });

  test('renders weekly stats', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockOverview(page, { weekly: { learningTimeHours: 5, coursesActive: 2, jobsWorthApplying: 4 } });
    await page.goto('/');
    await expect(page.getByText('5h')).toBeVisible();
    await expect(page.getByText('learning time')).toBeVisible();
    await expect(page.getByText('courses active')).toBeVisible();
    await expect(page.getByText('jobs worth applying')).toBeVisible();
  });

  test('renders recommended courses', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockOverview(page, { courses: sampleCourses });
    await page.goto('/');
    await expect(page.getByText('Modern JavaScript for Frontend Work')).toBeVisible();
    await expect(page.getByText('TypeScript from Zero to Confident')).toBeVisible();
  });

  test('navigates to skills and courses via buttons/links', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockOverview(page, { courses: [], skillGaps: [] });
    await page.goto('/');
    await page.getByRole('button', { name: 'Update skills' }).click();
    await expect(page).toHaveURL(/\/skills/);
    await page.goto('/');
    await page.getByRole('button', { name: 'Browse courses' }).click();
    await expect(page).toHaveURL(/\/courses/);
  });

  test('employer overview not shown to learner', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockOverview(page);
    await page.goto('/');
    await expect(page.getByText('Your next move is clear.')).toBeVisible();
    await expect(page.getByText('Welcome back.')).not.toBeVisible();
  });
});

test.describe('Business dashboard (recruiter)', () => {
  test('renders business dashboard for recruiter', async ({ page }) => {
    await setAuth(page, { user: { firstName: 'Employer', role: 'Recruiter' } });
    await page.route(/\/api\/stats\/business/, async (route) => {
      const url = new URL(route.request().url());
      if (!url.pathname.startsWith('/api/')) { await route.continue(); return; }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
          talentPool: { totalLearners: 120, avgSkillLevel: 3.4 },
          jobPostings: [],
          skillDemand: [],
        }),
      });
    });
    await page.goto('/business-dashboard');
    await expect(page.getByRole('heading', { name: 'Business Dashboard' })).toBeVisible();
    await expect(page.getByText('Employer insights')).toBeVisible();
  });
});
