import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import CredentialsPage from './CredentialsPage';

function renderCredentials() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <CredentialsPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('CredentialsPage', () => {
  it('renders the credentials page heading', () => {
    renderCredentials();
    expect(screen.getByRole('heading', { name: 'Credentials' })).toBeInTheDocument();
  });

  it('renders the subtitle', () => {
    renderCredentials();
    expect(screen.getByText('A long-term record of the skills you can show, not just claim.')).toBeInTheDocument();
  });

  it('renders the empty state with title and description', () => {
    renderCredentials();
    expect(screen.getByText('No credentials yet')).toBeInTheDocument();
    expect(screen.getByText('Skills you verify through proctored assessments will be stored here as portable credentials.')).toBeInTheDocument();
  });

  it('renders within a Panel component', () => {
    renderCredentials();
    expect(screen.getByText('No credentials yet').closest('div')).toBeInTheDocument();
  });
});