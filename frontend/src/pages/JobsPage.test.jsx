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
    company: { name: 'TechCorp' },
    description: 'Cebu City\nsalary: ₱80,000 - ₱120,000\nskills: JavaScript, React, TypeScript\nmatch: 85%',
  },
  {
    postId: 2,
    title: 'Backend Developer',
    company: { name: 'StartupInc' },
    description: 'Remote\nrate: ₱1,500/hr\nskills: Node.js, Python\nmatch: 70%',
  },
  {
    postId: 3,
    title: 'Full Stack Developer',
    company: { name: 'LocalSME' },
    description: 'Mandaue\nsalary: ₱60,000\nskills: PHP, Laravel, Vue\nmatch: 60%',
  },
];

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
    api.get.mockResolvedValue(mockPosts);
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

  it('filters jobs by search term', async () => {
    renderJobs();
    await screen.findByText('Senior Frontend Developer');

    const searchInput = screen.getByPlaceholderText('Search roles, skills, or locations');
    fireEvent.change(searchInput, { target: { value: 'Frontend' } });

    expect(screen.getByText('Senior Frontend Developer')).toBeInTheDocument();
    expect(screen.queryByText('Backend Developer')).not.toBeInTheDocument();
    expect(screen.queryByText('Full Stack Developer')).not.toBeInTheDocument();
  });

  it('filters jobs by tab selection', async () => {
    renderJobs();
    await screen.findByText('Senior Frontend Developer');

    fireEvent.click(screen.getByRole('button', { name: 'Side Hustles & Local SME' }));

    expect(screen.queryByText('Senior Frontend Developer')).not.toBeInTheDocument();
    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
    expect(screen.getByText('Full Stack Developer')).toBeInTheDocument();
  });

  it('shows empty state when no jobs match filter', async () => {
    renderJobs();
    await screen.findByText('Senior Frontend Developer');

    const searchInput = screen.getByPlaceholderText('Search roles, skills, or locations');
    fireEvent.change(searchInput, { target: { value: 'NonExistentJob' } });

    expect(await screen.findByText('No jobs match your search.')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    let resolveFn;
    api.get.mockImplementation(() => new Promise((resolve) => { resolveFn = resolve; }));

    renderJobs();

    expect(screen.getByText('Loading jobs...')).toBeInTheDocument();

    resolveFn(mockPosts);
    await waitFor(() => expect(screen.queryByText('Loading jobs...')).not.toBeInTheDocument());
  });

  it('shows error state when API fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    renderJobs();

    expect(await screen.findByText("Couldn't load jobs. Check back later.")).toBeInTheDocument();
  });

  it('shows save alert button', async () => {
    renderJobs();
    expect(await screen.findByRole('button', { name: 'Save alert' })).toBeInTheDocument();
  });
});