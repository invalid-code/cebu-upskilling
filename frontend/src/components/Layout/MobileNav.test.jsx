import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import MobileNav from './MobileNav';

function renderMobileNav(role) {
  localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role }));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter>
      <AuthProvider>
        <MobileNav />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('MobileNav', () => {
  it('renders the learner navigation links', () => {
    renderMobileNav('Learner');

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Skills')).toBeInTheDocument();
    expect(screen.getByText('Jobs')).toBeInTheDocument();
    expect(screen.getByText('Learn')).toBeInTheDocument();
    expect(screen.getByText('Apps')).toBeInTheDocument();
  });

  it('renders the recruiter navigation links', () => {
    renderMobileNav('Recruiter');

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
    expect(screen.queryByText('Apps')).not.toBeInTheDocument();
  });

  it('renders learner links by default when there is no user', () => {
    localStorage.clear();

    const wrapper = render(
      <MemoryRouter>
        <AuthProvider>
          <MobileNav />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(wrapper.getByText('Home')).toBeInTheDocument();
  });
});