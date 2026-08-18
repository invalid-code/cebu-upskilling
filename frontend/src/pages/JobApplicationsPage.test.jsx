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