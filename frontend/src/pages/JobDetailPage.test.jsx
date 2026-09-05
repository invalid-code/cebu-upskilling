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

function renderDetail(userOverrides = {}) {
  localStorage.setItem('user', JSON.stringify({ UserId: 1, firstName: 'Test', role: 'Learner', ...userOverrides }));
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
      expect((screen.getAllByText('A resume is required to apply for this job').length)).toBeGreaterThan(0);
    });
    expect(api.upload).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it('attaches the profile resume without uploading when no file is chosen', async () => {
    api.get.mockResolvedValue(post);
    api.post.mockResolvedValue({
      postId: 7,
      title: 'DevOps Engineer',
      company: 'CloudNine',
      targetRole: 'DevOps Engineer',
      status: 'applied',
      appliedAt: '2026-01-15T00:00:00Z',
      resumeUrl: 'https://storage.example/profile.pdf',
    });

    renderDetail({ resumeUrl: 'https://storage.example/profile.pdf' });
    await screen.findByRole('heading', { name: 'DevOps Engineer' });
    expect(screen.getByText(/Your profile resume will be attached/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/applications', {
        postId: 7,
        resumeUrl: 'https://storage.example/profile.pdf',
      });
    });
    expect(api.upload).not.toHaveBeenCalled();
    expect(screen.getAllByText('Application submitted').length).toBeGreaterThan(0);
  });

  it('prefers a newly chosen file over the profile resume', async () => {
    api.get.mockResolvedValue(post);
    api.upload.mockResolvedValueOnce({ url: 'https://storage.example/fresh.pdf' });
    api.post.mockResolvedValue({
      postId: 7,
      title: 'DevOps Engineer',
      company: 'CloudNine',
      targetRole: 'DevOps Engineer',
      status: 'applied',
      appliedAt: '2026-01-15T00:00:00Z',
      resumeUrl: 'https://storage.example/fresh.pdf',
    });

    renderDetail({ resumeUrl: 'https://storage.example/profile.pdf' });
    await screen.findByRole('heading', { name: 'DevOps Engineer' });

    const resumeInput = document.querySelectorAll('input[type="file"]')[0];
    fireEvent.change(resumeInput, { target: { files: [new File(['x'], 'fresh.pdf', { type: 'application/pdf' })] } });

    fireEvent.click(screen.getByRole('button', { name: 'Submit application' }));

    await waitFor(() => {
      expect(api.upload).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/applications', {
        postId: 7,
        resumeUrl: 'https://storage.example/fresh.pdf',
      });
    });
  });

  it('shows an about-the-employer panel when company details resolve', async () => {
    api.get.mockImplementation((url) =>
      url.startsWith('/posts/')
        ? Promise.resolve({ ...post, companyId: 42 })
        : Promise.resolve({
            companyId: 42,
            name: 'CloudNine',
            industry: 'Cloud Services',
            companySize: '11-50',
            location: 'Cebu City',
            website: 'https://cloudnine.example.com',
            description: 'We keep clouds running since 2019.',
            logoUrl: '',
          }),
    );

    renderDetail();

    expect(await screen.findByText('About the employer')).toBeInTheDocument();
    expect(screen.getByText('We keep clouds running since 2019.')).toBeInTheDocument();
    expect(screen.getByText(/View all roles at CloudNine/)).toBeInTheDocument();
    expect(screen.getByText('Cloud Services · Cebu City')).toBeInTheDocument();
  });

  it('shows error state when the post cannot be loaded', async () => {
    api.get.mockRejectedValue(new Error('Not found'));
    renderDetail();
    expect(await screen.findByText('Job unavailable')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: /Try again|Retry/ })).toBeInTheDocument();
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
      expect((screen.getAllByText('Network error — file was not uploaded').length)).toBeGreaterThan(0);
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
      expect((screen.getAllByText(/Upload did not complete/).length)).toBeGreaterThan(0);
    });
    expect(api.post).not.toHaveBeenCalled();
  });
});