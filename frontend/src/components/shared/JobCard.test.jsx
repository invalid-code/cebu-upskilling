import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
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
  salaryRange: '₱45,000',
  jobType: 'Full-time',
  experienceLevel: 'Mid',
  isRemote: true,
  kind: 'corporate',
  kindLabel: 'Corporate & Full-Time',
};

describe('JobCard', () => {
  it('renders job details', () => {
    render(
      <MemoryRouter>
        <JobCard job={job} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Acme · Cebu City')).toBeInTheDocument();
    expect(screen.getByText('₱45,000')).toBeInTheDocument();
    expect(screen.getByText('Corporate & Full-Time')).toBeInTheDocument();
    expect(screen.getByText('Remote')).toBeInTheDocument();
    expect(screen.getByText('Mid experience')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View & apply/ })).toBeInTheDocument();
  });

  it('links to the job detail page', () => {
    const { container } = render(
      <MemoryRouter>
        <JobCard job={job} />
      </MemoryRouter>,
    );
    const link = container.querySelector('a');
    expect(link).not.toBeNull();
    expect(link.getAttribute('href')).toBe('/jobs/1');
  });

  it('shows on-site tag when not remote', () => {
    render(
      <MemoryRouter>
        <JobCard job={{ ...job, isRemote: false }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('On-site')).toBeInTheDocument();
  });

  it('shows salary fallback text when no range given', () => {
    render(
      <MemoryRouter>
        <JobCard job={{ ...job, salaryRange: '' }} />
      </MemoryRouter>,
    );
    expect(screen.getByText('Salary on application')).toBeInTheDocument();
  });
});