import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth, isLearner, isRecruiter } from './AuthContext';

vi.mock('../api/client', () => ({
  api: { post: vi.fn(), get: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn() },
}));

import { api } from '../api/client';

function AuthProbe() {
  const { user, login, loginWithGoogle, register, registerCompany, logout, confirmEmail, resendConfirmation, forgotPassword, resetPassword } = useAuth();
  return (
    <div>
      <span data-testid="user">
        {user ? `${user.firstName}:${user.role}` : 'none'}
      </span>
      <button onClick={() => login('ada@example.com', 'secret')}>login</button>
      <button onClick={() => loginWithGoogle('google-id-token')}>google-login</button>
      <button onClick={() => loginWithGoogle('google-id-token', 'Recruiter')}>google-login-recruiter</button>
      <button onClick={() => register({ emailAddress: 'new@example.com' })}>register</button>
      <button onClick={() => registerCompany({ name: 'Acme' })}>register-company</button>
      <button onClick={() => logout()}>logout</button>
      <button onClick={() => confirmEmail('a@b.com', 'tok')}>confirm-email</button>
      <button onClick={() => resendConfirmation('a@b.com')}>resend</button>
      <button onClick={() => forgotPassword('a@b.com')}>forgot-password</button>
      <button onClick={() => resetPassword('a@b.com', 'tok', 'NewPass1')}>reset-password</button>
    </div>
  );
}

function renderWithAuth(probe = <AuthProbe />) {
  return render(<AuthProvider>{probe}</AuthProvider>);
}

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
    api.post.mockReset();
    api.get.mockReset();
  });

  it('starts with no user when localStorage is empty', () => {
    renderWithAuth();
    expect(screen.getByTestId('user')).toHaveTextContent('none');
  });

  it('initializes the user from a stored session', () => {
    localStorage.setItem('token', 'abc');
    localStorage.setItem('user', JSON.stringify({ firstName: 'Ada', role: 'Learner' }));

    renderWithAuth();

    expect(screen.getByTestId('user')).toHaveTextContent('Ada:Learner');
  });

  it('login stores the token/user and sets the current user', async () => {
    api.post.mockResolvedValue({ token: 'jwt-token', firstName: 'Ada', role: 'Learner' });

    renderWithAuth();
    fireEvent.click(screen.getByText('login'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ada:Learner'));
    expect(api.post).toHaveBeenCalledWith('/auth/login', { emailAddress: 'ada@example.com', password: 'secret' });
    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(JSON.parse(localStorage.getItem('user')).firstName).toBe('Ada');
  });

  it('loginWithGoogle posts the ID token and stores the session', async () => {
    api.post.mockResolvedValue({ token: 'g-token', firstName: 'Ana', role: 'Learner' });

    renderWithAuth();
    fireEvent.click(screen.getByText('google-login'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ana:Learner'));
    expect(api.post).toHaveBeenCalledWith('/auth/google', { idToken: 'google-id-token' });
    expect(localStorage.getItem('token')).toBe('g-token');
    expect(JSON.parse(localStorage.getItem('user')).firstName).toBe('Ana');
  });

  it('loginWithGoogle forwards the role when provided (signup)', async () => {
    api.post.mockResolvedValue({ token: 'g-token2', firstName: 'Ana', role: 'Recruiter' });

    renderWithAuth();
    fireEvent.click(screen.getByText('google-login-recruiter'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/google', { idToken: 'google-id-token', role: 'Recruiter' }));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ana:Recruiter'));
  });

  it('register posts the profile and sets the current user', async () => {
    api.post.mockResolvedValue({ token: 't2', firstName: 'Grace', role: 'Learner' });

    renderWithAuth();
    fireEvent.click(screen.getByText('register'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Grace:Learner'));
    expect(api.post).toHaveBeenCalledWith('/auth/register', { emailAddress: 'new@example.com' });
  });

  it('registerCompany posts the company registration and sets the user', async () => {
    api.post.mockResolvedValue({ token: 't3', firstName: 'Grace', role: 'Recruiter' });

    renderWithAuth();
    fireEvent.click(screen.getByText('register-company'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Grace:Recruiter'));
    expect(api.post).toHaveBeenCalledWith('/auth/register-company', { name: 'Acme' });
  });

  it('logout clears the session and calls the server revocation endpoint', async () => {
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('user', JSON.stringify({ firstName: 'Ada', role: 'Learner' }));
    api.post.mockResolvedValue(undefined);

    renderWithAuth();
    fireEvent.click(screen.getByText('logout'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'));
    expect(localStorage.getItem('token')).toBeNull();
    expect(api.post).toHaveBeenCalledWith('/auth/logout', undefined, {
      headers: { Authorization: 'Bearer jwt' },
    });
  });

  it('logout still clears the session when server revocation fails', async () => {
    localStorage.setItem('token', 'jwt');
    localStorage.setItem('user', JSON.stringify({ firstName: 'Ada', role: 'Learner' }));
    api.post.mockRejectedValue(new Error('network down'));

    renderWithAuth();
    fireEvent.click(screen.getByText('logout'));

    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('none'));
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('confirmEmail posts the confirmation payload', async () => {
    api.post.mockResolvedValue(undefined);

    renderWithAuth();
    fireEvent.click(screen.getByText('confirm-email'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/confirm-email', { email: 'a@b.com', token: 'tok' }));
  });

  it('resendConfirmation posts the email', async () => {
    api.post.mockResolvedValue(undefined);

    renderWithAuth();
    fireEvent.click(screen.getByText('resend'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/resend-confirmation', { email: 'a@b.com' }));
  });

  it('forgotPassword posts the email', async () => {
    api.post.mockResolvedValue(undefined);

    renderWithAuth();
    fireEvent.click(screen.getByText('forgot-password'));

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'a@b.com' }));
  });

  it('resetPassword posts the new password', async () => {
    api.post.mockResolvedValue(undefined);

    renderWithAuth();
    fireEvent.click(screen.getByText('reset-password'));

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/reset-password', { email: 'a@b.com', token: 'tok', newPassword: 'NewPass1' }),
    );
  });

  it('isLearner and isRecruiter match roles case-insensitively', () => {
    expect(isLearner({ role: 'learner' })).toBe(true);
    expect(isLearner({ role: 'Recruiter' })).toBe(false);
    expect(isRecruiter({ role: 'recruiter' })).toBe(true);
    expect(isRecruiter(null)).toBe(false);
    expect(isLearner(null)).toBe(false);
  });
});