import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fc from 'fast-check';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ApplicationsProvider } from '../context/ApplicationsContext';
import { EnrollmentsProvider } from '../context/EnrollmentsContext';
import { useApplicationsStore } from '../stores/applicationsStore';
import { useToastStore } from '../stores/toastStore';
import JobDetailPage from './JobDetailPage';
import CourseCard from '../components/shared/CourseCard';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    upload: vi.fn(),
  },
}));

import { api } from '../api/client';

/**
 * Feature: frontend-design, Property 9: Idempotent actions
 * **Validates: Requirements 7.9, 8.3**
 */

const NUM_RUNS = 100;

const toasts = [];
let unsubscribe;

beforeEach(() => {
  vi.clearAllMocks();
  toasts.length = 0;
  useToastStore.getState()._reset();
  useApplicationsStore.getState()._reset();
  unsubscribe = useToastStore.subscribe((state) => {
    if (state.toast) toasts.push(state.toast);
  });
});

afterEach(() => {
  unsubscribe();
  cleanup();
});

const errorToasts = () => toasts.filter((t) => t.variant === 'error');

// ---------------------------------------------------------------------------
// Apply (JobDetailPage)
// ---------------------------------------------------------------------------

const jobArb = fc.record({
  postId: fc.integer({ min: 1, max: 100000 }),
  title: fc.constantFrom('DevOps Engineer', 'Data Analyst', 'QA Tester', 'Frontend Developer'),
  companyName: fc.constantFrom('CloudNine', 'Visayas Tech', 'Cebu Labs'),
});

const applyScenarioArb = fc.record({
  job: jobArb,
  // Whether the learner has already applied before the page loads.
  initiallyApplied: fc.boolean(),
  // Each attempt is a burst of 1-3 synchronous clicks on the apply control (double clicks included).
  attempts: fc.array(fc.integer({ min: 1, max: 3 }), { minLength: 2, maxLength: 5 }),
});

function renderJob(job, applications) {
  const post = {
    postId: job.postId,
    title: job.title,
    companyName: job.companyName,
    targetRole: job.title,
    description: 'desc',
    jobType: 'Full-time',
    isRemote: true,
    isActive: true,
    expiresAt: '2999-12-31T00:00:00Z',
    createdAt: '2026-01-10T00:00:00Z',
  };
  api.get.mockImplementation((url) => {
    if (url === '/applications') return Promise.resolve(applications);
    if (url === '/skillgaps/groups') return Promise.resolve([]);
    if (url.startsWith('/posts/')) return Promise.resolve(post);
    return Promise.reject(new Error(`unexpected ${url}`));
  });
  api.post.mockImplementation((url, body) =>
    Promise.resolve({
      postId: body.postId,
      title: job.title,
      company: job.companyName,
      targetRole: job.title,
      status: 'applied',
      appliedAt: '2026-01-15T00:00:00Z',
      resumeUrl: body.resumeUrl,
    }),
  );
  localStorage.setItem(
    'user',
    JSON.stringify({ UserId: 1, firstName: 'Test', role: 'Learner', resumeUrl: 'https://storage.example/profile.pdf' }),
  );
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={[`/jobs/${job.postId}`]}>
      <AuthProvider>
        <ApplicationsProvider>
          <ToastProvider>
            <Routes>
              <Route path="/jobs/:postId" element={<JobDetailPage />} />
            </Routes>
          </ToastProvider>
        </ApplicationsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Property 9: Idempotent actions — apply', () => {
  it('repeated apply attempts show the applied state, send at most one request and never an error toast', async () => {
    await fc.assert(
      fc.asyncProperty(applyScenarioArb, async ({ job, initiallyApplied, attempts }) => {
        vi.clearAllMocks();
        toasts.length = 0;
        useToastStore.getState()._reset();
        useApplicationsStore.getState()._reset();

        const existing = initiallyApplied
          ? [{ postId: job.postId, title: job.title, company: job.companyName, status: 'applied', appliedAt: '2026-01-15T00:00:00Z' }]
          : [];
        const { unmount } = renderJob(job, existing);

        for (let i = 0; i < attempts.length; i += 1) {
          const submit = screen.queryByRole('button', { name: 'Submit application' });
          const alreadyApplied = screen.queryByRole('button', { name: 'Already applied' });
          const control = submit || alreadyApplied || (await screen.findByRole('button', { name: /Submit application|Already applied/ }));
          for (let c = 0; c < attempts[i]; c += 1) fireEvent.click(control);
          // Settled: the applied state is shown and stays shown.
          await waitFor(() => expect(screen.getByRole('button', { name: 'Already applied' })).toBeDisabled());
        }

        expect(screen.getByRole('button', { name: 'Already applied' })).toBeDisabled();
        expect(screen.queryByRole('button', { name: 'Submit application' })).not.toBeInTheDocument();
        expect(errorToasts()).toHaveLength(0);
        expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        // No duplicate request effect: never more than one create, none when already applied.
        const creates = api.post.mock.calls.filter(([url]) => url === '/applications');
        expect(creates).toHaveLength(initiallyApplied ? 0 : 1);
        expect(useApplicationsStore.getState().applications.filter((a) => a.id === job.postId)).toHaveLength(1);
        unmount();
      }),
      { numRuns: NUM_RUNS },
    );
  }, 120000);
});

