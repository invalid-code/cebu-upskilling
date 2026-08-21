import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ForgotPasswordPage from './ForgotPasswordPage';

vi.mock('../api/client', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

import { api } from '../api/client';

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<ForgotPasswordPage />} />
          <Route path="/login" element={<div>LoginPage</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ForgotPasswordPage', () => {
  beforeEach(() => {
    localStorage.clear();
    api.post.mockReset();
  });

  it('renders the form', () => {
    renderPage();

    expect(screen.getByText('Reset your password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Send reset link' })).toBeInTheDocument();
  });

  it('requires a valid email address', async () => {
    renderPage();

    fireEvent.submit(screen.getByText('Send reset link').closest('form'));

    expect(await screen.findByText('Email address is required')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects an invalid email format', async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'not-an-email' } });
    fireEvent.submit(screen.getByText('Send reset link').closest('form'));

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows success after requesting a reset link', async () => {
    api.post.mockResolvedValue({});

    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.submit(screen.getByText('Send reset link').closest('form'));

    expect(await screen.findByText(/a password reset link has been sent/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'ada@example.com' });
  });

  it('shows an error when the request fails', async () => {
    api.post.mockRejectedValue(new Error('Something went wrong. Please try again.'));

    renderPage();

    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'ada@example.com' } });
    fireEvent.submit(screen.getByText('Send reset link').closest('form'));

    expect(await screen.findByText('Something went wrong. Please try again.')).toBeInTheDocument();
  });
});