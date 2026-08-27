import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import BusinessDashboardPage from './BusinessDashboardPage';

vi.mock('../api/client', () => ({ api: { get: vi.fn(), delete: vi.fn() } }));
import { api } from '../api/client';

const response = {
  company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
  talentPool: { totalLearners: 48, skillsTracked: 80, avgSkillLevel: 2.7 },
  jobPostings: [{ postId: 1, title: 'Frontend Developer', description: 'Build great products.', requiredCourses: [{ courseId: 1, name: 'JavaScript foundations', discipline: 'Technology', technicalLevel: 18, mode: 'Online' }] }],
  skillDemand: [{ skillName: 'JavaScript', category: 'Language', requiredForRoles: 5, avgRequiredLevel: 3.5, learnerCount: 12, avgLearnerLevel: 2.4 }],
};

function renderPage() {
  return render(<MemoryRouter><AuthProvider><ToastProvider><BusinessDashboardPage /></ToastProvider></AuthProvider></MemoryRouter>);
}

describe('BusinessDashboardPage', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Acme', role: 'Recruiter' }));
    localStorage.setItem('token', 'abc');
    api.get.mockReset();
    api.delete.mockReset();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  it('renders stats, postings, and both skill charts', async () => {
    api.get.mockResolvedValue(response);
    renderPage();
    expect(await screen.findByText('Business Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Skills in demand')).toBeInTheDocument();
    expect(screen.getByText('Learner coverage per skill')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    renderPage();
    expect(await screen.findByText('Business dashboard unavailable')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('deletes a posting via the base-relative path and refreshes without reload', async () => {
    const user = userEvent.setup();
    api.get
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce({ ...response, jobPostings: [], company: { ...response.company, jobPostings: 0 } });
    api.delete.mockResolvedValue(undefined);

    renderPage();
    await screen.findByText('Frontend Developer');

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/posts/1'));
    expect(api.delete.mock.calls[0][0]).not.toMatch(/^\/api\//);
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('No job postings yet')).toBeInTheDocument();
    expect(screen.getByText('Job posting deleted')).toBeInTheDocument();
  });

  it('shows a toast when deletion fails and keeps the row', async () => {
    const user = userEvent.setup();
    api.get.mockResolvedValue(response);
    api.delete.mockRejectedValue(new Error('Cannot delete a post with applicants'));

    renderPage();
    await screen.findByText('Frontend Developer');

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('Cannot delete a post with applicants')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledTimes(1);
  });

  it('does not call the API when the confirm dialog is dismissed', async () => {
    const user = userEvent.setup();
    vi.stubGlobal('confirm', vi.fn(() => false));
    api.get.mockResolvedValue(response);

    renderPage();
    await screen.findByText('Frontend Developer');

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(api.delete).not.toHaveBeenCalled();
  });
});
