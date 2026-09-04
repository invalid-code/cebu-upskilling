import { test, expect } from './fixtures.js';
import { setAuth, clearAuth, mockApi, mockLearnerShell, mockRecruiterShell } from './helpers.js';

const learnerUser = { firstName: 'Jose', lastName: 'Rizal', role: 'Learner', targetRole: 'Frontend Developer' };
const recruiterUser = { firstName: 'Employer', lastName: 'Corp', role: 'Recruiter', companyId: 1 };
const providerUser = { firstName: 'Provider', lastName: 'One', role: 'CourseProvider', companyId: 2 };

// Helper to mock common learner endpoints so shell does not 401
async function mockAssessments(page) {
  await mockApi(page, {
    'GET /api/assessments/available': { assessments: [], matchPercent: 0, verifiedSkillsCount: 0, recommendedCount: 0 },
    'GET /api/assessments/results': [],
    'GET /api/assessments/recommended': null,
    'GET /api/skillgaps': [],
    'GET /api/courses': [],
    'GET /api/enrollments': [],
    'GET /api/applications': [],
    'GET /api/stats/week': { learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 },
    'GET /api/coursespage': { enrolledCourses: [], recommendedCourses: [], dayStreak: 0, coursesInProgress: 0, certificatesEarned: 0, availableCategories: [] },
  });
}

test.describe('Coverage gaps — assessments, applications, credentials', () => {
  test('learner can visit /assessments', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockAssessments(page);
    await page.goto('/assessments');
    await expect(page).toHaveURL(/\/assessments/);
    await expect(page.getByRole('heading', { name: 'Assessments', exact: true })).toBeVisible();
  });

  test('learner can visit /applications', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockApi(page, {
      'GET /api/applications': [],
      'GET /api/skillgaps': [],
      'GET /api/courses': [],
      'GET /api/enrollments': [],
    });
    await page.goto('/applications');
    await expect(page).toHaveURL(/\/applications/);
    await expect(page.getByRole('heading', { name: 'Applications', exact: true })).toBeVisible();
  });

  test('learner can visit /credentials', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockAssessments(page);
    await page.goto('/credentials');
    await expect(page).toHaveURL(/\/credentials/);
    await expect(page.getByRole('heading', { name: 'Credentials', exact: true })).toBeVisible();
  });

  test('any authenticated user can visit /profile', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockApi(page, {
      'GET /api/auth/profile': learnerUser,
      'GET /api/skillgaps': [],
    });
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/profile/);
    await expect(page.getByRole('heading', { name: 'Your profile' })).toBeVisible();
  });
});

test.describe('Coverage gaps — recruiter job flows', () => {
  test('recruiter can visit /post-job', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockRecruiterShell(page);
    await page.goto('/post-job');
    await expect(page).toHaveURL(/\/post-job/);
    await expect(page.getByRole('heading', { name: 'Post a job' })).toBeVisible();
  });

  test('recruiter can visit /edit-job/:id', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockApi(page, {
      'GET /api/posts/1': { postId: 1, title: 'Backend Engineer', description: 'Desc', companyId: 1 },
      'GET /api/stats/business': { company: { name: 'Acme' }, talentPool: {}, jobPostings: [], skillDemand: [] },
    });
    await page.goto('/edit-job/1');
    await expect(page).toHaveURL(/\/edit-job\/1/);
    await expect(page.getByRole('heading', { name: 'Edit job posting' })).toBeVisible();
  });

  test('recruiter can visit /job-applications', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockApi(page, {
      'GET /api/applications': [],
      'GET /api/posts': { items: [], total: 0, page: 1, pageSize: 9 },
      'GET /api/stats/business': { company: { name: 'Acme' }, talentPool: {}, jobPostings: [], skillDemand: [] },
    });
    await page.goto('/job-applications');
    await expect(page).toHaveURL(/\/job-applications/);
    await expect(page.getByRole('heading', { name: 'Job applications' })).toBeVisible();
  });
});

test.describe('Coverage gaps — provider & studio', () => {
  test('course provider can visit /provider-dashboard', async ({ page }) => {
    await setAuth(page, { user: providerUser });
    await mockApi(page, {
      'GET /api/courses': [],
      'GET /api/enrollments': [],
    });
    await page.goto('/provider-dashboard');
    await expect(page).toHaveURL(/\/provider-dashboard/);
    await expect(page.getByRole('heading', { name: 'Course provider' })).toBeVisible();
  });

  test('recruiter can visit /company-courses (course studio)', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockApi(page, {
      'GET /api/company/courses': [],
      'GET /api/courses': [],
    });
    await page.goto('/company-courses');
    await expect(page).toHaveURL(/\/company-courses/);
    await expect(page.getByRole('heading', { name: 'Course studio' })).toBeVisible();
  });

  test('recruiter can visit /company-courses/new', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockApi(page, { 'GET /api/company/courses': [] });
    await page.goto('/company-courses/new');
    await expect(page).toHaveURL(/\/company-courses\/new/);
    // new course editor shows Create a course
    await expect(page.getByRole('heading', { name: 'Create a course' })).toBeVisible();
  });
});

test.describe('Coverage gaps — course content & public auth flows', () => {
  test('learner can visit /courses/:id/learn', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockApi(page, {
      'GET /api/coursecontent/courses/1/content': {
        courseId: 1, courseName: 'Intro', totalLessons: 2, completedLessons: 0, progressPercent: 0,
        modules: [{ moduleId: 1, name: 'M1', lessons: [{ lessonId: 1, name: 'L1' }] }],
        currentLesson: { lessonId: 1, name: 'L1' },
      },
      'GET /api/coursecontent/lessons/1': { lessonId: 1, name: 'L1', contentBlocks: [] },
      'GET /api/courses/1/detail': { courseId: 1, name: 'Intro', modules: [], totalModules: 1, isEnrolled: true },
    });
    await page.goto('/courses/1/learn');
    await expect(page).toHaveURL(/\/courses\/1\/learn/);
    // page shows course content, at least not redirected
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('public can visit /reset-password', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/reset-password?token=abc&email=test@example.com');
    await expect(page).toHaveURL(/\/reset-password/);
    await expect(page.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  });

  test('public can visit /confirm-email', async ({ page }) => {
    await clearAuth(page);
    await page.goto('/confirm-email?token=abc&email=test@example.com');
    await expect(page).toHaveURL(/\/confirm-email/);
    await expect(page.getByText(/Confirming your email|Email confirmed|Couldn't confirm/i).first()).toBeVisible();
  });

  test('learner cannot visit provider routes — redirected to dashboard', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/provider-dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('recruiter cannot visit learner assessments — redirected', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockRecruiterShell(page);
    await page.goto('/assessments');
    await expect(page).toHaveURL(/\/business-dashboard/);
  });
});
