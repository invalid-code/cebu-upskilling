import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { EnrollmentsProvider } from '../context/EnrollmentsContext';
import CoursesPage from './CoursesPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '../api/client';

const mockCoursesPageData = {
  enrolledCourses: [
    {
      courseId: 1,
      courseName: 'Modern JavaScript Deep Dive',
      started: '2026-01-15T10:00:00Z',
      progressPercent: 69,
      currentModule: 'Module 6',
      totalModules: 8,
      technicalLevel: 9,
    },
  ],
  recommendedCourses: [
    {
      courseId: 2,
      name: 'TypeScript from Zero',
      provider: 'DevCon Cebu Academy',
      description: 'The types skills employers filter for.',
      price: null,
      isFree: true,
      mode: 'Online',
      technicalLevel: 8,
      lessonCount: 6,
      category: 'Languages',
      isEnrolled: false,
      progressPercent: 0,
      isCompleted: false,
      isRecommended: true,
      recommendedReason: 'Recommended',
      unlocksJobsCount: 3,
    },
    {
      courseId: 3,
      name: 'Responsive Layout with CSS Grid',
      provider: 'Serbisyo Digital',
      description: 'Flexbox, grid, and container queries.',
      price: null,
      isFree: true,
      mode: 'Online',
      technicalLevel: 6,
      lessonCount: 5,
      category: 'Frontend',
      isEnrolled: false,
      progressPercent: 0,
      isCompleted: false,
      isRecommended: true,
      recommendedReason: 'Recommended',
      unlocksJobsCount: null,
    },
    {
      courseId: 4,
      name: 'Git & Team Workflows',
      provider: 'TESDA Partner Lab',
      description: 'Branches, merges, and pull requests.',
      price: null,
      isFree: true,
      mode: 'Online',
      technicalLevel: 4,
      lessonCount: 4,
      category: 'Tooling',
      isEnrolled: false,
      progressPercent: 0,
      isCompleted: false,
      isRecommended: true,
      recommendedReason: 'Recommended',
      unlocksJobsCount: null,
    },
  ],
  dayStreak: 6,
  coursesInProgress: 2,
  certificatesEarned: 1,
};

function renderCourses() {
  localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner', targetRole: 'Frontend Developer' }));
  localStorage.setItem('token', 'abc');

  return render(
    <MemoryRouter>
      <AuthProvider>
        <EnrollmentsProvider>
          <ToastProvider>
            <CoursesPage />
          </ToastProvider>
        </EnrollmentsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('CoursesPage', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner', targetRole: 'Frontend Developer' }));
    localStorage.setItem('token', 'abc');
    api.get.mockReset();
    api.get.mockResolvedValue(mockCoursesPageData);
  });

  it('renders the courses page heading', async () => {
    renderCourses();
    expect(await screen.findByRole('heading', { name: 'Courses' })).toBeInTheDocument();
  });

  it('renders the subtitle', async () => {
    renderCourses();
    expect(await screen.findByText(/Every course is picked to close a real gap/)).toBeInTheDocument();
  });

  it('displays stat cards when data loads', async () => {
    renderCourses();
    await screen.findByText('6');
    expect(screen.getByText('Day learning streak')).toBeInTheDocument();
    expect(screen.getByText('Courses in progress')).toBeInTheDocument();
    expect(screen.getByText('Certificates earned')).toBeInTheDocument();
  });

  it('displays enrolled courses in Continue learning section', async () => {
    renderCourses();
    expect(await screen.findByText('Continue learning')).toBeInTheDocument();
    expect(screen.getByText('Modern JavaScript Deep Dive')).toBeInTheDocument();
    expect(screen.getByText('Resume')).toBeInTheDocument();
    expect(screen.getByText('9h')).toBeInTheDocument();
  });

  it('displays recommended courses', async () => {
    renderCourses();
    expect(await screen.findByText('Recommended for your pathway')).toBeInTheDocument();
    expect(screen.getByText('TypeScript from Zero')).toBeInTheDocument();
    expect(screen.getByText('Responsive Layout with CSS Grid')).toBeInTheDocument();
    expect(screen.getByText('Git & Team Workflows')).toBeInTheDocument();
  });

  it('shows filter tabs', async () => {
    renderCourses();
    await screen.findByText('Recommended for your pathway');
    expect(screen.getByRole('button', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Frontend' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Languages' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tooling' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Career' })).toBeInTheDocument();
  });

  it('filters courses by category', async () => {
    renderCourses();
    await screen.findByText('Recommended for your pathway');

    fireEvent.click(screen.getByRole('button', { name: 'Frontend' }));

    expect(screen.getByText('Responsive Layout with CSS Grid')).toBeInTheDocument();
    expect(screen.queryByText('TypeScript from Zero')).not.toBeInTheDocument();
    expect(screen.queryByText('Git & Team Workflows')).not.toBeInTheDocument();
  });

  it('shows enroll button for recommended courses', async () => {
    renderCourses();
    await screen.findByText('TypeScript from Zero');
    const enrollButtons = screen.getAllByText('→ Enroll free');
    expect(enrollButtons.length).toBeGreaterThan(0);
  });

  it('shows loading state initially', async () => {
    let resolveFn;
    api.get.mockReset();
    api.get.mockImplementation((path) => {
      if (path === '/coursespage') {
        return new Promise((resolve) => { resolveFn = resolve; });
      }
      if (path === '/enrollments') return Promise.resolve([]);
      return Promise.resolve(null);
    });

    renderCourses();

    expect(screen.getByText('Loading courses...')).toBeInTheDocument();

    resolveFn(mockCoursesPageData);
    await screen.findByText('Continue learning');
    expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument();
  });

  it('shows error state when API fails', async () => {
    api.get.mockReset();
    api.get.mockImplementation((path) => {
      if (path === '/coursespage') return Promise.reject(new Error('Network error'));
      if (path === '/enrollments') return Promise.resolve([]);
      return Promise.resolve(null);
    });

    renderCourses();

    expect(await screen.findByText("Couldn't load courses. Check back later.")).toBeInTheDocument();
  });

  it('shows empty state when no courses available', async () => {
    api.get.mockReset();
    api.get.mockImplementation((path) => {
      if (path === '/coursespage') {
        return Promise.resolve({
          enrolledCourses: [],
          recommendedCourses: [],
          dayStreak: 0,
          coursesInProgress: 0,
          certificatesEarned: 0,
        });
      }
      if (path === '/enrollments') return Promise.resolve([]);
      return Promise.resolve(null);
    });

    renderCourses();

    expect(await screen.findByText('No courses available yet. Enroll in courses to start learning.')).toBeInTheDocument();
  });
});
