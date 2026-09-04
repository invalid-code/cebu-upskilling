import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import ResetPasswordPage from './ResetPasswordPage';

vi.mock('../api/client', () => ({
  api: { post: vi.fn(), get: vi.fn() },
}));

import { api } from '../api/client';

function renderPage(path = '/reset-password?email=ada%40example.com&token=abc') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/login" element={<div>LoginPage</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('ResetPasswordPage', () => {
  beforeEach(() => {
    localStorage.clear();
    api.post.mockReset();
  });

  it('renders the form with the target email', () => {
    renderPage();

    expect(screen.getByText('Choose a new password')).toBeInTheDocument();
    expect(screen.getByText('Enter a new password for ada@example.com.')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm new password')).toBeInTheDocument();
  });

  it('requires a password', async () => {
    renderPage();

    fireEvent.submit(screen.getByPlaceholderText('New password').closest('form'));

    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('rejects a too-short password', async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: '123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: '123' } });
    fireEvent.submit(screen.getByPlaceholderText('New password').closest('form'));

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
  });

  it('rejects mismatched passwords', async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'NewPass1' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'Different1' } });
    fireEvent.submit(screen.getByPlaceholderText('New password').closest('form'));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
  });

  it('shows an error when email or token is missing', async () => {
    renderPage('/reset-password');

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'NewPass1' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'NewPass1' } });
    fireEvent.submit(screen.getByPlaceholderText('New password').closest('form'));

    expect(await screen.findByText('Missing email or token. Use the link from your email.')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('resets the password and offers to sign in', async () => {
    api.post.mockResolvedValue({});

    renderPage();

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'NewPass1' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'NewPass1' } });
    fireEvent.submit(screen.getByPlaceholderText('New password').closest('form'));

    expect(await screen.findByText('Your password has been reset. You can now sign in.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue to sign in' }));
    await waitFor(() => expect(screen.getByText('LoginPage')).toBeInTheDocument());

    expect(api.post).toHaveBeenCalledWith('/auth/reset-password', {
      email: 'ada@example.com',
      token: 'abc',
      newPassword: 'NewPass1',
    });
  });

  it('shows an error when the reset request fails', async () => {
    api.post.mockRejectedValue(new Error('This reset link is invalid or has expired.'));

    renderPage();

    fireEvent.change(screen.getByPlaceholderText('New password'), { target: { value: 'NewPass1' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm new password'), { target: { value: 'NewPass1' } });
    fireEvent.submit(screen.getByPlaceholderText('New password').closest('form'));

    expect(await screen.findByText('This reset link is invalid or has expired.')).toBeInTheDocument();
  });

  it('renders show password toggles for both fields', () => {
    renderPage();
    const toggles = screen.getAllByRole('button', { name: 'Show password' });
    expect(toggles).toHaveLength(2);
    expect(screen.getByPlaceholderText('New password')).toHaveAttribute('type', 'password');
    expect(screen.getByPlaceholderText('Confirm new password')).toHaveAttribute('type', 'password');
  });

  it('toggles visibility for new password without submitting', () => {
    renderPage();
    const newPwdInput = screen.getByPlaceholderText('New password');
    const confirmInput = screen.getByPlaceholderText('Confirm new password');
    const [firstToggle, secondToggle] = screen.getAllByRole('button', { name: 'Show password' });

    fireEvent.click(firstToggle);
    expect(newPwdInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'password');
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(secondToggle);
    expect(confirmInput).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getAllByRole('button', { name: 'Hide password' })[0]);
    expect(newPwdInput).toHaveAttribute('type', 'password');
  });
});