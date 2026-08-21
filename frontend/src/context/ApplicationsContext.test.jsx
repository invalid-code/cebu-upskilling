import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from './AuthContext';
import { ApplicationsProvider, useApplications } from './ApplicationsContext';

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { api } from '../api/client';

const job = { id: 7, title: 'Frontend Developer', company: 'Acme Corp', targetRole: 'Frontend Developer' };

function ApplicationsProbe() {
  const { applications, applyToJob, isApplied, updateStatus, loading } = useApplications();
  return (
    <div>
      <span data-testid="loading">{loading ? 'loading' : 'idle'}</span>
      <span data-testid="count">{applications.length}</span>
      <span data-testid="titles">{applications.map((a) => a.title).join(',')}</span>
      <span data-testid="status">{applications.map((a) => a.status).join(',')}</span>
      <button onClick={() => applyToJob(job)}>apply</button>
      <button onClick={() => updateStatus(job.id, 'saved')}>save</button>
      <span data-testid="is-applied">{isApplied(job.id) ? 'yes' : 'no'}</span>
    </div>
  );
}

function renderWithApplications() {
  localStorage.setItem('user', JSON.stringify({ firstName: 'Test', UserId: 1, role: 'Learner' }));
  localStorage.setItem('token', 'abc');
  return render(
    <AuthProvider>
      <ApplicationsProvider>
        <ApplicationsProbe />
      </ApplicationsProvider>
    </AuthProvider>,
  );
}

describe('ApplicationsContext', () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    api.post.mockReset();
    api.patch.mockReset();
  });

  it('fetches and normalizes applications for a signed-in user', async () => {
    api.get.mockResolvedValue([
      { postId: 1, title: 'Backend Dev', company: 'X', targetRole: 'Backend', status: 'applied', appliedAt: 't', savedAt: null },
    ]);

    renderWithApplications();

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(api.get).toHaveBeenCalledWith('/applications', { signal: expect.anything() });
    expect(screen.getByTestId('titles')).toHaveTextContent('Backend Dev');
  });

  it('does not fetch applications when there is no user', async () => {
    localStorage.clear();

    render(
      <AuthProvider>
        <ApplicationsProvider>
          <ApplicationsProbe />
        </ApplicationsProvider>
      </AuthProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    expect(api.get).not.toHaveBeenCalled();
  });

  it('falls back to an empty list when the fetch fails', async () => {
    api.get.mockRejectedValue(new Error('boom'));

    renderWithApplications();

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
  });

  it('applyToJob posts the application and appends it to the list', async () => {
    api.get.mockResolvedValue([]);
    api.post.mockResolvedValue({ postId: 7, title: 'Frontend Developer', company: 'Acme Corp', targetRole: 'Frontend Developer', status: 'applied', appliedAt: 'now', savedAt: null });

    renderWithApplications();

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('0'));
    fireEvent.click(screen.getByText('apply'));

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(api.post).toHaveBeenCalledWith('/applications', { postId: 7 });
    expect(screen.getByTestId('is-applied')).toHaveTextContent('yes');
  });

  it('applyToJob ignores duplicate applications', async () => {
    api.get.mockResolvedValue([{ postId: 7, title: 'Frontend Developer', company: 'Acme', targetRole: 'x', status: 'applied', appliedAt: 't', savedAt: null }]);
    api.post.mockResolvedValue({});

    renderWithApplications();
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));

    fireEvent.click(screen.getByText('apply'));
    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('updateStatus patches the backend and updates the local status', async () => {
    api.get.mockResolvedValue([{ postId: 7, title: 'Frontend Developer', company: 'Acme', targetRole: 'x', status: 'applied', appliedAt: 't', savedAt: null }]);
    api.patch.mockResolvedValue(undefined);

    renderWithApplications();

    await waitFor(() => expect(screen.getByTestId('count')).toHaveTextContent('1'));
    fireEvent.click(screen.getByText('save'));

    await waitFor(() => expect(screen.getByTestId('status')).toHaveTextContent('saved'));
    expect(api.patch).toHaveBeenCalledWith('/applications/7', { status: 'saved' });
  });
});