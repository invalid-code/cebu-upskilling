import { test, expect } from './fixtures.js';
import { mockApi, setAuth } from './helpers.js';

/**
 * Visual regression (Requirements 25.5, 25.8): the 10 most-visited pages at
 * 360, 768 and 1280px in light and dark themes = 60 screenshots.
 *
 * Determinism:
 *  - `reducedMotion: 'reduce'` makes the WaterCanvas gate return `static`, so the
 *    static SVG fallback renders; WebGL is also disabled as a belt-and-braces guard.
 *  - The API is mocked with fixed data; the browser clock, locale and timezone are fixed.
 *  - Animations are disabled by the screenshot call, the caret is hidden and fonts are awaited.
 *
 * Failure threshold is 0.1% of pixels (maxDiffPixelRatio: 0.001). Playwright keeps
 * the expected / actual / diff images in test-results/ on every failure.
 *
 * Baselines live in e2e/visual.spec.js-snapshots/. Regenerate with:
 *   npx playwright test e2e/visual.spec.js --update-snapshots
 */

const FIXED_NOW = new Date('2025-01-15T10:00:00+08:00');

const VIEWPORTS = [
  { width: 360, height: 800 },
  { width: 768, height: 1024 },
  { width: 1280, height: 800 },
];
const THEMES = ['light', 'dark'];

const USERS = {
  learner: {
    token: 'e2e-learner-token',
    user: { userId: 1, firstName: 'Jose', lastName: 'Rizal', role: 'Learner', targetRole: 'Frontend Developer' },
  },
  recruiter: {
    token: 'e2e-recruiter-token',
    user: { userId: 2, firstName: 'Maria', lastName: 'Santos', role: 'Recruiter', companyId: 1 },
  },
  provider: {
    token: 'e2e-provider-token',
    user: { userId: 3, firstName: 'Paolo', lastName: 'Reyes', role: 'CourseProvider' },
  },
};

const gaps = [
  { skillId: 1, skillName: 'React', category: 'Frontend', requiredLevel: 4, currentLevel: 3, gap: 1, verified: true },
  { skillId: 2, skillName: 'TypeScript', category: 'Frontend', requiredLevel: 4, currentLevel: 1, gap: 3, verified: false },
  { skillId: 3, skillName: 'Testing', category: 'Tooling', requiredLevel: 3, currentLevel: 3, gap: 0, verified: true },
];

const posts = [
  {
    postId: 501,
    title: 'Frontend Developer',
    companyId: 1,
    companyName: 'Acme Corp',
    description: 'Build accessible, fast interfaces for our Cebu-based product team.\nSkills: React, TypeScript',
    requirements: '3+ years with React\nStrong CSS fundamentals',
    benefits: 'HMO from day one\nHybrid schedule',
    location: 'Cebu City',
    salaryRange: 'PHP 60,000 - 80,000',
    jobType: 'Full-time',
    experienceLevel: 'Mid',
    isRemote: false,
    isActive: true,
    createdAt: '2025-01-10T08:00:00Z',
    expiresAt: '2025-03-10T08:00:00Z',
    matchPercent: 72,
    requiredSkills: [
      { skillId: 1, skillName: 'React', requiredLevel: 4 },
      { skillId: 2, skillName: 'TypeScript', requiredLevel: 4 },
    ],
  },
  {
    postId: 502,
    title: 'Customer Support Associate',
    companyId: 1,
    companyName: 'Acme Corp',
    description: 'Help customers across chat and email.',
    location: 'Mandaue',
    salaryRange: 'PHP 25,000 - 30,000',
    jobType: 'Part-time',
    experienceLevel: 'Entry',
    isRemote: true,
    isActive: true,
    createdAt: '2025-01-08T08:00:00Z',
    matchPercent: 48,
    requiredSkills: [{ skillId: 3, skillName: 'Testing', requiredLevel: 2 }],
  },
  {
    postId: 503,
    title: 'Backend Engineer',
    companyId: 1,
    companyName: 'Acme Corp',
    description: 'Design and ship APIs.\nSkills: C#, SQL',
    location: 'Lapu-Lapu',
    salaryRange: 'PHP 70,000 - 90,000',
    jobType: 'Contract',
    experienceLevel: 'Senior',
    isRemote: false,
    isActive: true,
    createdAt: '2025-01-05T08:00:00Z',
    matchPercent: null,
  },
];

