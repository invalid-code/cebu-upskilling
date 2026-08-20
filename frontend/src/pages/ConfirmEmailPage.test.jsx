import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ConfirmEmailPage from './ConfirmEmailPage';

vi.mock('../api/client', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

import { api } from '../api/client';

function renderPage(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/confirm-email" element={<ConfirmEmailPage />} />
          <Route path="/login" element={<div>LoginPage</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ConfirmEmailPage', () => {
  beforeEach(() => {
    localStorage.clear();
    api.post.mockReset();
  });

  it('shows a loading state while confirming', async () => {
    api.post.mockImplementation(() => new Promise(() => {}));

    renderPage('/confirm-email?email=a@b.com&token=abc');

    expect(screen.getByText('Confirming your email')).toBeInTheDocument();
    expect(screen.getByText('Please wait a moment…')).toBeInTheDocument();
  });

  it('shows success and continues to sign in', async () => {
    api.post.mockResolvedValue({});

    renderPage('/confirm-email?email=a@b.com&token=abc');

    expect(await screen.findByText('Email confirmed')).toBeInTheDocument();
    expect(screen.getByText('Your email has been confirmed. You can now sign in.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue to sign in' }));
    await waitFor(() => expect(screen.getByText('LoginPage')).toBeInTheDocument());
    expect(api.post).toHaveBeenCalledWith('/auth/confirm-email', { email: 'a@b.com', token: 'abc' });
  });

  it('shows an error state when confirmation fails', async () => {
    api.post.mockRejectedValue(new Error('Invalid token'));

    renderPage('/confirm-email?email=a@b.com&token=abc');

    expect(await screen.findByText("Couldn't confirm email")).toBeInTheDocument();
    expect(screen.getByText('Invalid token')).toBeInTheDocument();
  });

  it('shows the missing-params error and a resend button', async () => {
    renderPage('/confirm-email');

    expect(await screen.findByText("Couldn't confirm email")).toBeInTheDocument();
    expect(screen.getByText('Missing email or token. The confirmation link may be incomplete.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Resend confirmation email' })).not.toBeInTheDocument();
  });

  it('resends the confirmation email from the error state', async () => {
    api.post.mockRejectedValueOnce(new Error('Invalid')).mockResolvedValueOnce({});

    renderPage('/confirm-email?email=a@b.com&token=bad');

    fireEvent.click(await screen.findByRole('button', { name: 'Resend confirmation email' }));

    expect(await screen.findByRole('button', { name: 'Confirmation email sent' })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/auth/resend-confirmation', { email: 'a@b.com' });
  });
});