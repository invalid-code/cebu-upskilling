import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider } from '../../context/AuthContext';
import { EnrollmentsProvider } from '../../context/EnrollmentsContext';
import { ToastProvider } from '../../context/ToastContext';
import CourseCard from './CourseCard';

vi.mock('../../api/client', () => ({
  api: {
    get: vi.fn().mockResolvedValue([]),
    post: vi.fn(),
  },
}));

import { api } from '../../api/client';

const course = {
  courseId: 1,
  name: 'Modern JavaScript',
  provider: 'CodeChum Learning',
  mode: 'Online',
  duration: '18 hours',
  price: 'Free',
  description: 'Learn the essentials',
};

function renderCourse(props) {
  return render(
    <AuthProvider>
      <EnrollmentsProvider>
        <ToastProvider>
          <CourseCard course={course} {...props} />
        </ToastProvider>
      </EnrollmentsProvider>
    </AuthProvider>,
  );
}

describe('CourseCard', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner' }));
    localStorage.setItem('token', 'abc');
    api.get.mockResolvedValue([]);
    api.post.mockReset();
  });

  it('renders course details', () => {
    renderCourse();
    expect(screen.getByText('Modern JavaScript')).toBeInTheDocument();
    expect(screen.getByText('CodeChum Learning · Online')).toBeInTheDocument();
    expect(screen.getByText('18 hours')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Learn the essentials')).toBeInTheDocument();
  });

  it('uses the provided tag label', () => {
    renderCourse({ tagLabel: 'Best next step' });
    expect(screen.getByText('Best next step')).toBeInTheDocument();
  });

  it('calls the enroll API and shows a toast on success', async () => {
    api.post.mockResolvedValue({ message: 'Enrolled' });
    renderCourse();
    fireEvent.click(screen.getByRole('button', { name: 'Enroll' }));
    expect(await screen.findByText('Course added to your pathway')).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/enrollments', { courseId: 1 });
  });

  it('shows an error toast when enrollment fails', async () => {
    api.post.mockRejectedValue(new Error('Course not found'));
    renderCourse();
    fireEvent.click(screen.getByRole('button', { name: 'Enroll' }));
    expect(await screen.findByText('Course not found')).toBeInTheDocument();
  });

  it('shows Enrolled after successful enrollment', async () => {
    api.get.mockResolvedValueOnce([]);
    api.get.mockResolvedValueOnce([{ courseId: 1, started: '2026-01-01T00:00:00Z' }]);
    api.post.mockResolvedValue({ courseId: 1, started: '2026-01-01T00:00:00Z' });
    renderCourse();
    fireEvent.click(screen.getByRole('button', { name: 'Enroll' }));
    expect(await screen.findByRole('button', { name: 'Enrolled' })).toBeInTheDocument();
  });

  it('shows Enrolled when already enrolled from the backend', async () => {
    api.get.mockResolvedValue([{ courseId: 1, started: '2026-01-01T00:00:00Z' }]);
    renderCourse();
    expect(await screen.findByRole('button', { name: 'Enrolled' })).toBeInTheDocument();
  });
});
