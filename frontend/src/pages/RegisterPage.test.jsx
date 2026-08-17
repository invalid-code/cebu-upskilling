import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
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
  address: 'Kalayaan Ave, Laguna',
  birthday: '1996-06-19',
  companyName: '',
};

const companyFormData = {
  companyName: 'Tech Solutions Inc',
  firstName: 'Maria',
  lastName: 'Santos',
  emailAddress: 'maria@tech.com',
  password: 'secret123',
  address: '',
  birthday: '',
};

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/" element={<div>Learner home</div>} />
            <Route path="/business-dashboard" element={<div>Business dashboard</div>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
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
  fireEvent.change(screen.getByPlaceholderText('Address (optional)'), {
    target: { value: formData.address },
  });
  fireEvent.change(screen.getByLabelText('Birthday'), {
    target: { value: formData.birthday },
  });
}

describe('RegisterPage', () => {
  beforeEach(() => {
    localStorage.clear();
    api.post.mockReset();
  });

  it('renders the registration form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Address (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Birthday')).toBeInTheDocument();
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

  it('shows company name field when Employer role is selected', () => {
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: 'Employer' }));
    expect(screen.getByPlaceholderText('Company name')).toBeInTheDocument();
  });

  it('shows a field error for an invalid email and does not call the API', async () => {
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: 'Jose' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name'), {
      target: { value: 'Rizal' },
    });
    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows a field error for a short password and does not call the API', async () => {
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: 'Jose' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name'), {
      target: { value: 'Rizal' },
    });
    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'jose@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows a field error for a missing company name on employer registration and does not call the API', async () => {
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: 'Employer' }));
    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: 'Maria' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name'), {
      target: { value: 'Santos' },
    });
    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'maria@tech.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Company name is required')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('submits company registration data to register-company and navigates to the business dashboard', async () => {
    api.post.mockResolvedValue({ token: 'xyz', firstName: 'Maria', companyId: 1, role: 'Recruiter' });
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: 'Employer' }));
    fireEvent.change(screen.getByPlaceholderText('Company name'), {
      target: { value: companyFormData.companyName },
    });
    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: companyFormData.firstName },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name'), {
      target: { value: companyFormData.lastName },
    });
    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: companyFormData.emailAddress },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: companyFormData.password },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register-company', companyFormData);
    });
    expect(localStorage.getItem('token')).toBe('xyz');
    expect(await screen.findByText('Business dashboard')).toBeInTheDocument();
  });

  it('clears the password field error as the user types', async () => {
    renderRegister();

    fireEvent.change(screen.getByPlaceholderText('First name'), {
      target: { value: 'Jose' },
    });
    fireEvent.change(screen.getByPlaceholderText('Last name'), {
      target: { value: 'Rizal' },
    });
    fireEvent.change(screen.getByPlaceholderText('Email address'), {
      target: { value: 'jose@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'abc' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Password must be at least 6 characters')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'secret123' },
    });

    expect(screen.queryByText('Password must be at least 6 characters')).not.toBeInTheDocument();
  });
});