const enrolledCourses = [
  {
    courseId: 7,
    name: 'Modern React in Practice',
    description: 'Hooks, state and testing for production React apps.',
    mode: 'Online',
    skillCategory: 'Frontend',
    progressPercent: 40,
    lastAccessed: '2025-01-14T09:00:00Z',
  },
];
const recommendedCourses = [
  {
    courseId: 8,
    name: 'TypeScript for Teams',
    description: 'Type-safe patterns for large codebases.',
    mode: 'Online',
    skillCategory: 'Frontend',
    technicalLevel: 6,
  },
  {
    courseId: 9,
    name: 'Testing with Playwright',
    description: 'End-to-end testing that stays stable.',
    mode: 'Online',
    skillCategory: 'Tooling',
    technicalLevel: 4,
  },
];

const courseContent = {
  courseId: 7,
  courseName: 'Modern React in Practice',
  progressPercent: 40,
  totalLessons: 4,
  currentLesson: {
    lessonId: 71,
    name: 'Composing components',
    description: 'Learn how to compose small components into larger interfaces.',
    media: [],
    contentBlocks: [
      { blockType: 'heading', content: 'Why composition' },
      { blockType: 'text', content: 'Composition keeps components small, testable and easy to reuse across pages.' },
      { blockType: 'code', content: 'function Card({ title, children }) {\n  return <section><h2>{title}</h2>{children}</section>;\n}' },
    ],
  },
  modules: [
    {
      moduleNumber: 1,
      name: 'Foundations',
      completedLessonCount: 1,
      lessons: [
        { lessonId: 70, name: 'Welcome', durationMinutes: 5, isCompleted: true },
        { lessonId: 71, name: 'Composing components', durationMinutes: 12, isCompleted: false },
        { lessonId: 72, name: 'State and effects', durationMinutes: 18, isCompleted: false },
        { lessonId: 73, name: 'Testing components', durationMinutes: 15, isCompleted: false },
      ],
    },
  ],
};

const businessStats = {
  company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
  talentPool: { totalLearners: 120, avgSkillLevel: 3.4 },
  jobPostings: [
    {
      postId: 501,
      title: 'Frontend Developer',
      description: 'Build accessible, fast interfaces for our Cebu-based product team.',
      jobType: 'Full-time',
      location: 'Cebu City',
      isRemote: false,
      salaryRange: 'PHP 60,000 - 80,000',
      experienceLevel: 'Mid',
      isActive: true,
    },
    {
      postId: 502,
      title: 'Customer Support Associate',
      description: 'Help customers across chat and email.',
      jobType: 'Part-time',
      location: 'Mandaue',
      isRemote: true,
      salaryRange: 'PHP 25,000 - 30,000',
      experienceLevel: 'Entry',
      isActive: true,
    },
  ],
  skillDemand: [
    { skillName: 'React', requiredForRoles: 8, learnerCount: 40, avgLearnerLevel: 3.1 },
    { skillName: 'TypeScript', requiredForRoles: 6, learnerCount: 25, avgLearnerLevel: 2.4 },
    { skillName: 'SQL', requiredForRoles: 4, learnerCount: 18, avgLearnerLevel: 2.9 },
  ],
};

const providerCourses = [
  {
    courseId: 7,
    name: 'Modern React in Practice',
    description: 'Hooks, state and testing for production React apps.',
    status: 'Published',
    mode: 'Online',
    moduleCount: 4,
    lessonCount: 22,
  },
  {
    courseId: 8,
    name: 'TypeScript for Teams',
    description: 'Type-safe patterns for large codebases.',
    status: 'Draft',
    mode: 'Online',
    moduleCount: 2,
    lessonCount: 9,
  },
];

/** Fixed API data shared by every page. Keys follow helpers.mockApi (exact path wins over prefix). */
const API = {
  'GET /api/stats/public': { jobCount: 42, courseCount: 18 },
  'GET /api/courses': recommendedCourses.map((c) => ({ ...c, genre: { name: 'Frontend' } })),
  'GET /api/enrollments': [],
  'GET /api/applications': [],
  'GET /api/skillgaps': [{ role: 'Frontend Developer', gaps }],
  'GET /api/skillgaps/groups': [{ postId: 501, gaps: gaps.filter((g) => g.gap > 0) }],
  'GET /api/assessments/recommended': null,
  'GET /api/stats/week': { learningTimeHours: 6, coursesActive: 1, jobsWorthApplying: 3 },
  'GET /api/coursespage': {
    enrolledCourses,
    recommendedCourses,
    dayStreak: 4,
    coursesInProgress: 1,
    certificatesEarned: 2,
    availableCategories: ['Frontend', 'Tooling'],
  },
  'GET /api/posts': { items: posts, total: posts.length, page: 1, pageSize: 9 },
  'GET /api/posts/501': posts[0],
  'GET /api/companies/1': {
    companyId: 1,
    name: 'Acme Corp',
    industry: 'Software',
    companySize: '50-200',
    location: 'Cebu City',
    description: 'A product studio building tools for Philippine teams.',
  },
  'GET /api/coursecontent/courses/7/content': courseContent,
  'GET /api/stats/business': businessStats,
  'GET /api/company/courses': providerCourses,
};

