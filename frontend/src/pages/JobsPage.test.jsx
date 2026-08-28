import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ApplicationsProvider } from '../context/ApplicationsContext';
import JobsPage from './JobsPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '../api/client';

const mockPosts = [
  {
    postId: 1,
    title: 'Senior Frontend Developer',
    companyName: 'TechCorp',
    targetRole: 'Frontend Developer',
    location: 'Cebu City',
    salaryRange: '₱80,000 - ₱120,000',
    jobType: 'Full-time',
    experienceLevel: 'Senior',
    isRemote: false,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    postId: 2,
    title: 'Backend Developer',
    companyName: 'StartupInc',
    targetRole: 'Backend Developer',
    location: 'Remote',
    salaryRange: '₱1,500/hr',
    jobType: 'Part-time',
    experienceLevel: 'Mid',
    isRemote: true,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    postId: 3,
    title: 'Full Stack Developer',
    companyName: 'LocalSME',
    targetRole: 'Full Stack Developer',
    location: 'Mandaue',
    salaryRange: '₱60,000',
    jobType: 'Part-time',
    experienceLevel: 'Junior',
    isRemote: false,
    createdAt: '2026-01-03T00:00:00Z',
  },
];

function envelope(items, total = items.length) {
  return { items, total, page: 1, pageSize: 9 };
}

function renderJobs() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ApplicationsProvider>
          <ToastProvider>
            <JobsPage />
          </ToastProvider>
        </ApplicationsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('JobsPage', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner' }));
    localStorage.setItem('token', 'abc');
    api.get.mockReset();
    api.get.mockResolvedValue(envelope(mockPosts));
  });

  it('renders the jobs page heading', async () => {
    renderJobs();
    expect(await screen.findByRole('heading', { name: 'Find work that fits.' })).toBeInTheDocument();
  });

  it('renders tab options', async () => {
    renderJobs();
    expect(await screen.findByRole('button', { name: 'All roles' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Corporate & Full-Time' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Side Hustles & Local SME' })).toBeInTheDocument();
  });

  it('renders search and filter inputs', async () => {
    renderJobs();
    expect(await screen.findByPlaceholderText('Search roles, skills, or locations')).toBeInTheDocument();
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    expect(selects[0]).toHaveValue('');
    expect(selects[1]).toHaveValue('');
  });

  it('displays job cards when data loads', async () => {
    renderJobs();
    expect(await screen.findByText('Senior Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
  });

  it('fetches from the server when a search term is typed', async () => {
    api.get.mockImplementation((url) =>
      Promise.resolve(url.includes('search=Frontend')
        ? envelope([mockPosts[0]])
        : envelope(mockPosts)),
    );
    renderJobs();
    await screen.findByText('Senior Frontend Developer');

    const searchInput = screen.getByPlaceholderText('Search roles, skills, or locations');
    fireEvent.change(searchInput, { target: { value: 'Frontend' } });

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('search=Frontend'), expect.anything());
    });
    expect(await screen.findByText('Senior Frontend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Backend Developer')).not.toBeInTheDocument();
  });

  it('fetches by jobType when a tab is selected', async () => {
    api.get.mockImplementation((url) =>
      Promise.resolve(url.includes('jobType=Part-time')
        ? envelope([mockPosts[1], mockPosts[2]])
        : envelope(mockPosts)),
    );
    renderJobs();
    await screen.findByText('Senior Frontend Developer');

    fireEvent.click(screen.getByRole('button', { name: 'Side Hustles & Local SME' }));

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('jobType=Part-time'), expect.anything());
    });
    expect(await screen.findByText('Backend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Senior Frontend Developer')).not.toBeInTheDocument();
  });

  it('shows empty state when no jobs match filter', async () => {
    api.get.mockResolvedValue(envelope([]));
    renderJobs();

    const searchInput = await screen.findByPlaceholderText('Search roles, skills, or locations');
    fireEvent.change(searchInput, { target: { value: 'NonExistentJob' } });

    expect(await screen.findByText('No jobs match your search.')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    let resolveFn;
    api.get.mockImplementation(() => new Promise((resolve) => { resolveFn = resolve; }));

    renderJobs();

    expect(screen.getByText('Loading jobs...')).toBeInTheDocument();

    resolveFn(envelope(mockPosts));
    await waitFor(() => expect(screen.queryByText('Loading jobs...')).not.toBeInTheDocument());
  });

  it('shows error state when API fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    renderJobs();

    expect(await screen.findByText(/Couldn.t load jobs/)).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('shows save alert button', async () => {
    renderJobs();
    expect(await screen.findByRole('button', { name: 'Save alert' })).toBeInTheDocument();
  });
});