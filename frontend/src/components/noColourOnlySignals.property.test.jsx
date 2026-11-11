import { render, screen, cleanup, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import fc from 'fast-check';
import { MemoryRouter } from 'react-router-dom';

/**
 * Feature: frontend-design, Property 7: No colour-only signals
 * **Validates: Requirements 21.8**
 *
 * Every application, assessment/integrity and lesson status must render visible text, or an icon
 * with an accessible name, in addition to any colour cue.
 */

const appState = { applications: [] };

vi.mock('../context/ApplicationsContext', () => ({
  useApplications: () => ({ applications: appState.applications, loading: false, error: null, fetchApplications: vi.fn() }),
}));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }));
vi.mock('../api/client', () => ({ api: { get: vi.fn(), post: vi.fn() } }));
vi.mock('../lib/proctoring', () => ({ createProctor: vi.fn() }));

import { api } from '../api/client';
import { createProctor } from '../lib/proctoring';
import ApplicationsPage from '../pages/ApplicationsPage';
import ModuleOutline from './shared/ModuleOutline';
import AssessmentModal from './ui/AssessmentModal';

const RUNS = { numRuns: 100 };

/** True when the element has visible text, or a descendant icon/image with an accessible name. */
function hasTextOrLabelledIcon(el) {
  const clone = el.cloneNode(true);
  clone.querySelectorAll('[aria-hidden="true"], [aria-hidden=""]').forEach((n) => n.remove());
  if ((clone.textContent || '').trim().length > 0) return true;
  return Array.from(el.querySelectorAll('svg[aria-label], [role="img"][aria-label], img[alt]')).some(
    (n) => (n.getAttribute('aria-label') || n.getAttribute('alt') || '').trim().length > 0,
  );
}

afterEach(cleanup);

describe('Property 7: no colour-only signals', () => {
  it('application status badge and timeline stages carry text for every status', () => {
    const statuses = ['applied', 'interview', 'review', 'saved', 'rejected', 'hired'];
    fc.assert(
      fc.property(fc.constantFrom(...statuses), fc.string({ minLength: 1, maxLength: 12 }), (status, title) => {
        appState.applications = [{ id: 'j1', title: `Job ${title}`, company: 'Acme', status, appliedAt: '2024-01-05T00:00:00Z' }];
        const { unmount } = render(<MemoryRouter><ApplicationsPage /></MemoryRouter>);
        const badge = screen.getByText('Status').nextElementSibling;
        const ok = !!badge && hasTextOrLabelledIcon(badge);
        const stages = Array.from(document.querySelectorAll('ol[aria-label="Application progress"] > li'));
        const stagesOk = stages.length > 0 && stages.every((li) => {
          // The state of a stage must be conveyed in text, not just by the marker colour.
          const withoutName = (li.textContent || '').replace(li.querySelector('span:nth-of-type(2)')?.textContent || '', '').trim();
          return /completed|current|not reached/.test(withoutName);
        });
        unmount();
        return ok && stagesOk;
      }),
      RUNS,
    );
  });

  it('lesson completion state is conveyed beyond colour for every lesson state', () => {
    fc.assert(
      fc.property(
        fc.array(fc.boolean(), { minLength: 1, maxLength: 6 }),
        fc.nat(5),
        (completedFlags, currentRaw) => {
          const lessons = completedFlags.map((isCompleted, i) => ({
            lessonId: `l${i}`, name: `Lesson-${i}`, durationMinutes: 5 + i, isCompleted,
          }));
          const currentId = `l${currentRaw % lessons.length}`;
          const modules = [{ moduleNumber: 1, name: 'Intro', lessons }];
          const { unmount } = render(<ModuleOutline modules={modules} currentLessonId={currentId} onLessonClick={() => {}} />);
          const ok = lessons.every((lesson, i) => {
            const row = screen.getByText(lesson.name).parentElement.parentElement;
            const rest = (row.textContent || '')
              .replace(lesson.name, '')
              .replace(`${lesson.durationMinutes} min`, '')
              .trim();
            const expected = lesson.isCompleted ? /completed/i : lessons[i].lessonId === currentId ? /current/i : /not started/i;
            return rest.length > 0 && expected.test(rest);
          });
          unmount();
          return ok;
        },
      ),
      RUNS,
    );
  });
});

describe('Property 7: assessment and integrity statuses', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.post.mockResolvedValue({});
    api.get.mockResolvedValue({
      skillName: 'JS', source: 'AI', companyName: null, timeLimitMinutes: 10,
      questions: [{ questionId: 'q1', text: 'Q?', options: ['a', 'b', 'c', 'd'] }],
    });
  });

  it('proctor status and integrity warnings are text-bearing for every status and event type', async () => {
    const proctorStatuses = ['idle', 'initializing', 'active', 'denied', 'unsupported', 'error'];
    const eventTypes = ['LookingAway', 'MultipleFaces', 'NoFace', 'PhoneDetected', 'Other'];
    await fc.assert(
      fc.asyncProperty(fc.constantFrom(...proctorStatuses), fc.constantFrom(...eventTypes), async (status, eventType) => {
        let handlers;
        createProctor.mockImplementation(async (opts) => {
          handlers = opts;
          return { stop: () => {} };
        });
        const { unmount } = render(
          <AssessmentModal open onClose={() => {}} assessmentId="a1" skillName="JS" proctored />,
        );
        const bar = await screen.findByTestId('proctor-bar');
        await waitFor(() => expect(handlers).toBeTruthy());
        await act(async () => {
          handlers.onStatus(status);
          if (status === 'active') handlers.onEvent(eventType, 'detail text');
        });
        // The proctor dot is aria-hidden colour only; the title text must name the state.
        const titles = {
          idle: 'Monitoring paused', initializing: 'Starting camera', active: 'Proctoring active',
          denied: 'Camera access denied', unsupported: 'Camera unavailable', error: 'Proctoring error',
        };
        let ok = hasTextOrLabelledIcon(bar) && (bar.textContent || '').includes(titles[status]);
        if (status === 'active') {
          const warning = await screen.findByTestId('integrity-warning');
          ok = ok && hasTextOrLabelledIcon(warning) && /integrity warning/i.test(warning.textContent);
        }
        unmount();
        return ok;
      }),
      RUNS,
    );
  }, 120000);
});
