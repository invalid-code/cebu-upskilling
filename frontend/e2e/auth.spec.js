import { test, expect } from '@playwright/test';
import { setAuth, mockApi, mockLearnerShell, mockRecruiterShell, learnerUser, recruiterUser } from './helpers.js';

test.describe('Authentication — login & registration', () => {
  test('redirects unauthenticated users to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
  });

  test('redirects unauthenticated direct access to learner routes', async ({ page }) => {
    await page.goto('/skills');
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects unauthenticated direct access to recruiter routes', async ({ page }) => {
    await page.goto('/business-dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders sign-in form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Forgot your password/ })).toBeVisible();
  });

  test('shows field error for invalid email without calling API', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/src/')) {
        await route.continue();
        return;
      }
      if (!url.pathname.startsWith('/api/')) {
        await route.continue();
        return;
      }
      apiCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill('not-an-email');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
    expect(apiCalled).toBeFalsy();
  });

  test('shows field error for empty password without calling API', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/src/')) {
        await route.continue();
        return;
      }
      if (!url.pathname.startsWith('/api/')) {
        await route.continue();
        return;
      }
      apiCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill('jose@example.com');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Password is required')).toBeVisible();
    expect(apiCalled).toBeFalsy();
  });

  test('successful learner login navigates to learner home', async ({ page }) => {
    await mockApi(page, {
      'POST /api/auth/login': {
        token: 'learner-token',
        firstName: 'Jose',
        lastName: 'Rizal',
        role: 'Learner',
      },
      'GET /api/courses': [],
      'GET /api/enrollments': [],
      'GET /api/skillgaps': [],
      'GET /api/assessments/recommended': null,
      'GET /api/stats/week': { learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 },
      'GET /api/applications': [],
    });

    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill('jose@example.com');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByText('Your next move is clear.')).toBeVisible();
  });

  test('successful recruiter login navigates to business dashboard', async ({ page }) => {
    await mockApi(page, {
      'POST /api/auth/login': {
        token: 'recruiter-token',
        firstName: 'Maria',
        lastName: 'Santos',
        role: 'Recruiter',
        companyId: 1,
      },
      'GET /api/stats/business': {
        company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
        talentPool: { totalLearners: 120, avgSkillLevel: 3.4 },
        jobPostings: [],
        skillDemand: [],
      },
    });

    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill('maria@tech.com');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/business-dashboard/);
    await expect(page.getByRole('heading', { name: 'Business Dashboard' })).toBeVisible();
  });

  test('failed login shows error and stays on login page', async ({ page }) => {
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Invalid credentials' }),
      });
    });

    await page.goto('/login');
    await page.getByPlaceholder('Email address').fill('jose@example.com');
    await page.getByPlaceholder('Password').fill('wrong123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page.getByText('Invalid credentials')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('authenticated learner is redirected away from /login', async ({ page }) => {
    await setAuth(page, { user: learnerUser });
    await mockLearnerShell(page);
    await page.goto('/login');
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByText('Your next move is clear.')).toBeVisible();
  });

  test('authenticated recruiter is redirected away from /login to business dashboard', async ({ page }) => {
    await setAuth(page, { user: recruiterUser });
    await mockRecruiterShell(page);
    await page.goto('/login');
    await expect(page).toHaveURL(/\/business-dashboard/);
  });

  test('logout clears session and redirects to login', async ({ page }) => {
    // Seed auth without addInitScript persistence so logout truly clears
    await mockApi(page, {
      'GET /api/courses': [],
      'GET /api/enrollments': [],
      'GET /api/skillgaps': [],
      'GET /api/assessments/recommended': null,
      'GET /api/stats/week': { learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 },
      'GET /api/applications': [],
      'POST /api/auth/logout': { status: 200, body: {} },
    });
    await page.goto('/login');
    await page.evaluate(
      ({ user, token }) => {
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('token', token);
      },
      { user: learnerUser, token: 'e2e-test-token' },
    );
    await page.goto('/');
    await expect(page.getByText('Your next move is clear.')).toBeVisible();

    await page.getByLabel('Sign out').click();
    await expect(page).toHaveURL(/\/login/);
    // user should be cleared – visiting / again stays on login (no re-seed)
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Authentication — registration', () => {
  test('register page renders learner form by default', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
    await expect(page.getByPlaceholder('First name')).toBeVisible();
    await expect(page.getByPlaceholder('Last name')).toBeVisible();
    await expect(page.getByPlaceholder('Email address')).toBeVisible();
    await expect(page.getByPlaceholder('Password')).toBeVisible();
    await expect(page.getByPlaceholder('Confirm password')).toBeVisible();
    await expect(page.getByLabel('Birthday')).toBeVisible();
    await expect(page.getByPlaceholder('Address (optional)')).toBeVisible();
    await expect(page.getByLabel('Resume')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
  });

  test('toggle to Employer shows Company name and hides learner fields', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Employer' }).click();
    await expect(page.getByPlaceholder('Company name')).toBeVisible();
    // Birthday / Resume are learner-only
    await expect(page.getByLabel('Birthday')).not.toBeVisible();
    await expect(page.getByLabel('Resume')).not.toBeVisible();
  });

  test('learner validation: missing company not required', async ({ page }) => {
    await page.goto('/register');
    await page.getByPlaceholder('First name').fill('Jose');
    await page.getByPlaceholder('Last name').fill('Rizal');
    await page.getByPlaceholder('Email address').fill('not-an-email');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByPlaceholder('Confirm password').fill('secret123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();
  });

  test('employer validation: missing company name shows error', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/src/')) {
        await route.continue();
        return;
      }
      if (!url.pathname.startsWith('/api/')) {
        await route.continue();
        return;
      }
      apiCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/register');
    await page.getByRole('button', { name: 'Employer' }).click();
    await page.getByPlaceholder('First name').fill('Maria');
    await page.getByPlaceholder('Last name').fill('Santos');
    await page.getByPlaceholder('Email address').fill('maria@tech.com');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByPlaceholder('Confirm password').fill('secret123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Company name is required')).toBeVisible();
    expect(apiCalled).toBeFalsy();
  });

  test('successful learner registration navigates to home', async ({ page }) => {
    await mockApi(page, {
      'POST /api/auth/register': { token: 'new-learner-token', firstName: 'Jose', role: 'Learner' },
      'GET /api/courses': [],
      'GET /api/enrollments': [],
      'GET /api/skillgaps': [],
      'GET /api/assessments/recommended': null,
      'GET /api/stats/week': { learningTimeHours: 0, coursesActive: 0, jobsWorthApplying: 0 },
      'GET /api/applications': [],
    });
    await page.goto('/register');
    await page.getByPlaceholder('First name').fill('Jose');
    await page.getByPlaceholder('Last name').fill('Rizal');
    await page.getByPlaceholder('Email address').fill('jose@example.com');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByPlaceholder('Confirm password').fill('secret123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL('http://localhost:5173/');
    await expect(page.getByText('Your next move is clear.')).toBeVisible();
  });

  test('successful employer registration navigates to business dashboard', async ({ page }) => {
    await mockApi(page, {
      'POST /api/auth/register-company': { token: 'new-recruiter-token', firstName: 'Maria', role: 'Recruiter', companyId: 9 },
      'GET /api/stats/business': {
        company: { name: 'Tech Solutions Inc', jobPostings: 0, recruiters: 1 },
        talentPool: { totalLearners: 0, avgSkillLevel: 0 },
        jobPostings: [],
        skillDemand: [],
      },
    });
    await page.goto('/register');
    await page.getByRole('button', { name: 'Employer' }).click();
    await page.getByPlaceholder('Company name').fill('Tech Solutions Inc');
    await page.getByPlaceholder('First name').fill('Maria');
    await page.getByPlaceholder('Last name').fill('Santos');
    await page.getByPlaceholder('Email address').fill('maria@tech.com');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByPlaceholder('Confirm password').fill('secret123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/business-dashboard/);
    await expect(page.getByRole('heading', { name: 'Business Dashboard' })).toBeVisible();
  });

  test('shows field error for mismatched passwords without calling API', async ({ page }) => {
    let apiCalled = false;
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      if (url.pathname.startsWith('/src/')) {
        await route.continue();
        return;
      }
      if (!url.pathname.startsWith('/api/')) {
        await route.continue();
        return;
      }
      apiCalled = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/register');
    await page.getByPlaceholder('First name').fill('Jose');
    await page.getByPlaceholder('Last name').fill('Rizal');
    await page.getByPlaceholder('Email address').fill('jose@example.com');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByPlaceholder('Confirm password').fill('different123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();
    expect(apiCalled).toBeFalsy();
  });

  test('registration failure shows server error', async ({ page }) => {
    await page.route('**/api/auth/register', async (route) => {
      await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'Email already in use' }) });
    });
    await page.goto('/register');
    await page.getByPlaceholder('First name').fill('Jose');
    await page.getByPlaceholder('Last name').fill('Rizal');
    await page.getByPlaceholder('Email address').fill('jose@example.com');
    await page.getByPlaceholder('Password').fill('secret123');
    await page.getByPlaceholder('Confirm password').fill('secret123');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Email already in use')).toBeVisible();
  });

  test('resume must be PDF or DOCX', async ({ page }) => {
    await page.goto('/register');
    // learner mode by default
    const fileInput = page.getByLabel('Resume');
    await expect(fileInput).toBeVisible();
    // Create a dummy .txt file buffer via evaluate: use DataTransfer not trivial, use setInputFiles with Buffer
    const buffer = Buffer.from('fake text file');
    await fileInput.setInputFiles({ name: 'resume.txt', mimeType: 'text/plain', buffer });
    await expect(page.getByText('Resume must be a PDF or DOCX file only')).toBeVisible();
  });
});
