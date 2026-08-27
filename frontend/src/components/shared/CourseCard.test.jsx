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
  description: 'Learn the essentials',
  technicalLevel: 18,
  lessonCount: 8,
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
    expect(screen.getByText('CodeChum Learning')).toBeInTheDocument();
    expect(screen.getByText('Learn the essentials')).toBeInTheDocument();
  });

  it('uses the provided tags', () => {
    renderCourse({ tags: [{ label: 'Recommended', variant: 'coral' }] });
    expect(screen.getByText('Recommended')).toBeInTheDocument();
  });

  it('calls the enroll API and shows a toast on success', async () => {
    api.post.mockResolvedValue({ message: 'Enrolled' });
    renderCourse();
    fireEvent.click(screen.getByRole('button', { name: /enroll free/i }));
    expect(await screen.findByText(/Course added to your pathway/)).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith('/enrollments', { courseId: 1 });
  });

  it('shows an error toast when enrollment fails', async () => {
    api.post.mockRejectedValue(new Error('Course not found'));
    renderCourse();
    fireEvent.click(screen.getByRole('button', { name: /enroll free/i }));
    expect(await screen.findByText('Course not found')).toBeInTheDocument();
  });

  it('shows Resume when enrolled and has progress', () => {
    renderCourse({ isEnrolled: true, progressPercent: 50 });
    expect(screen.getByText('Resume')).toBeInTheDocument();
  });

  it('shows Start when enrolled without progress', () => {
    renderCourse({ isEnrolled: true, progressPercent: 0 });
    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('shows View certificate when completed', () => {
    renderCourse({ isEnrolled: true, isCompleted: true, progressPercent: 100 });
    expect(screen.getByText('View certificate')).toBeInTheDocument();
  });
});
