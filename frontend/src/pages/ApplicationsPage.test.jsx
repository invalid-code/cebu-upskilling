import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ApplicationsProvider } from '../context/ApplicationsContext';
import { ToastProvider } from '../context/ToastContext';
import ApplicationsPage from './ApplicationsPage';

const mockApplications = [
  {
    id: 1,
    title: 'Frontend Developer (React)',
    company: 'Serbisyo Digital',
    location: 'Cebu City',
    appliedAt: '2025-07-15T10:00:00.000Z',
    status: 'interview',
  },
  {
    id: 2,
    title: 'Landing Page Builder',
    company: 'Mango Apps',
    location: 'Remote',
    appliedAt: '2025-07-12T10:00:00.000Z',
    status: 'review',
  },
  {
    id: 3,
    title: 'Junior Web Assistant',
    company: 'Banilad Retail Co.',
    location: 'Cebu City',
    savedAt: '2025-07-10T10:00:00.000Z',
    status: 'saved',
  },
];

function renderApplications(applications = mockApplications) {
  localStorage.setItem('job_applications', JSON.stringify(applications));
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
  it('renders the applications page heading', () => {
    renderApplications();
    expect(screen.getByRole('heading', { name: 'Applications' })).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderApplications();
    expect(screen.getByText('See what needs your attention, not just what happened.')).toBeInTheDocument();
  });

  it('displays applications when there are applications', () => {
    renderApplications();
    expect(screen.getByText('Frontend Developer (React)')).toBeInTheDocument();
    expect(screen.getByText('Landing Page Builder')).toBeInTheDocument();
    expect(screen.getByText('Junior Web Assistant')).toBeInTheDocument();
  });

  it('displays company and date for each application', () => {
    renderApplications();
    expect(screen.getByText('Serbisyo Digital · Applied Jul 15')).toBeInTheDocument();
    expect(screen.getByText('Mango Apps · Applied Jul 12')).toBeInTheDocument();
    expect(screen.getByText('Banilad Retail Co. · Saved Jul 10')).toBeInTheDocument();
  });

  it('displays status badges for each application', () => {
    renderApplications();
    expect(screen.getByText('Interview')).toBeInTheDocument();
    expect(screen.getByText('Under review')).toBeInTheDocument();
    expect(screen.getByText('Saved')).toBeInTheDocument();
  });

  it('displays Open button for each application', () => {
    renderApplications();
    const openButtons = screen.getAllByText('Open');
    expect(openButtons).toHaveLength(3);
  });

  it('shows empty state when no applications', () => {
    renderApplications([]);
    expect(screen.getByText('No applications yet')).toBeInTheDocument();
    expect(screen.getByText('Jobs you apply to will show up here with their status.')).toBeInTheDocument();
  });
});
