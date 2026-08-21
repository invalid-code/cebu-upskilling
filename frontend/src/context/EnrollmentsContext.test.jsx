import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from './AuthContext';
import { EnrollmentsProvider, useEnrollments } from './EnrollmentsContext';

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { api } from '../api/client';

function EnrollmentsProbe() {
  const { enrollments, isEnrolled, refreshEnrollments } = useEnrollments();
  return (
    <div>
      <span data-testid="count">{enrollments.length}</span>
      <span data-testid="ids">{enrollments.map((e) => e.courseId).join(',')}</span>
      <span data-testid="enrolled">{isEnrolled(10) ? 'yes' : 'no'}</span>
      <button onClick={refreshEnrollments}>refresh</button>
    </div>
  );
}

function renderWithEnrollments() {
  localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner' }));
  localStorage.setItem('token', 'abc');
  return render(
    <AuthProvider>
      <EnrollmentsProvider>
        <EnrollmentsProbe />
      </EnrollmentsProvider>
    </AuthProvider>,
  );
}

describe('EnrollmentsContext', () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
  });

  it('fetches enrollments for a signed-in user', async () => {
    api.get.mockResolvedValue([{ courseId: 10 }, { courseId: 11 }]);

    renderWithEnrollments();

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('2'));
    expect(api.get).toHaveBeenCalledWith('/enrollments', { signal: expect.anything() });
    expect(screen.getByTestId('enrolled')).toHaveTextContent('yes');
  });

  it('uses an empty list when no user is present', async () => {
    localStorage.clear();

    render(
      <AuthProvider>
        <EnrollmentsProvider>
          <EnrollmentsProbe />
        </EnrollmentsProvider>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(api.get).not.toHaveBeenCalled();
  });

  it('falls back to an empty list when the fetch fails', async () => {
    api.get.mockRejectedValue(new Error('boom'));

    renderWithEnrollments();

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
  });

  it('refreshEnrollments refetches the list', async () => {
    api.get.mockResolvedValue([]);

    renderWithEnrollments();
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));

    api.get.mockResolvedValue([{ courseId: 99 }]);
    fireEvent.click(screen.getByText('refresh'));

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(screen.getByTestId('ids')).toHaveTextContent('99');
  });
});