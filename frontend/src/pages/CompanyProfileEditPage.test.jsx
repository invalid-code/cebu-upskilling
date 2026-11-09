import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import CompanyProfileEditPage from './CompanyProfileEditPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    upload: vi.fn(),
    postForm: vi.fn(),
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
    // Shown both in the editor textarea and in the live public-profile preview.
    expect(screen.getByDisplayValue('Shirt printing shop.')).toBeInTheDocument();
    expect(within(screen.getByTestId('profile-preview')).getByText('Shirt printing shop.')).toBeInTheDocument();
  });

  it('updates the public-profile preview as fields change, without saving', async () => {
    api.get.mockResolvedValue(company);
    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    fireEvent.change(screen.getByLabelText(/Company name/), { target: { value: 'Cebu Prints & Co' } });
    fireEvent.change(screen.getByLabelText(/Tagline/), { target: { value: 'Wear Cebu' } });

    const preview = within(screen.getByTestId('profile-preview'));
    expect(preview.getByRole('heading', { name: 'Cebu Prints & Co' })).toBeInTheDocument();
    expect(preview.getByText('Wear Cebu')).toBeInTheDocument();
    expect(api.put).not.toHaveBeenCalled();
  });

  it('shows inline errors and blocks save when the name is empty', async () => {
    api.get.mockResolvedValue(company);
    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    fireEvent.change(screen.getByLabelText(/Company name/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    expect(await screen.findAllByText(/Enter your company name/)).not.toHaveLength(0);
    expect(screen.getByLabelText(/Company name/)).toHaveAttribute('aria-invalid', 'true');
    expect(api.put).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Company name/), { target: { value: 'Cebu Prints' } });
    expect(screen.getByLabelText(/Company name/)).not.toHaveAttribute('aria-invalid');
  });

  it('shows a server 400 error in the form summary and keeps entered values', async () => {
    api.get.mockResolvedValue(company);
    api.put.mockRejectedValue(Object.assign(new Error('Website is not reachable'), { status: 400 }));
    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    fireEvent.change(screen.getByLabelText(/Industry/), { target: { value: 'Printing' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    expect(await screen.findByText('Website is not reachable')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Printing')).toBeInTheDocument();
  });

  it('prompts before leaving with unsaved changes and keeps values when staying', async () => {
    api.get.mockResolvedValue(company);
    localStorage.setItem('user', JSON.stringify({ userId: 1, firstName: 'Maria', role: 'Recruiter', companyId: 5 }));
    render(
      <MemoryRouter initialEntries={['/recruiter/company']}>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/recruiter/company" element={<><CompanyProfileEditPage /><Link to="/elsewhere">Go away</Link></>} />
              <Route path="/elsewhere" element={<p>Elsewhere page</p>} />
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </MemoryRouter>,
    );
    await screen.findByDisplayValue('Cebu Prints');

    // Edit a field, then try to navigate away.
    fireEvent.change(screen.getByLabelText(/Industry/), { target: { value: 'Printing' } });
    fireEvent.click(screen.getByText('Go away'));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Stay on this page/i }));
    expect(screen.queryByText('Elsewhere page')).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Printing')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Go away'));
    fireEvent.click(await screen.findByRole('button', { name: /Leave and discard/i }));
    expect(await screen.findByText('Elsewhere page')).toBeInTheDocument();
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

  it('queues a logo upload, previews instantly, and applies the server URL', async () => {
    api.get.mockResolvedValueOnce(company).mockResolvedValue({ ...company, logoUrl: 'https://cdn.example/new.png' });
    api.postForm.mockResolvedValue({ message: 'Logo upload queued and will appear shortly.' });
    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] },
    });
    expect(await screen.findByText('Logo uploading in the background…')).toBeInTheDocument();
    expect(api.postForm).toHaveBeenCalledWith('/companies/me/logo', expect.any(FormData));
    expect(api.upload).not.toHaveBeenCalled();
    expect(await screen.findByText('Logo uploaded', {}, { timeout: 8000 })).toBeInTheDocument();
  }, 15000);

  it('queues a cover upload and applies the server URL', async () => {
    api.get.mockResolvedValueOnce(company).mockResolvedValue({ ...company, coverImageUrl: 'https://cdn.example/cover.png' });
    api.postForm.mockResolvedValue({ message: 'queued' });
    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    const inputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(inputs[1], {
      target: { files: [new File(['x'], 'cover.png', { type: 'image/png' })] },
    });
    expect(await screen.findByText('Cover uploading in the background…')).toBeInTheDocument();
    expect(await screen.findByText('Cover image uploaded', {}, { timeout: 8000 })).toBeInTheDocument();
  }, 15000);

  it('rejects a non-image file before uploading', async () => {
    api.get.mockResolvedValue(company);

    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'evil.exe', { type: 'application/x-msdownload' })] },
    });

    await waitFor(() => {
      expect(screen.getByText('Image must be a PNG, JPG or WEBP file')).toBeInTheDocument();
    });
    expect(api.postForm).not.toHaveBeenCalled();
    expect(api.upload).not.toHaveBeenCalled();
  });

  it('rejects an oversized image before uploading', async () => {
    api.get.mockResolvedValue(company);

    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' });
    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [big] } });

    await waitFor(() => {
      expect(screen.getByText('Image must be 2 MB or smaller')).toBeInTheDocument();
    });
    expect(api.postForm).not.toHaveBeenCalled();
  });

  it('sends empty strings for cleared fields so the backend clears them', async () => {
    api.get.mockResolvedValue(company);
    api.put.mockResolvedValue({ ...company, description: '' });

    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    fireEvent.change(screen.getByLabelText(/About the company/), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Save changes/i }));

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith('/companies/me', expect.objectContaining({
        description: '',
      }));
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

  it('reverts to the previous logo when the upload fails', async () => {
    api.get.mockResolvedValue({ ...company, logoUrl: 'https://cdn.example/old.png' });
    api.postForm.mockRejectedValue(new Error('Network error'));
    renderPage();
    await screen.findByDisplayValue('Cebu Prints');

    const input = document.querySelector('input[type="file"]');
    fireEvent.change(input, {
      target: { files: [new File(['x'], 'logo.png', { type: 'image/png' })] },
    });

    expect(await screen.findByText('Network error')).toBeInTheDocument();
    expect(screen.queryByText('Logo uploaded')).not.toBeInTheDocument();
  });
});
