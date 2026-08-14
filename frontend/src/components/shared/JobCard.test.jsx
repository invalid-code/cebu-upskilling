import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider } from '../../context/ToastContext';
import { AuthProvider } from '../../context/AuthContext';
import { ApplicationsProvider } from '../../context/ApplicationsContext';
import JobCard from './JobCard';

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
  },
}));

const job = {
  id: 1,
  title: 'Frontend Developer',
  company: 'Acme',
  location: 'Cebu City',
  salary: '₱45,000',
  match: '85%',
  kind: 'sme',
  kindLabel: 'SME',
  skills: ['React', 'TypeScript'],
};

function renderJobCard() {
  localStorage.setItem('user', JSON.stringify({ UserId: 1, firstName: 'Test', role: 'Learner' }));
  return render(
    <AuthProvider>
      <ApplicationsProvider>
        <ToastProvider>
          <JobCard job={job} />
        </ToastProvider>
      </ApplicationsProvider>
    </AuthProvider>,
  );
}

describe('JobCard', () => {
  it('renders job details', () => {
    renderJobCard();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Acme · Cebu City')).toBeInTheDocument();
    expect(screen.getByText('₱45,000')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('SME')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('shows a toast when Apply is clicked', () => {
    renderJobCard();
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText('Application saved to your tracker')).toBeInTheDocument();
  });
});
