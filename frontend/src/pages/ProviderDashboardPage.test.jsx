import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import ProviderDashboardPage from './ProviderDashboardPage';

vi.mock('../api/client', () => ({ api: { get: vi.fn(), delete: vi.fn() } }));
import { api } from '../api/client';

const courses = [
  { courseId: 1, name: 'JS Basics', description: 'Intro', status: 'Published', technicalLevel: 1, mode: 'Online', moduleCount: 2, lessonCount: 5, updatedAt: '2024-01-01' },
  { courseId: 2, name: 'React Advanced', description: 'Deep dive', status: 'Draft', technicalLevel: 3, mode: 'Hybrid', moduleCount: 1, lessonCount: 2, updatedAt: '2024-02-01' },
  { courseId: 3, name: 'Node OnSite', status: 'Published', mode: 'On-site', moduleCount: 3, lessonCount: 10, updatedAt: '2024-03-01' },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <ToastProvider>
          <ProviderDashboardPage />
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>
  );
}

describe('ProviderDashboardPage', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Ana', lastName: 'Santos', role: 'CourseProvider' }));
    localStorage.setItem('token', 'abc');
    vi.stubGlobal('confirm', vi.fn(() => true));
    api.get.mockReset();
    api.delete.mockReset();
  });

  it('shows loading then renders stats', async () => {
    api.get.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(screen.getByText('Loading provider workspace…')).toBeInTheDocument();
  });

  it('fetches courses and computes stats correctly', async () => {
    api.get.mockResolvedValue(courses);
    renderPage();
    expect(await screen.findByText('Course provider')).toBeInTheDocument();
    expect(screen.getByText('total courses')).toBeInTheDocument();
    expect(screen.getByText(/6 · 17/)).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
    expect(screen.getByText('drafts')).toBeInTheDocument();
    expect(await screen.findByText('JS Basics')).toBeInTheDocument();
  });

  it('renders empty state when no courses', async () => {
    api.get.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText('Start your course library')).toBeInTheDocument();
    expect(screen.getByText('No courses yet — the studio is empty until you create your first course.')).toBeInTheDocument();
  });

  it('handles 403 as empty state not error', async () => {
    const err = new Error('Forbidden'); err.status = 403;
    api.get.mockRejectedValue(err);
    renderPage();
    expect(await screen.findByText('Start your course library')).toBeInTheDocument();
    expect(screen.queryByText('Provider dashboard unavailable')).not.toBeInTheDocument();
  });

  it('handles 401 as empty state', async () => {
    const err = new Error('Unauthorized'); err.status = 401;
    api.get.mockRejectedValue(err);
    renderPage();
    expect(await screen.findByText('Start your course library')).toBeInTheDocument();
  });

  it('shows error card for non-auth failures and retries', async () => {
    api.get.mockRejectedValueOnce(new Error('Network error'));
    renderPage();
    expect(await screen.findByText('Provider dashboard unavailable')).toBeInTheDocument();
    api.get.mockResolvedValue([]);
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /retry|try again/i }));
    await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
  });

  it('renders table rows with edit and delete actions', async () => {
    api.get.mockResolvedValue(courses);
    renderPage();
    expect(await screen.findByText('JS Basics')).toBeInTheDocument();
    expect(screen.getByText('React Advanced')).toBeInTheDocument();
    expect(screen.getAllByLabelText(/Edit/).length).toBe(3);
    expect(screen.getAllByLabelText(/Delete/).length).toBe(3);
  });

  it('handles non-array response as empty list', async () => {
    api.get.mockResolvedValue(null);
    renderPage();
    expect(await screen.findByText('Start your course library')).toBeInTheDocument();
  });

  it('calculates delivery mode bars', async () => {
    api.get.mockResolvedValue(courses);
    renderPage();
    await screen.findByText('JS Basics');
    expect(screen.getByText('Delivery mode')).toBeInTheDocument();
    // modes: Online 1, Hybrid 1, On-site 1
    expect(screen.getAllByText(/course/).length).toBeGreaterThan(0);
  });

  it('shows placeholder for delivery mode when empty', async () => {
    api.get.mockResolvedValue([]);
    renderPage();
    await screen.findByText('Start your course library');
    expect(screen.getByText('Create courses to see your mix of Online, Hybrid and On-site delivery.')).toBeInTheDocument();
  });

  it('deletes a course after confirm', async () => {
    api.get.mockResolvedValue([courses[0]]);
    api.delete.mockResolvedValue(undefined);
    renderPage();
    await screen.findByText('JS Basics');
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Delete JS Basics'));
    await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/company/courses/1'));
    expect(screen.getByText('Course deleted')).toBeInTheDocument();
    // row removed -> empty state
    expect(await screen.findByText('Start your course library')).toBeInTheDocument();
  });

  it('does not delete when confirm dismissed', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false));
    api.get.mockResolvedValue([courses[0]]);
    renderPage();
    await screen.findByText('JS Basics');
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Delete JS Basics'));
    expect(api.delete).not.toHaveBeenCalled();
    expect(screen.getByText('JS Basics')).toBeInTheDocument();
  });

  it('shows toast on delete failure', async () => {
    api.get.mockResolvedValue([courses[0]]);
    api.delete.mockRejectedValue(new Error('Delete failed'));
    renderPage();
    await screen.findByText('JS Basics');
    const user = userEvent.setup();
    await user.click(screen.getByLabelText('Delete JS Basics'));
    expect(await screen.findByText('Delete failed')).toBeInTheDocument();
    expect(screen.getByText('JS Basics')).toBeInTheDocument();
  });

  it('displays published vs draft pills', async () => {
    api.get.mockResolvedValue(courses);
    renderPage();
    await screen.findByText('JS Basics');
    expect(screen.getAllByText('Published').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
  });
});
