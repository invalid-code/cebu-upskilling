import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import RegisterPage from './RegisterPage';

vi.mock('../api/client', () => ({ api: { get: vi.fn(), post: vi.fn(), postForm: vi.fn() } }));
vi.mock('../components/GoogleSignInButton', () => ({ default: () => null }));

const m = vi.hoisted(() => ({ extractResumeText: vi.fn() }));
vi.mock('../utils/resumeText', () => ({ extractResumeText: m.extractResumeText }));

function renderRegister() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AuthProvider>
          <RegisterPage />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

function chooseFile(file) {
  const input = document.querySelector('input[type=file]');
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  fireEvent.change(input);
}

describe('RegisterPage resume upload', () => {
  beforeEach(() => {
    m.extractResumeText.mockReset();
  });

  it('shows a parsed preview for a valid PDF', async () => {
    m.extractResumeText.mockResolvedValue('Jose Rizal   React developer');
    renderRegister();
    chooseFile(new File(['x'], 'cv.pdf', { type: 'application/pdf' }));
    const preview = await screen.findByRole('region', { name: 'Resume preview', hidden: true });
    expect(preview).toHaveTextContent('Jose Rizal React developer');
  });

  it('rejects a wrong file type with a reason, no preview, and keeps other data', async () => {
    renderRegister();
    fireEvent.change(screen.getByPlaceholderText('First name'), { target: { value: 'Jose' } });
    chooseFile(new File(['x'], 'cv.txt', { type: 'text/plain' }));
    expect(await screen.findByText('Resume must be a PDF or DOCX file.')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resume preview', hidden: true })).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('First name')).toHaveValue('Jose');
    expect(m.extractResumeText).not.toHaveBeenCalled();
  });

  it('rejects an oversize file', async () => {
    renderRegister();
    const big = new File(['x'], 'cv.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 });
    chooseFile(big);
    expect(await screen.findByText(/larger than 5 MB/)).toBeInTheDocument();
    expect(m.extractResumeText).not.toHaveBeenCalled();
  });

  it('rejects an unparseable file without a preview', async () => {
    m.extractResumeText.mockRejectedValue(new Error('boom'));
    renderRegister();
    chooseFile(new File(['x'], 'cv.docx', { type: '' }));
    expect(await screen.findByText(/could not be read/)).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resume preview', hidden: true })).not.toBeInTheDocument();
  });
});
