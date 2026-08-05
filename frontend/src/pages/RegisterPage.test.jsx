import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import RegisterPage from './RegisterPage';

vi.mock('../api/client', () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from '../api/client';

const formData = {
  firstName: 'Jose',
  lastName: 'Rizal',
  emailAddress: 'jose@example.com',
  password: 'secret123',
};

function renderRegister() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <RegisterPage />
      </AuthProvider>
    </MemoryRouter>,
  );
}

function fillForm() {
  fireEvent.change(screen.getByPlaceholderText('First name'), {
    target: { value: formData.firstName },
  });
  fireEvent.change(screen.getByPlaceholderText('Last name'), {
    target: { value: formData.lastName },
  });
  fireEvent.change(screen.getByPlaceholderText('Email address'), {
    target: { value: formData.emailAddress },
  });
  fireEvent.change(screen.getByPlaceholderText('Password'), {
    target: { value: formData.password },
  });
}

describe('RegisterPage', () => {
  it('renders the registration form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('submits the form data to register on submit', async () => {
    api.post.mockResolvedValue({ token: 'abc', firstName: 'Jose' });
    renderRegister();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', formData);
    });
    expect(localStorage.getItem('token')).toBe('abc');
  });

  it('shows an error message when registration fails', async () => {
    api.post.mockRejectedValue(new Error('Email already in use'));
    renderRegister();

    fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Email already in use')).toBeInTheDocument();
  });
});
