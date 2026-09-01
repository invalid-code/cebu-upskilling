import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import RegisterPage from './RegisterPage';

vi.mock('../api/client', () => ({
  api: {
    post: vi.fn(),
    postForm: vi.fn(),
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
  companyIndustry: null,
  companyWebsite: null,
  companyLocation: null,
  companySize: null,
  companyDescription: null,
};

function renderRegister() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<div>Learner home</div>} />
            <Route path="/business-dashboard" element={<div>Business dashboard</div>} />
            <Route path="/provider-dashboard" element={<div>Provider dashboard</div>} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}


function createFakePdfFile(name = "resume.pdf") {
  return new File(["%PDF-1.4\n%fake pdf content"], name, { type: "application/pdf" });
}

function setResumeFile(file) {
  const input = document.querySelector("input[type=file]");
  Object.defineProperty(input, "files", { value: [file] });
  fireEvent.change(input);
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
  fireEvent.change(screen.getByPlaceholderText('Confirm password'), {
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
    api.postForm.mockReset();
  });

  it('renders the registration form', () => {
    renderRegister();
    expect(screen.getByRole('heading', { name: 'Create your account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('First name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Last name')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Email address')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Confirm password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Address (optional)')).toBeInTheDocument();
    expect(screen.getByLabelText('Birthday')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('submits the form data to register on submit', async () => {
    api.postForm.mockResolvedValue({ token: 'abc', firstName: 'Jose' });
    renderRegister();

    fillForm();
    const pdf = createFakePdfFile();
    setResumeFile(pdf);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(api.postForm).toHaveBeenCalledWith('/auth/register', expect.any(FormData));
    });
    // Verify FormData contains expected fields
    const formDataArg = api.postForm.mock.calls[0][1];
    expect(formDataArg.get('firstName')).toBe(formData.firstName);
    expect(formDataArg.get('emailAddress')).toBe(formData.emailAddress);
    expect(formDataArg.get('resumeFile')).toBe(pdf);
    expect(localStorage.getItem('token')).toBe('abc');
  });

  it('shows an error message when registration fails', async () => {
    api.postForm.mockRejectedValue(new Error('Email already in use'));
    renderRegister();

    fillForm();
    setResumeFile(createFakePdfFile());
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const matches = await screen.findAllByText('Email already in use');
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0]).toBeInTheDocument();
  });

  it('shows company name field when Employer role is selected', () => {
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: 'Employer' }));
    expect(screen.getByPlaceholderText('Company name')).toBeInTheDocument();
  });

  it('shows a field error for mismatched passwords and does not call the API', async () => {
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
      target: { value: 'secret123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), {
      target: { value: 'different123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.postForm).not.toHaveBeenCalled();
  });

  it('shows a field error for an empty confirm password and does not call the API', async () => {
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
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Confirm password is required')).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.postForm).not.toHaveBeenCalled();
  });

  it('clears the confirm password field error as the user types', async () => {
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
      target: { value: 'secret123' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), {
      target: { value: 'different123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Confirm password'), {
      target: { value: 'secret123' },
    });

    expect(screen.queryByText('Passwords do not match')).not.toBeInTheDocument();
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
    expect(api.postForm).not.toHaveBeenCalled();
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
    expect(api.postForm).not.toHaveBeenCalled();
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
    expect(api.postForm).not.toHaveBeenCalled();
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
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), {
      target: { value: companyFormData.password },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register-company', companyFormData);
    });
    expect(localStorage.getItem('token')).toBe('xyz');
    expect(await screen.findByText('Business dashboard')).toBeInTheDocument();
  });

  it('submits optional company identity fields when provided on employer registration', async () => {
    api.post.mockResolvedValue({ token: 'xyz', firstName: 'Maria', companyId: 1, role: 'Recruiter' });
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: 'Employer' }));
    fireEvent.change(screen.getByPlaceholderText('Company name'), { target: { value: 'Cebu Prints' } });
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Santos' } });
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'maria@tech.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Industry (optional)'), { target: { value: 'Apparel' } });
    fireEvent.change(screen.getByLabelText('Company size'), { target: { value: '11-50' } });
    fireEvent.change(screen.getByPlaceholderText('Website (optional)'), { target: { value: 'https://cebuprints.example.com' } });
    fireEvent.change(screen.getByPlaceholderText('Location (optional)'), { target: { value: 'Cebu City' } });
    fireEvent.change(screen.getByLabelText('Company description'), { target: { value: 'Custom shirts.' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register-company', expect.objectContaining({
        companyName: 'Cebu Prints',
        companyIndustry: 'Apparel',
        companySize: '11-50',
        companyWebsite: 'https://cebuprints.example.com',
        companyLocation: 'Cebu City',
        companyDescription: 'Custom shirts.',
      }));
    });
  });

  it('shows a field error for an invalid website URL on employer registration', async () => {
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: 'Employer' }));
    fireEvent.change(screen.getByPlaceholderText('Company name'), { target: { value: 'Bad Web Co' } });
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Maria' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Santos' } });
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'maria@tech.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Website (optional)'), { target: { value: 'not-a-url' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    expect(await screen.findByText(/Enter a valid website URL/)).toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
    expect(api.postForm).not.toHaveBeenCalled();
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

  it('signs up with Google as Learner by default and navigates home', async () => {
    api.post.mockResolvedValue({ token: 'g-token', firstName: 'Ana', role: 'Learner' });
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/google', {
        idToken: 'google-fake-id-token',
        role: 'Learner',
      });
    });
    expect(localStorage.getItem('token')).toBe('g-token');
    expect(await screen.findByText('Learner home')).toBeInTheDocument();
  });

  it('signs up with Google using the selected Employer role and navigates to the dashboard', async () => {
    api.post.mockResolvedValue({ token: 'g-token2', firstName: 'Ana', role: 'Recruiter' });
    renderRegister();

    fireEvent.click(screen.getByRole('button', { name: 'Employer' }));
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/google', {
        idToken: 'google-fake-id-token',
        role: 'Recruiter',
      });
    });
    expect(await screen.findByText('Business dashboard')).toBeInTheDocument();
  });

  it('registers as CourseProvider and navigates to provider dashboard', async () => {
    api.post.mockResolvedValue({ token: 'prov-token', firstName: 'Ana', role: 'CourseProvider' });
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: 'Course Provider' }));
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByPlaceholderText('Last name'), { target: { value: 'Santos' } });
    fireEvent.change(screen.getByPlaceholderText('Email address'), { target: { value: 'ana@prov.com' } });
    fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByPlaceholderText('Confirm password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/register', expect.objectContaining({ role: 'CourseProvider' }));
    });
    expect(await screen.findByText('Provider dashboard')).toBeInTheDocument();
  });

  it('signs up with Google using CourseProvider role and navigates to provider dashboard', async () => {
    api.post.mockResolvedValue({ token: 'g-prov', firstName: 'Ana', role: 'CourseProvider' });
    renderRegister();
    fireEvent.click(screen.getByRole('button', { name: 'Course Provider' }));
    fireEvent.click(screen.getByRole('button', { name: /continue with google/i }));
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/google', { idToken: 'google-fake-id-token', role: 'CourseProvider' });
    });
    expect(await screen.findByText('Provider dashboard')).toBeInTheDocument();
  });

  it('renders show password toggles for both password fields', () => {
    renderRegister();
    const toggles = screen.getAllByRole('button', { name: 'Show password' });
    expect(toggles).toHaveLength(2);
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password');
    expect(screen.getByPlaceholderText('Confirm password')).toHaveAttribute('type', 'password');
  });

  it('toggles password and confirm password independently', () => {
    renderRegister();
    const passwordInput = screen.getByPlaceholderText('Password');
    const confirmInput = screen.getByPlaceholderText('Confirm password');
    const [pwdToggle, confirmToggle] = screen.getAllByRole('button', { name: 'Show password' });

    fireEvent.click(pwdToggle);
    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'password');
    expect(screen.getByRole('button', { name: 'Hide password' })).toBeInTheDocument();

    fireEvent.click(confirmToggle);
    expect(confirmInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getAllByRole('button', { name: 'Hide password' })[0]);
    expect(passwordInput).toHaveAttribute('type', 'password');
    expect(confirmInput).toHaveAttribute('type', 'text');
  });

  it('does not submit when toggling visibility', () => {
    renderRegister();
    const [pwdToggle] = screen.getAllByRole('button', { name: 'Show password' });
    fireEvent.click(pwdToggle);
    expect(api.post).not.toHaveBeenCalled();
  });
});