import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext';
import JobApplicationsPage from './JobApplicationsPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

import { api } from '../api/client';

const applications = [
  {
    applicationId: 11,
    postId: 7,
    postTitle: 'DevOps Engineer',
    learnerId: 3,
    learnerName: 'Jose Rizal',
    learnerEmail: 'jose@example.com',
    status: 'applied',
    appliedAt: '2026-01-15T00:00:00Z',
    resumeUrl: 'https://storage.example/resume.pdf',
    coverLetterUrl: null,
  },
];

describe('JobApplicationsPage', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ UserId: 2, firstName: 'Test', role: 'Recruiter' }));
    localStorage.setItem('token', 'abc');
    api.get.mockReset();
    api.patch.mockReset();
    api.get.mockResolvedValue(applications);
  });

  function renderPage() {
    return render(
      <MemoryRouter>
        <ToastProvider>
          <JobApplicationsPage />
        </ToastProvider>
      </MemoryRouter>,
    );
  }

  it('lists applications with learner details and documents', async () => {
    renderPage();
    expect(await screen.findByText('Jose Rizal')).toBeInTheDocument();
    expect(screen.getByText('jose@example.com · Applied Jan 15, 2026')).toBeInTheDocument();
    expect(screen.getByText('DevOps Engineer')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Resume' })).toHaveAttribute('href', 'https://storage.example/resume.pdf');
  });

  it('updates the status when the dropdown changes', async () => {
    api.patch.mockResolvedValue({ status: 'interview' });
    renderPage();
    await screen.findByText('Jose Rizal');

    fireEvent.change(screen.getByRole('combobox', { name: 'Status for Jose Rizal' }), { target: { value: 'interview' } });

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/applications/employer/11', { status: 'interview' });
    });
  });

  it('opens the applicant profile modal with documents and skills', async () => {
    api.get.mockResolvedValueOnce(applications);
    api.get.mockResolvedValueOnce({
      applicationId: 11,
      postId: 7,
      postTitle: 'DevOps Engineer',
      learnerId: 3,
      learnerName: 'Jose Rizal',
      learnerEmail: 'jose@example.com',
      targetRole: 'DevOps Engineer',
      status: 'applied',
      appliedAt: '2026-01-15T00:00:00Z',
      resumeUrl: 'https://storage.example/resume.pdf',
      coverLetterUrl: 'https://storage.example/cover.pdf',
      skills: [
        { name: 'Docker', currentLevel: 4, verified: true },
        { name: 'Kubernetes', currentLevel: 3, verified: false },
      ],
    });
    renderPage();
    await screen.findByText('Jose Rizal');

    fireEvent.click(screen.getByRole('button', { name: 'View profile of Jose Rizal' }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/applications/employer/11');
    });
    expect(await screen.findByText('Submitted documents')).toBeInTheDocument();
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: 'Resume' })).toHaveAttribute('href', 'https://storage.example/resume.pdf');
    expect(within(dialog).getByRole('link', { name: 'Cover letter' })).toHaveAttribute('href', 'https://storage.example/cover.pdf');
    expect(screen.getByText('Docker')).toBeInTheDocument();
    expect(screen.getByText('Level 4')).toBeInTheDocument();
  });

  it('shows "Not ranked" in the table and pane before ranking', async () => {
    api.get.mockResolvedValueOnce(applications).mockResolvedValueOnce({ ...applications[0], skills: [] });
    renderPage();
    await screen.findByText('Jose Rizal');
    expect(screen.getByText('Not ranked')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View profile of Jose Rizal' }));
    const dialog = await screen.findByRole('dialog');
    expect(within(dialog).getByText('Not ranked')).toBeInTheDocument();
    expect(await within(dialog).findByText('No skills tracked yet.')).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close applicant detail' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows an error with retry in the pane when the profile fails to load', async () => {
    api.get
      .mockResolvedValueOnce(applications)
      .mockRejectedValueOnce(new Error('Profile down'))
      .mockResolvedValueOnce({ ...applications[0], skills: [{ name: 'Docker', currentLevel: 2 }] });
    renderPage();
    await screen.findByText('Jose Rizal');
    fireEvent.click(screen.getByRole('button', { name: 'View profile of Jose Rizal' }));
    expect(await screen.findByText('Profile down')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByText('Docker')).toBeInTheDocument();
  });

  it('ranks candidates with AI and shows the score', async () => {
    api.get.mockImplementation((path) => Promise.resolve(
      path === '/applications/employer'
        ? applications
        : { candidates: [{ applicationId: 11, score: 87.4, rationale: 'Strong match' }] },
    ));
    renderPage();
    await screen.findByText('Jose Rizal');
    fireEvent.click(screen.getByRole('button', { name: /Rank with AI/ }));
    expect(await screen.findByText('87%')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/hiring-agent/posts/7/rank-applicants');
    expect(screen.queryByText('Not ranked')).not.toBeInTheDocument();
  });

  it.each([502, 503])('keeps applicants unranked and status actions enabled on AI %i', async (status) => {
    api.get.mockImplementation((path) => (path === '/applications/employer'
      ? Promise.resolve(applications)
      : Promise.reject(Object.assign(new Error('bad gateway'), { status }))));
    renderPage();
    await screen.findByText('Jose Rizal');
    fireEvent.click(screen.getByRole('button', { name: /Rank with AI/ }));
    expect(await screen.findByText('Suggestions are unavailable right now')).toBeInTheDocument();
    expect(screen.getByText('Not ranked')).toBeInTheDocument();
    expect(screen.getByText('Jose Rizal')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Status for Jose Rizal' })).toBeEnabled();
    expect(screen.queryByText('bad gateway')).not.toBeInTheDocument();
  });

  it('shows a toast for other AI failures without the unavailable notice', async () => {
    api.get.mockImplementation((path) => (path === '/applications/employer'
      ? Promise.resolve(applications)
      : Promise.reject(Object.assign(new Error('Ranking exploded'), { status: 500 }))));
    renderPage();
    await screen.findByText('Jose Rizal');
    fireEvent.click(screen.getByRole('button', { name: /Rank with AI/ }));
    expect(await screen.findByText('Ranking exploded')).toBeInTheDocument();
    expect(screen.queryByText('Suggestions are unavailable right now')).not.toBeInTheDocument();
  });

  it('shows empty state when there are no applications', async () => {
    api.get.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('No applications yet')).toBeInTheDocument();
  });

  it('shows error state when the API fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    renderPage();
    expect(await screen.findByText('Applications unavailable')).toBeInTheDocument();
  });
});