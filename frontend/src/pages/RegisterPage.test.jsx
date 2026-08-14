import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { AuthProvider } from '../context/AuthContext';
import RegisterPage from './RegisterPage';

vi.mock('../api/client', () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock('../utils/resumeText', () => ({
  extractResumeText: vi.fn(),
}));

import { api } from '../api/client';
import { extractResumeText } from '../utils/resumeText';

const RESUME_TEXT = 'Experienced software developer with 5 years in web development.';

const formData = {
  firstName: 'Jose',
  lastName: 'Rizal',
  emailAddress: 'jose@example.com',
  password: 'secret123',
  address: 'Kalayaan Ave, Laguna',
  birthday: '1996-06-19',
  resume: RESUME_TEXT,
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

async function fillForm() {
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
  const file = new File(['resume content'], 'resume.docx', {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
  extractResumeText.mockResolvedValue(RESUME_TEXT);
  await userEvent.upload(screen.getByLabelText('Resume'), file);
}

describe('RegisterPage', () => {
  it('renders the registration form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Address (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Birthday')).toBeInTheDocument();
    expect(screen.getByLabelText('Resume')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('submits the form data to register on submit', async () => {
    api.post.mockResolvedValue({ token: 'abc', firstName: 'Jose' });
    renderRegister();

    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', formData);
    });
    expect(localStorage.getItem('token')).toBe('abc');
  });

  it('rejects a resume that is not a PDF or DOCX', async () => {
    renderRegister();

    const file = new File(['resume content'], 'resume.txt', { type: 'text/plain' });
    fireEvent.change(screen.getByLabelText('Resume'), {
      target: { files: [file] },
    });

    expect(
      await screen.findByText('Resume must be a PDF or DOCX file only'),
    ).toBeInTheDocument();
  });

  it('shows an error message when registration fails', async () => {
    api.post.mockRejectedValue(new Error('Email already in use'));
    renderRegister();

    await fillForm();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Email already in use')).toBeInTheDocument();
  });
});
