import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import Topbar from './Topbar';

function renderTopbar(path, user) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <Topbar />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('Topbar', () => {
  it('shows the learner crumb with the current route label', () => {
    renderTopbar('/skills', { firstName: 'Juan', role: 'Learner' });

    expect(screen.getByText('My pathway / Skill profile')).toBeInTheDocument();
  });

  it('shows the employer crumb for recruiters', () => {
    renderTopbar('/business-dashboard', { firstName: 'Maria', role: 'Recruiter' });

    expect(screen.getByText('Employer / Business dashboard')).toBeInTheDocument();
  });

  it('shows the provider crumb for CourseProviders', () => {
    renderTopbar('/provider-dashboard', { firstName: 'Ana', role: 'CourseProvider' });
    expect(screen.getByText('Provider / Provider dashboard')).toBeInTheDocument();
  });

  it('falls back to Page for unknown routes', () => {
    renderTopbar('/nowhere', { firstName: 'Juan', role: 'Learner' });

    expect(screen.getByText('My pathway / Page')).toBeInTheDocument();
  });

  it('renders the avatar initials', () => {
    renderTopbar('/', { firstName: 'Juan', lastName: 'Cruz', role: 'Learner' });

    expect(screen.getByRole('link', { name: 'Open profile' })).toHaveTextContent('JC');
  });

  it('shows a toast when Search is clicked', () => {
    renderTopbar('/', { firstName: 'Juan', role: 'Learner' });

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));

    expect(screen.getByText('Search coming soon')).toBeInTheDocument();
  });

  it('shows a toast when Notifications is clicked', () => {
    renderTopbar('/', { firstName: 'Juan', role: 'Learner' });

    fireEvent.click(screen.getByRole('button', { name: 'Notifications' }));

    expect(screen.getByText('No new notifications')).toBeInTheDocument();
  });
});