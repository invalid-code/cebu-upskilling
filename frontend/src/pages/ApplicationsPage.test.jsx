import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ApplicationsProvider } from '../context/ApplicationsContext';
import { ToastProvider } from '../context/ToastContext';
import ApplicationsPage from './ApplicationsPage';

const mockApplications = [
  {
    id: 1,
    title: 'Senior Frontend Developer',
    company: 'TechCorp',
    location: 'Cebu City',
    salary: '₱80,000 - ₱120,000',
    skills: ['JavaScript', 'React', 'TypeScript'],
  },
  {
    id: 2,
    title: 'Backend Developer',
    company: 'StartupInc',
    location: 'Remote',
    salary: '₱1,500/hr',
    skills: ['Node.js', 'Python'],
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
    expect(screen.getByText('Senior Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Backend Developer')).toBeInTheDocument();
  });

  it('displays company and location for each application', () => {
    renderApplications();
    expect(screen.getByText('TechCorp · Cebu City')).toBeInTheDocument();
    expect(screen.getByText('StartupInc · Remote')).toBeInTheDocument();
  });

  it('displays salary for each application', () => {
    renderApplications();
    expect(screen.getByText('₱80,000 - ₱120,000')).toBeInTheDocument();
    expect(screen.getByText('₱1,500/hr')).toBeInTheDocument();
  });

  it('displays skills for each application', () => {
    renderApplications();
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
    expect(screen.getByText('Node.js')).toBeInTheDocument();
    expect(screen.getByText('Python')).toBeInTheDocument();
  });

  it('shows Applied badge for each application', () => {
    renderApplications();
    expect(screen.getAllByText('Applied')).toHaveLength(2);
  });

  it('shows empty state when no applications', () => {
    renderApplications([]);
    expect(screen.getByText('No applications yet')).toBeInTheDocument();
    expect(screen.getByText('Jobs you apply to will show up here with their status.')).toBeInTheDocument();
  });

  it('renders within a Panel component', () => {
    renderApplications();
    expect(screen.getByText('Senior Frontend Developer').closest('div')).toBeInTheDocument();
  });
});