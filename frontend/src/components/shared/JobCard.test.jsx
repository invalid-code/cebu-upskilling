import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastProvider } from '../../context/ToastContext';
import JobCard from './JobCard';

const job = {
  title: 'Frontend Developer',
  company: 'Acme',
  location: 'Cebu City',
  salary: '₱45,000',
  match: '85%',
  kind: 'sme',
  kindLabel: 'SME',
  skills: ['React', 'TypeScript'],
};

describe('JobCard', () => {
  it('renders job details', () => {
    render(
      <ToastProvider>
        <JobCard job={job} />
      </ToastProvider>,
    );
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Acme · Cebu City')).toBeInTheDocument();
    expect(screen.getByText('₱45,000')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('SME')).toBeInTheDocument();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('shows a toast when Apply is clicked', () => {
    render(
      <ToastProvider>
        <JobCard job={job} />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }));
    expect(screen.getByText('Application saved to your tracker')).toBeInTheDocument();
  });
});
