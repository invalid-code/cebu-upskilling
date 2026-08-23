import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import BusinessDashboardPage from './BusinessDashboardPage';

vi.mock('../api/client', () => ({ api: { get: vi.fn() } }));
import { api } from '../api/client';

const response = {
  company: { name: 'Acme Corp', jobPostings: 2, recruiters: 3 },
  talentPool: { totalLearners: 48, skillsTracked: 80, avgSkillLevel: 2.7 },
  jobPostings: [{ postId: 1, title: 'Frontend Developer', description: 'Build great products.', requiredCourses: [{ courseId: 1, name: 'JavaScript foundations', discipline: 'Technology', technicalLevel: 18, mode: 'Online' }] }],
  skillDemand: [{ skillName: 'JavaScript', category: 'Language', requiredForRoles: 5, avgRequiredLevel: 3.5, learnerCount: 12, avgLearnerLevel: 2.4 }],
};

function renderPage() {
  return render(<MemoryRouter><ToastProvider><AuthProvider><BusinessDashboardPage /></AuthProvider></ToastProvider></MemoryRouter>);
}

describe('BusinessDashboardPage', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Acme', role: 'Recruiter' }));
    localStorage.setItem('token', 'abc');
    api.get.mockReset();
  });

  it('renders stats, postings, and both skill charts', async () => {
    api.get.mockResolvedValue(response);
    renderPage();
    expect(await screen.findByText('Business Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Frontend Developer')).toBeInTheDocument();
    expect(screen.getByText('Skills in demand')).toBeInTheDocument();
    expect(screen.getByText('Learner coverage per skill')).toBeInTheDocument();
    expect(screen.getByText('48')).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));
    renderPage();
    expect(await screen.findByText('Business dashboard unavailable')).toBeInTheDocument();
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });
});
