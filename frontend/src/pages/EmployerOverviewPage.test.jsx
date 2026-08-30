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
});