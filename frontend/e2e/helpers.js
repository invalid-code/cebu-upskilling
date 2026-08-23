/**
 * Shared helpers for Playwright E2E tests.
 * All API mocking relies on page.route interception so no real backend is needed.
 */

/**
 * Install a localStorage seed before the app loads.
 * Call this before `page.goto(...)`.
 */
export async function setAuth(page, { user, token = 'e2e-test-token' } = {}) {
  await page.addInitScript(
    ({ userJson, token }) => {
      if (userJson) localStorage.setItem('user', userJson);
      if (token) localStorage.setItem('token', token);
    },
    { userJson: user ? JSON.stringify(user) : null, token },
  );
}

/** Clear auth via init script (force unauthenticated). */
export async function clearAuth(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  });
}

/** Minimal learners/recruiter fixtures */
export const learners = {
  jose: { firstName: 'Jose', lastName: 'Rizal', role: 'Learner', emailAddress: 'jose@example.com' },
  maria: { firstName: 'Maria', lastName: 'Santos', role: 'Recruiter', emailAddress: 'maria@tech.com' },
};

export const recruiterUser = {
  firstName: 'Employer',
  lastName: 'Corp',
  role: 'Recruiter',
  companyId: 1,
};

export const learnerUser = {
  firstName: 'Jose',
  lastName: 'Rizal',
  role: 'Learner',
  targetRole: '',
};

/** Build a minimal JWT with exp far in the future (optional, plain token also works). */
export function fakeJwt(payload = {}) {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).replace(/=+$/, '');
  const body = btoa(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600, ...payload }),
  ).replace(/=+$/, '');
  return `${header}.${body}.signature`;
}

/**
 * Mock any API call matching ** /api/**.
 * `handlers` is a map of { methodAndPathPrefix: handler }
 *   key examples: 'GET /api/posts', 'POST /api/auth/login', 'GET /api/coursespage'
 *   value can be: static JSON, a function (route) => void, or { status, body }
 */
export async function mockApi(page, handlers = {}) {
  await page.route('**/api/**', async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    // Do not intercept Vite's static file for the API client itself
    if (url.pathname.startsWith('/src/api/') || url.pathname.startsWith('/@vite/') || url.pathname.startsWith('/node_modules/')) {
      await route.continue();
      return;
    }
    if (!url.pathname.startsWith('/api/')) {
      await route.continue();
      return;
    }
    const method = req.method();
    // Normalize: strip host, keep /api prefix
    const pathWithQuery = url.pathname + url.search;
    // Also try without search for exact matching
    const keyExact = `${method} ${pathWithQuery}`;
    const keyPrefix = `${method} ${url.pathname}`;

    // Find first matching handler
    let handler = handlers[keyExact] ?? handlers[keyPrefix];

    if (!handler) {
      // Fallback: try loose match where key is substring of path
      for (const [k, v] of Object.entries(handlers)) {
        const [m, p] = k.split(' ');
        if (m === method && pathWithQuery.startsWith(p)) {
          handler = v;
          break;
        }
        if (m === method && url.pathname.startsWith(p)) {
          handler = v;
          break;
        }
      }
    }

    if (handler) {
      if (typeof handler === 'function') {
        await handler(route);
        return;
      }
      if (handler && typeof handler === 'object' && 'status' in handler) {
        await route.fulfill({
          status: handler.status,
          contentType: 'application/json',
          body: handler.body != null ? JSON.stringify(handler.body) : '',
        });
        return;
      }
      // static body -> 200 JSON
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(handler),
      });
      return;
    }

    // Default: empty success to avoid hard failures for unmocked GETs during navigation
    if (method === 'GET') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({}) });
  });
}

/** Convenience: common mocks for an authenticated learner shell (overview, etc.) */
export async function mockLearnerShell(page) {
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
    'GET /api/stats/business': {
      company: { name: 'Acme Corp', jobPostings: 0, recruiters: 1 },
      talentPool: { totalLearners: 0, avgSkillLevel: 0 },
      jobPostings: [],
      skillDemand: [],
    },
    'GET /api/posts': { items: [], total: 0, page: 1, pageSize: 9 },
  });
}

export async function mockRecruiterShell(page) {
  await mockApi(page, {
    'GET /api/stats/business': {
      company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
      talentPool: { totalLearners: 120, avgSkillLevel: 3.4 },
      jobPostings: [],
      skillDemand: [],
    },
    'GET /api/courses': [],
    'GET /api/enrollments': [],
    'GET /api/skillgaps': [],
    'GET /api/applications': [],
  });
}

/** Helper to intercept a single POST and capture payload for assertions */
export function capturePost(page, path) {
  let captured = null;
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  page.route(`**${path}`, async (route) => {
    if (route.request().method() === 'POST') {
      try {
        captured = JSON.parse(route.request().postData() || '{}');
      } catch {
        captured = route.request().postData();
      }
      resolve(captured);
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ token: 'captured', firstName: 'x' }) });
    } else {
      await route.continue();
    }
  });
  return { promise, get captured() { return captured; } };
}
