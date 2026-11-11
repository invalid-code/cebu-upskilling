import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from '../context/ToastContext';
import EditJobPage from './EditJobPage';

vi.mock('../api/client', () => ({ api: { get: vi.fn(), put: vi.fn(), post: vi.fn() } }));
import { api } from '../api/client';

const post = {
  postId: 4,
  title: 'Data Analyst',
  description: 'Analyse things.',
  location: 'Cebu City',
  jobType: 'Contract',
  experienceLevel: 'Mid',
  salaryRange: '₱50,000',
  requirements: 'SQL\nExcel',
  isRemote: true,
  isActive: true,
  expiresAt: '2026-12-31T23:59:59Z',
};

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/edit-job/4']}>
      <ToastProvider>
        <Routes>
          <Route path="/edit-job/:postId" element={<EditJobPage />} />
          <Route path="/business-dashboard" element={<p>Dashboard</p>} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('EditJobPage', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.put.mockReset();
  });

  it('prefills the form and preview from the loaded posting', async () => {
    api.get.mockResolvedValue(post);
    renderPage();
    expect(await screen.findByText('Edit job posting')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/posts/4');
    expect(screen.getByLabelText(/Job title/)).toHaveValue('Data Analyst');
    expect(screen.getByLabelText('Location')).toHaveValue('Cebu City');
    expect(screen.getByLabelText('Job type')).toHaveValue('Contract');
    expect(screen.getByLabelText('Experience level')).toHaveValue('Mid');
    expect(screen.getByLabelText('Description')).toHaveValue('Analyse things.');
    expect(screen.getByLabelText(/Applications close/)).toHaveValue('2026-12-31');
    expect(screen.getByLabelText('Remote-friendly')).toBeChecked();
    expect(screen.getByTestId('job-preview')).toHaveTextContent('Data Analyst');
    expect(screen.getByTestId('job-preview')).toHaveTextContent('Excel');
  });

  it('saves via PUT and returns to the dashboard', async () => {
    api.get.mockResolvedValue(post);
    api.put.mockResolvedValue({});
    renderPage();
    await screen.findByText('Edit job posting');
    fireEvent.change(screen.getByLabelText(/Job title/), { target: { value: 'Senior Analyst' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(api.put).toHaveBeenCalledWith('/posts/4', expect.objectContaining({ title: 'Senior Analyst' })));
    expect(await screen.findByText('Dashboard')).toBeInTheDocument();
  });

  it('shows an unavailable state when loading fails', async () => {
    api.get.mockRejectedValue(new Error('Not found'));
    renderPage();
    expect(await screen.findByText('Job posting unavailable')).toBeInTheDocument();
    expect(screen.getByText('Not found')).toBeInTheDocument();
  });
});