const PAGES = [
  { name: 'landing', path: '/', role: null },
  { name: 'login', path: '/login', role: null },
  { name: 'register', path: '/register', role: null },
  { name: 'dashboard', path: '/dashboard', role: 'learner' },
  { name: 'jobs', path: '/jobs', role: 'learner' },
  { name: 'job-detail', path: '/jobs/501', role: 'learner' },
  { name: 'courses', path: '/courses', role: 'learner' },
  { name: 'course-player', path: '/courses/7/learn/71', role: 'learner' },
  { name: 'business-dashboard', path: '/business-dashboard', role: 'recruiter' },
  { name: 'provider-dashboard', path: '/provider-dashboard', role: 'provider' },
];

// Reduced motion => WaterCanvas gate returns `static` (SVG fallback).
test.use({ reducedMotion: 'reduce', locale: 'en-US', timezoneId: 'Asia/Manila', colorScheme: 'light' });

/**
 * Chromium enlarges the layout viewport for a full-page capture, which re-resolves `vh`/`dvh`
 * (e.g. the shell's `min-height: 100vh`) and makes the page height chase the capture height.
 * Rewriting those lengths to px at the real viewport height pins the layout the user sees.
 */
async function freezeViewportUnits(page) {
  await page.evaluate(() => {
    const vh = window.innerHeight / 100;
    const toPx = (value) => value.replace(/(-?\d*\.?\d+)(?:d|s|l)?vh\b/g, (_, n) => `${(Number(n) * vh).toFixed(2)}px`);
    const visit = (rules) => {
      for (const rule of rules) {
        if (rule.style) {
          for (const prop of Array.from(rule.style)) {
            const value = rule.style.getPropertyValue(prop);
            if (/vh\b/.test(value)) {
              rule.style.setProperty(prop, toPx(value), rule.style.getPropertyPriority(prop));
            }
          }
        }
        if (rule.cssRules) visit(rule.cssRules);
      }
    };
    for (const sheet of Array.from(document.styleSheets)) {
      try {
        visit(sheet.cssRules);
      } catch {
        // cross-origin sheet: not readable, and not ours
      }
    }
  });
}

test.beforeEach(async ({ page }) => {
  // No WebGL context at all: the canvas can only ever render its static fallback.
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function getContext(type, ...rest) {
      if (typeof type === 'string' && type.toLowerCase().includes('webgl')) return null;
      return original.call(this, type, ...rest);
    };
  });
  await page.clock.setFixedTime(FIXED_NOW);
});

for (const pageDef of PAGES) {
  for (const theme of THEMES) {
    for (const viewport of VIEWPORTS) {
      test(`${pageDef.name} @${viewport.width} ${theme}`, async ({ page }) => {
        test.setTimeout(60_000);

        await page.setViewportSize(viewport);
        await page.addInitScript((mode) => localStorage.setItem('theme', mode), theme);
        if (pageDef.role) await setAuth(page, USERS[pageDef.role]);
        await mockApi(page, API);

        await page.goto(pageDef.path);
        // The first hit on a cold dev server compiles lazy route chunks; allow for it.
        await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 30_000 });
        await page.waitForLoadState('networkidle');
        await page.evaluate(() => document.fonts.ready);
        // Loading skeletons and "Loading…" statuses must be gone before capture.
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
        await freezeViewportUnits(page);
        // The first full-page capture settles scroll containers (e.g. the lesson code block's
        // overflow-x area grows ~3px once); a throwaway capture makes the asserted one stable.
        await page.screenshot({ fullPage: true, animations: 'disabled', caret: 'hide' });

        await expect(page).toHaveScreenshot(`${pageDef.name}-${viewport.width}-${theme}.png`, {
          fullPage: true,
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.001,
        });
      });
    }
  }
}