// ---------------------------------------------------------------------------
// Enroll (CourseCard, as rendered by CoursesPage)
// ---------------------------------------------------------------------------

const courseArb = fc.record({
  courseId: fc.integer({ min: 1, max: 100000 }),
  name: fc.constantFrom('Modern JavaScript', 'Intro to SQL', 'Cloud Basics', 'UX Writing'),
  provider: fc.constantFrom('CodeChum Learning', 'Cebu Academy'),
});

// How the server reports a course the learner is already enrolled in.
const alreadyEnrolledArb = fc.constantFrom('message', 'status409', 'errorMessage');

const enrollScenarioArb = fc.record({
  course: courseArb,
  // The first attempt either creates the enrollment or finds it already existing.
  firstOutcome: fc.constantFrom('created', 'message', 'status409', 'errorMessage'),
  // Later attempts (e.g. stale list, second tab, remount) always hit an existing enrollment.
  laterOutcomes: fc.array(alreadyEnrolledArb, { minLength: 1, maxLength: 4 }),
  extraClicks: fc.integer({ min: 0, max: 3 }),
});

function mockEnrollOutcome(outcome) {
  switch (outcome) {
    case 'created':
      return Promise.resolve({ message: 'Enrolled' });
    case 'message':
      return Promise.resolve({ message: 'Already enrolled in this course' });
    case 'status409':
      return Promise.reject(Object.assign(new Error('Conflict'), { status: 409 }));
    default:
      return Promise.reject(new Error('You are already enrolled in this course'));
  }
}

function renderCard(course) {
  localStorage.setItem('user', JSON.stringify({ UserId: 1, firstName: 'Test', role: 'Learner' }));
  localStorage.setItem('token', 'abc');
  return render(
    <AuthProvider>
      <EnrollmentsProvider>
        <ToastProvider>
          <CourseCard course={course} />
        </ToastProvider>
      </EnrollmentsProvider>
    </AuthProvider>,
  );
}

describe('Property 9: Idempotent actions — enroll', () => {
  it('second and later enroll attempts show "Already enrolled", never an error toast, and send no duplicate request', async () => {
    await fc.assert(
      fc.asyncProperty(enrollScenarioArb, async ({ course, firstOutcome, laterOutcomes, extraClicks }) => {
        vi.clearAllMocks();
        toasts.length = 0;
        useToastStore.getState()._reset();
        api.get.mockResolvedValue([]);

        const outcomes = [firstOutcome, ...laterOutcomes];
        let postCalls = 0;
        for (let i = 0; i < outcomes.length; i += 1) {
          api.post.mockReset();
          api.post.mockImplementation(() => mockEnrollOutcome(outcomes[i]));
          const { unmount } = renderCard(course);

          fireEvent.click(screen.getByRole('button', { name: /enroll free/i }));
          const isCreate = i === 0 && outcomes[i] === 'created';
          if (isCreate) {
            await waitFor(() => expect(screen.getByText(/Course added to your pathway/)).toBeInTheDocument());
          } else {
            const done = await screen.findByRole('button', { name: /Already enrolled/ });
            expect(done).toBeDisabled();
            // Further attempts on the already-enrolled card are inert.
            for (let c = 0; c < extraClicks; c += 1) fireEvent.click(done);
            expect(screen.queryByRole('button', { name: /enroll free/i })).not.toBeInTheDocument();
            expect(errorToasts()).toHaveLength(0);
          }
          expect(api.post).toHaveBeenCalledTimes(1);
          expect(api.post).toHaveBeenCalledWith('/enrollments', { courseId: course.courseId });
          postCalls += api.post.mock.calls.length;
          unmount();
        }
        expect(errorToasts()).toHaveLength(0);
        expect(postCalls).toBe(outcomes.length);
      }),
      { numRuns: NUM_RUNS },
    );
  }, 120000);

  it('rapid repeated clicks before the response settles issue a single enroll request', async () => {
    await fc.assert(
      fc.asyncProperty(courseArb, fc.integer({ min: 2, max: 5 }), async (course, clicks) => {
        vi.clearAllMocks();
        toasts.length = 0;
        useToastStore.getState()._reset();
        api.get.mockResolvedValue([]);
        api.post.mockImplementation(() => mockEnrollOutcome('message'));
        const { unmount } = renderCard(course);

        const button = screen.getByRole('button', { name: /enroll free/i });
        for (let c = 0; c < clicks; c += 1) fireEvent.click(button);
        expect(await screen.findByRole('button', { name: /Already enrolled/ })).toBeDisabled();
        expect(api.post).toHaveBeenCalledTimes(1);
        expect(errorToasts()).toHaveLength(0);
        unmount();
      }),
      { numRuns: NUM_RUNS },
    );
  }, 120000);
});
