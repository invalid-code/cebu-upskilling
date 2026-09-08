import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import EmployerOverviewPage from './EmployerOverviewPage';

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

import { api } from '../api/client';

const stats = {
  company: { jobPostings: 12, recruiters: 3 },
  talentPool: { totalLearners: 240, avgSkillLevel: 3.6 },
};

function renderPage() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<EmployerOverviewPage />} />
        <Route path="/business-dashboard" element={<div>DashboardPage</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('EmployerOverviewPage', () => {
  beforeEach(() => {
    api.get.mockReset();
  });

  it('renders the page heading', async () => {
    api.get.mockResolvedValue(stats);

    renderPage();

    expect(await screen.findByText('Welcome back.')).toBeInTheDocument();
    expect(screen.getByText(/Manage your hiring demand and track the talent pool/)).toBeInTheDocument();
  });

  it('renders the business stat cards', async () => {
    api.get.mockResolvedValue(stats);

    renderPage();

    expect(await screen.findByText('12')).toBeInTheDocument();
    expect(screen.getByText('job postings')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('recruiters at company')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
    expect(screen.getByText('learners in talent pool')).toBeInTheDocument();
    expect(screen.getByText('3.6')).toBeInTheDocument();
    expect(screen.getByText('avg. skill level')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/stats/business');
  });

  it('shows a loading message initially', () => {
    api.get.mockImplementation(() => new Promise(() => {}));

    renderPage();

    expect(screen.getByText('Loading business summary...')).toBeInTheDocument();
  });

  it('shows the empty state when the request fails', async () => {
    api.get.mockRejectedValue(new Error('down'));

    renderPage();

    expect(await screen.findByText('No company profile yet')).toBeInTheDocument();
    expect(screen.getByText(/Complete your company profile/)).toBeInTheDocument();
  });

  it('navigates to the dashboard from the header button', async () => {
    api.get.mockResolvedValue(stats);

    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'View business dashboard' }));
    expect(screen.getByText('DashboardPage')).toBeInTheDocument();
  });

  it('previews the company job postings with status and view-all link', async () => {
    api.get.mockResolvedValue({
      ...stats,
      jobPostings: [
        { postId: 1, title: 'Frontend Developer', jobType: 'Full-time', location: 'Cebu City', isActive: true },
        { postId: 2, title: 'Backend Developer', jobType: 'Contract', location: null, isActive: false },
      ],
    });

    renderPage();

    expect(await screen.findByText('Your job postings')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Full-time · Cebu City')).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.getByText('Inactive')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all →' })).toHaveAttribute('href', '/business-dashboard');
    expect(screen.getByRole('link', { name: 'Frontend Developer' })).toHaveAttribute('href', '/edit-job/1');
  });

  it('caps the preview at three postings with a more-count note', async () => {
    api.get.mockResolvedValue({
      ...stats,
      jobPostings: [1, 2, 3, 4, 5].map((id) => ({ postId: id, title: `Role ${id}`, jobType: 'Full-time', location: 'Cebu City', isActive: true })),
    });

    renderPage();

    expect(await screen.findByText('Role 3')).toBeInTheDocument();
    expect(screen.queryByText('Role 4')).not.toBeInTheDocument();
    expect(screen.getByText('+2 more in the business dashboard')).toBeInTheDocument();
  });

  it('shows a post-a-job prompt when there are no postings', async () => {
    api.get.mockResolvedValue({ ...stats, jobPostings: [] });

    renderPage();

    expect(await screen.findByText(/No postings yet/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Post a job/ })).toHaveAttribute('href', '/post-job');
    expect(screen.queryByRole('link', { name: 'View all →' })).not.toBeInTheDocument();
  });

  it('handles stats without a jobPostings array', async () => {
    api.get.mockResolvedValue(stats);

    renderPage();

    expect(await screen.findByText(/No postings yet/)).toBeInTheDocument();
  });
});