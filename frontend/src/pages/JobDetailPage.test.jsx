import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { ApplicationsProvider } from '../context/ApplicationsContext';
import JobDetailPage from './JobDetailPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    upload: vi.fn(),
  },
}));

import { api } from '../api/client';

const post = {
  postId: 7,
  title: 'DevOps Engineer',
  companyName: 'CloudNine',
  targetRole: 'DevOps Engineer',
  description: 'Keep the platform running.',
  location: 'Remote',
  salaryRange: '₱90,000 - ₱140,000',
  jobType: 'Full-time',
  experienceLevel: 'Senior',
  requirements: 'Kubernetes\nCI/CD',
  benefits: 'HMO\nWFH stipend',
  isRemote: true,
  expiresAt: '2026-12-31T00:00:00Z',
  createdAt: '2026-01-10T00:00:00Z',
  isActive: true,
};

function renderDetail() {
  localStorage.setItem('user', JSON.stringify({ UserId: 1, firstName: 'Test', role: 'Learner' }));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={['/jobs/7']}>
      <AuthProvider>
        <ApplicationsProvider>
          <ToastProvider>
            <Routes>
              <Route path="/jobs/:postId" element={<JobDetailPage />} />
            </Routes>
          </ToastProvider>
        </ApplicationsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('JobDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the full job posting', async () => {
    api.get.mockResolvedValue(post);
    renderDetail();
    expect(await screen.findByRole('heading', { name: 'DevOps Engineer' })).toBeInTheDocument();
    expect(screen.getByText('CloudNine')).toBeInTheDocument();
    expect(screen.getByText('Keep the platform running.')).toBeInTheDocument();
    expect(screen.getByText('Kubernetes')).toBeInTheDocument();
    expect(screen.getByText('HMO')).toBeInTheDocument();
    expect(screen.getAllByText('Remote').length).toBeGreaterThan(0);
    expect(screen.getByText('Senior')).toBeInTheDocument();
  });

  it('submits an application with an uploaded resume', async () => {
    api.get.mockResolvedValue(post);
    api.upload.mockResolvedValueOnce({ url: 'https://storage.example/resume.pdf' });
    api.post.mockResolvedValue({
      postId: 7,
      title: 'DevOps Engineer',
      company: 'CloudNine',
      targetRole: 'DevOps Engineer',
      status: 'applied',
      appliedAt: '2026-01-15T00:00:00Z',
      resumeUrl: 'https://storage.example/resume.pdf',
    });

    renderDetail();
    await screen.findByRole('heading', { name: 'DevOps Engineer' });

    const resumeInput = document.querySelectorAll('input[type="file"]')[0];
    fireEvent.change(resumeInput, { target: { files: [new File(['x'], 'resume.pdf', { type: 'application/pdf' })] } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(api.upload).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/applications', {
        postId: 7,
        resumeUrl: 'https://storage.example/resume.pdf',
      });
    });
    expect(screen.getAllByText('Application submitted').length).toBeGreaterThan(0);
  });

  it('submits resume and cover letter together when both are selected', async () => {
    api.get.mockResolvedValue(post);
    api.upload.mockResolvedValueOnce({ url: 'https://storage.example/resume.pdf' });
    api.upload.mockResolvedValueOnce({ url: 'https://storage.example/cover.pdf' });
    api.post.mockResolvedValue({
      postId: 7,
      title: 'DevOps Engineer',
      company: 'CloudNine',
      targetRole: 'DevOps Engineer',
      status: 'applied',
      appliedAt: '2026-01-15T00:00:00Z',
    });

    renderDetail();
    await screen.findByRole('heading', { name: 'DevOps Engineer' });

    const inputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(inputs[0], { target: { files: [new File(['x'], 'resume.pdf', { type: 'application/pdf' })] } });
    fireEvent.change(inputs[1], { target: { files: [new File(['x'], 'cover.pdf', { type: 'application/pdf' })] } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(api.upload).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/applications', {
        postId: 7,
        resumeUrl: 'https://storage.example/resume.pdf',
        coverLetterUrl: 'https://storage.example/cover.pdf',
      });
    });
  });

  it('blocks submission and shows a toast when no resume is selected', async () => {
    api.get.mockResolvedValue(post);

    renderDetail();
    await screen.findByRole('heading', { name: 'DevOps Engineer' });

    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(screen.getByText('A resume is required to apply for this job')).toBeInTheDocument();
    });
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('shows error state when the post cannot be loaded', async () => {
    api.get.mockRejectedValue(new Error('Not found'));
    renderDetail();
    expect(await screen.findByText('Job unavailable')).toBeInTheDocument();
  });

  it('shows upload error when the resume upload fails', async () => {
    api.get.mockResolvedValue(post);
    api.upload.mockRejectedValueOnce(new Error('Network error — file was not uploaded'));

    renderDetail();
    await screen.findByRole('heading', { name: 'DevOps Engineer' });

    const resumeInput = document.querySelectorAll('input[type="file"]')[0];
    fireEvent.change(resumeInput, { target: { files: [new File(['x'], 'resume.pdf', { type: 'application/pdf' })] } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(screen.getByText('Network error — file was not uploaded')).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });

  it('does not submit when only the cover letter upload fails', async () => {
    api.get.mockResolvedValue(post);
    api.upload.mockResolvedValueOnce({ url: 'https://storage.example/resume.pdf' });
    api.upload.mockRejectedValueOnce(new Error('Upload did not complete'));

    renderDetail();
    await screen.findByRole('heading', { name: 'DevOps Engineer' });

    const inputs = document.querySelectorAll('input[type="file"]');
    fireEvent.change(inputs[0], { target: { files: [new File(['x'], 'resume.pdf', { type: 'application/pdf' })] } });
    fireEvent.change(inputs[1], { target: { files: [new File(['x'], 'cover.pdf', { type: 'application/pdf' })] } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(screen.getByText('Upload did not complete')).toBeInTheDocument();
    });
    expect(api.post).not.toHaveBeenCalled();
  });
});