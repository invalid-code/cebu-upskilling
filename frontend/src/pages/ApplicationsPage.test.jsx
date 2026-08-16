import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ApplicationsProvider } from '../context/ApplicationsContext';
import { ToastProvider } from '../context/ToastContext';
import ApplicationsPage from './ApplicationsPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
  },
}));

import { api } from '../api/client';

const mockApplications = [
  {
    postId: 1,
    title: 'Frontend Developer (React)',
    company: 'Serbisyo Digital',
    appliedAt: '2025-07-15T10:00:00.000Z',
    status: 'interview',
  },
  {
    postId: 2,
    title: 'Landing Page Builder',
    company: 'Mango Apps',
    appliedAt: '2025-07-12T10:00:00.000Z',
    status: 'review',
  },
  {
    postId: 3,
    title: 'Junior Web Assistant',
    company: 'Banilad Retail Co.',
    savedAt: '2025-07-10T10:00:00.000Z',
    status: 'saved',
  },
];

function renderApplications(applications = mockApplications) {
  localStorage.setItem('user', JSON.stringify({ UserId: 1, firstName: 'Test', role: 'Learner' }));
  api.get.mockResolvedValue(applications);
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ApplicationsProvider>
          <ToastProvider>
            <ApplicationsPage />
          </ToastProvider>
        </ApplicationsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ApplicationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the applications page heading', async () => {
    renderApplications();
    expect(await screen.findByRole('heading', { name: 'Applications' })).toBeInTheDocument();
  });

  it('renders the subtitle', async () => {
    renderApplications();
    expect(await screen.findByText('See what needs your attention, not just what happened.')).toBeInTheDocument();
  });

  it('displays applications when there are applications', async () => {
    renderApplications();
    expect(await screen.findByText('Frontend Developer (React)')).toBeInTheDocument();
    expect(await screen.findByText('Landing Page Builder')).toBeInTheDocument();
    expect(await screen.findByText('Junior Web Assistant')).toBeInTheDocument();
  });

  it('displays company and date for each application', async () => {
    renderApplications();
    expect(await screen.findByText('Serbisyo Digital · Applied Jul 15')).toBeInTheDocument();
    expect(await screen.findByText('Mango Apps · Applied Jul 12')).toBeInTheDocument();
    expect(await screen.findByText('Banilad Retail Co. · Saved Jul 10')).toBeInTheDocument();
  });

  it('displays status badges for each application', async () => {
    renderApplications();
    expect(await screen.findByText('Interview')).toBeInTheDocument();
    expect(await screen.findByText('Under review')).toBeInTheDocument();
    expect(await screen.findByText('Saved')).toBeInTheDocument();
  });

  it('displays Open button for each application', async () => {
    renderApplications();
    const openButtons = await screen.findAllByText('Open');
    expect(openButtons).toHaveLength(3);
  });

  it('shows empty state when no applications', async () => {
    renderApplications([]);
    expect(await screen.findByText('No applications yet')).toBeInTheDocument();
    expect(await screen.findByText('Jobs you apply to will show up here with their status.')).toBeInTheDocument();
  });
});
