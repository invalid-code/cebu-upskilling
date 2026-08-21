import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import Sidebar from './Sidebar';

function renderSidebar(user) {
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Sidebar />
      </AuthProvider>
    </MemoryRouter>,
  );
}

const learner = { firstName: 'Juan', lastName: 'Cruz', role: 'Learner' };
const recruiter = { firstName: 'Maria', lastName: 'Lopez', role: 'Recruiter' };

describe('Sidebar', () => {
  it('renders the brand', () => {
    renderSidebar(learner);

    expect(screen.getByText('CU')).toBeInTheDocument();
    expect(screen.getByText('Cebu Upskilling')).toBeInTheDocument();
    expect(screen.getByText('Career Pathway Application')).toBeInTheDocument();
  });

  it('renders learner pathway and account navigation', () => {
    renderSidebar(learner);

    expect(screen.getByText('My pathway')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('Skill profile')).toBeInTheDocument();
    expect(screen.getByText('Find work')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByText('Applications')).toBeInTheDocument();
    expect(screen.getByText('Assessments')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByText('Credentials')).toBeInTheDocument();
    expect(screen.getByText('Help center')).toBeInTheDocument();

    expect(screen.queryByText('Employer tools')).not.toBeInTheDocument();
    expect(screen.queryByText('Business dashboard')).not.toBeInTheDocument();
  });

  it('renders recruiter navigation', () => {
    renderSidebar(recruiter);

    expect(screen.getByText('Employer tools')).toBeInTheDocument();
    expect(screen.getByText('Business dashboard')).toBeInTheDocument();
    expect(screen.getByText('Help center')).toBeInTheDocument();

    expect(screen.queryByText('My pathway')).not.toBeInTheDocument();
  });

  it('renders the user avatar initials, name and role', () => {
    renderSidebar(learner);

    expect(screen.getByText('JC')).toBeInTheDocument();
    expect(screen.getByText('Juan')).toBeInTheDocument();
    expect(screen.getByText('Learner')).toBeInTheDocument();
  });

  it('calls logout when the sign out button is clicked', () => {
    renderSidebar(learner);

    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(localStorage.getItem('token')).toBeNull();
  });
});