import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import CredentialsPage from './CredentialsPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from '../api/client';

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
  beforeEach(() => {
    api.get.mockReset();
    api.get.mockResolvedValue([]);
  });

  it('renders the credentials page heading', async () => {
    renderCredentials();
    expect(screen.getByRole('heading', { name: 'Credentials' })).toBeInTheDocument();
    expect(await screen.findByText('No credentials yet')).toBeInTheDocument();
  });

  it('renders the subtitle', async () => {
    renderCredentials();
    expect(screen.getByText('A long-term record of the skills you can show, not just claim.')).toBeInTheDocument();
  });

  it('renders the empty state with guidance', async () => {
    renderCredentials();
    expect(await screen.findByText('No credentials yet')).toBeInTheDocument();
    expect(screen.getByText('Complete a course from a provider that offers certificates and it will appear here.')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/certificates');
  });

  it('lists issued certificates with a link to the certificate', async () => {
    api.get.mockResolvedValue([
      {
        certificateId: 'cert-1',
        courseId: 'course-1',
        serialNumber: 'CU-2026-AB12CD34EF',
        recipientName: 'Maria Santos',
        courseName: 'Customer Support Essentials',
        providerName: 'Cebu Skills Academy',
        issuedAt: '2026-11-03T12:00:00Z',
      },
    ]);

    renderCredentials();

    expect(await screen.findByText('Customer Support Essentials')).toBeInTheDocument();
    expect(screen.getByText(/Cebu Skills Academy/)).toBeInTheDocument();
    expect(screen.getByText(/CU-2026-AB12CD34EF/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View certificate/ })).toHaveAttribute('href', '/credentials/cert-1');
  });

  it('shows an error when credentials cannot be loaded', async () => {
    api.get.mockRejectedValue(new Error('Server unavailable'));
    renderCredentials();
    expect(await screen.findByText('Could not load credentials')).toBeInTheDocument();
    expect(screen.getByText('Server unavailable')).toBeInTheDocument();
  });
});
