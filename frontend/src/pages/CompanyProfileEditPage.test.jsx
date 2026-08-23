import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import CompanyProfileEditPage from './CompanyProfileEditPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    upload: vi.fn(),
  },
}));

import { api } from '../api/client';

const company = {
  companyId: 5,
  name: 'Cebu Prints',
  logoUrl: '',
  description: 'Shirt printing shop.',
  industry: 'Apparel',
  website: 'https://cebuprints.example.com',
  location: 'Cebu City',
  companySize: '11-50',
};

function renderPage() {
  localStorage.setItem('user', JSON.stringify({ userId: 1, firstName: 'Maria', role: 'Recruiter', companyId: 5 }));
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <CompanyProfileEditPage />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('CompanyProfileEditPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('loads and renders the current company profile', async () => {
    api.get.mockResolvedValue(company);

    renderPage();

    expect(await screen.findByDisplayValue('Cebu Prints')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Apparel')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://cebuprints.example.com')).toBeInTheDocument();
    expect(screen.getByText('Shirt printing shop.')).toBeInTheDocument();
  });

  it('submits edited fields to PUT /companies/me', async () => {
    api.get.mockResolvedValue(company);
    api.put.mockResolvedValue({ ...company, industry: 'Printing' });

    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    fireEvent.change(screen.getByLabelText(/Industry/), { target: { value: 'Printing' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/companies/me', expect.objectContaining({
        name: 'Cebu Prints',
        industry: 'Printing',
        website: 'https://cebuprints.example.com',
        companySize: '11-50',
      }));
    });
  });

  it('uploads a logo file to /companies/me/logo', async () => {
    api.get.mockResolvedValue(company);
    api.upload.mockResolvedValue({ logoUrl: 'https://media.example.com/company-logos/5/new.png' });

    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] },
    });

    await waitFor(() => {
      expect(api.upload).toHaveBeenCalledWith('/companies/me/logo', expect.anything());
    });
  });

  it('shows a hint when the account has no linked company', async () => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Maria', role: 'Recruiter' }));
    render(
      <MemoryRouter>
        <ToastProvider>
          <AuthProvider>
            <CompanyProfileEditPage />
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(await screen.findByText(/not linked to a company yet/)).toBeInTheDocument();
  });
});
