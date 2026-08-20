import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import NotFoundPage from './NotFoundPage';

function renderPage(role) {
  if (role) {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role }));
    localStorage.setItem('token', 'abc');
  }
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<NotFoundPage />} />
          <Route path="/login" element={<div>LoginPage</div>} />
          <Route path="/business-dashboard" element={<div>DashboardPage</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('NotFoundPage', () => {
  it('renders the 404 content', () => {
    renderPage();

    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('Page not found')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument();
  });

  it('links learners to their dashboard', () => {
    renderPage('Learner');

    expect(screen.getByRole('link', { name: 'dashboard' })).toHaveAttribute('href', '/');
  });

  it('links recruiters to the business dashboard', () => {
    renderPage('Recruiter');

    expect(screen.getByRole('link', { name: 'dashboard' })).toHaveAttribute('href', '/business-dashboard');
  });

  it('links guests to the login page', () => {
    renderPage();

    expect(screen.getByRole('link', { name: 'dashboard' })).toHaveAttribute('href', '/login');
  });
});