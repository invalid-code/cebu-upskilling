import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import LoginPage from './LoginPage';

vi.mock('../api/client', () => ({
  api: {
    post: vi.fn(),
  },
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
          <Route path="/" element={<div>Learner home</div>} />
          <Route path="/business-dashboard" element={<div>Business dashboard</div>} />
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
});