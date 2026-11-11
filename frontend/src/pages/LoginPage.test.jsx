import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { useRateLimitStore } from '../stores/rateLimitStore';
import LoginPage from './LoginPage';

vi.mock('../api/client', () => ({
  api: {
    post: vi.fn(),
  },
}));

// Stand-in for the real GIS-backed button: clicking it simulates the Google
// credential callback with a fixed ID token.
vi.mock('../components/GoogleSignInButton', () => ({
  default: ({ onSuccess }) => (
    <button onClick={() => onSuccess('google-fake-id-token')}>Continue with Google</button>
  ),
}));

import { api } from '../api/client';

function MockDestination() {
  return <div>Mock destination page</div>;
}

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<div>Learner home</div>} />
          <Route path="/business-dashboard" element={<div>Business dashboard</div>} />
          <Route path="/provider-dashboard" element={<div>Provider dashboard</div>} />
          <Route path="*" element={<MockDestination />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    localStorage.clear();
    api.post.mockReset();
  });

  it('renders the sign in form', () => {
    renderLogin();
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Register' })).toBeInTheDocument();
  });

  it('calls login and stores the token on submit', async () => {
    api.post.mockResolvedValue({ token: 'abc', firstName: 'Jose' });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'jose@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        emailAddress: 'jose@example.com',
        password: 'secret123',
      });
    });
    expect(localStorage.getItem('token')).toBe('abc');
  });

  it('navigates learners to the learner home after login', async () => {
    api.post.mockResolvedValue({ token: 'abc', firstName: 'Jose', role: 'Learner' });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'jose@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Learner home')).toBeInTheDocument();
  });

  it('navigates recruiters to the business dashboard after login', async () => {
    api.post.mockResolvedValue({ token: 'abc', firstName: 'Maria', role: 'Recruiter' });
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'maria@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Business dashboard')).toBeInTheDocument();
  });

  it('shows an error message and does not redirect when login returns 401', async () => {
    api.post.mockRejectedValue(new Error('Invalid credentials'));
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'jose@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'wrong123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();

    // The error persists and the page does not navigate away.
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.queryByText('Learner home')).not.toBeInTheDocument();
    expect(screen.queryByText('Business dashboard')).not.toBeInTheDocument();
    expect(screen.queryByText('Mock destination page')).not.toBeInTheDocument();
  });

  it('shows a field error for an invalid email and does not call the API', async () => {
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows a field error for an empty password and does not call the API', async () => {
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'jose@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('clears the email field error as the user types', async () => {
    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'jose@example.com' },
    });

    expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument();
  });

  it('signs in with Google, stores the token and redirects learners', async () => {
    api.post.mockResolvedValue({ token: 'g-token', firstName: 'Ana', role: 'Learner' });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/google', { idToken: 'google-fake-id-token' });
    });
    expect(localStorage.getItem('token')).toBe('g-token');
    expect(await screen.findByText('Learner home')).toBeInTheDocument();
  });

  it('redirects Google recruiters to the business dashboard', async () => {
    api.post.mockResolvedValue({ token: 'g-token', firstName: 'Maria', role: 'Recruiter' });
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByText('Business dashboard')).toBeInTheDocument();
  });

  it('shows an error when Google sign-in fails on the backend', async () => {
    api.post.mockRejectedValue(new Error('Invalid Google credential'));
    renderLogin();

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByText('Invalid Google credential')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeNull();
    expect(screen.queryByText('Learner home')).not.toBeInTheDocument();
  });

  it('navigates CourseProviders to provider dashboard after login', async () => {
    api.post.mockResolvedValue({ token: 'abc', firstName: 'Ana', role: 'CourseProvider' });
    renderLogin();
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'ana@example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Provider dashboard')).toBeInTheDocument();
  });

  it('redirects Google CourseProviders to provider dashboard', async () => {
    api.post.mockResolvedValue({ token: 'g-token', firstName: 'Ana', role: 'CourseProvider' });
    renderLogin();
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    expect(await screen.findByText('Provider dashboard')).toBeInTheDocument();
  });

  it('renders a show password toggle for the password field', () => {
    renderLogin();
    expect(screen.getByRole('button', { name: 'Show password' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
  });

  it('toggles password visibility without submitting the form', async () => {
    renderLogin();
    const input = screen.getByPlaceholderText('Password');
    const toggle = screen.getByRole('button', { name: 'Show password' });

    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(toggle);
    expect(input).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('keeps the password visible after typing', () => {
    renderLogin();
    const input = screen.getByPlaceholderText('Password');
    fireEvent.change(input, { target: { value: 'mySecret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('mySecret');
  });

  describe('form errors', () => {
    afterEach(() => {
      vi.useRealTimers();
      useRateLimitStore.getState()._reset();
    });

    function fill(email, password) {
      fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: email } });
      fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: password } });
    }

    it('shows the error beneath the field, focuses it and keeps the other value', async () => {
      renderLogin();
      fill('bad', 'secret123');
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      const emailInput = screen.getByPlaceholderText('Email address');
      const error = await screen.findByText('Please enter a valid email address');
      expect(emailInput).toHaveAttribute('aria-invalid', 'true');
      expect(emailInput.getAttribute('aria-describedby')).toBe(error.id);
      expect(emailInput).toHaveFocus();
      expect(screen.getByPlaceholderText('Password')).toHaveValue('secret123');
    });

    it('focuses the first affected field when the API returns field errors', async () => {
      api.post.mockRejectedValue(Object.assign(new Error('Invalid'), {
        status: 400,
        fieldErrors: { password: 'Wrong password', email: 'Unknown email' },
      }));
      renderLogin();
      fill('jose@example.com', 'secret123');
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(await screen.findByText('Unknown email')).toBeInTheDocument();
      expect(screen.getByText('Wrong password')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email address')).toHaveFocus();
      expect(screen.getByPlaceholderText('Password')).toHaveValue('secret123');
    });

    it('puts a server 400 error in the summary, keeps values and re-enables submit', async () => {
      api.post.mockRejectedValue(Object.assign(new Error('Account is locked'), { status: 400 }));
      renderLogin();
      fill('jose@example.com', 'secret123');
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(await screen.findByText('Account is locked')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Email address')).toHaveValue('jose@example.com');
      await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled());
    });

    it('shows a generic message when a 400 has no usable error string', async () => {
      api.post.mockRejectedValue(Object.assign(new Error('HTTP 400'), { status: 400 }));
      renderLogin();
      fill('jose@example.com', 'secret123');
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(await screen.findByText(/couldn't process that request/i)).toBeInTheDocument();
    });

    it('shows the 429 message and disables submit for 10 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      api.post.mockRejectedValue(Object.assign(new Error('Too many requests'), { status: 429 }));
      renderLogin();
      fill('jose@example.com', 'secret123');
      fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

      expect(await screen.findByText('Too many attempts, try again in a minute')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
      expect(screen.getByPlaceholderText('Password')).toHaveValue('secret123');

      act(() => { vi.advanceTimersByTime(9000); });
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeDisabled();
      act(() => { vi.advanceTimersByTime(1500); });
      expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
    });
  });
});