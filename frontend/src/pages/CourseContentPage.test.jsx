import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import CourseContentPage from './CourseContentPage';

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

import { api } from '../api/client';

const courseData = {
  courseName: 'Modern Web Development',
  progressPercent: 50,
  totalLessons: 3,
  currentLesson: {
    name: 'HTML Introduction',
    lessonOrder: 1,
    media: [],
    contentBlocks: [{ blockType: 'text', content: 'Welcome aboard.' }],
  },
  modules: [
    {
      moduleNumber: 1,
      name: 'HTML Fundamentals',
      completedLessonCount: 1,
      lessons: [
        { lessonId: 5, name: 'HTML Introduction', durationMinutes: 12, isCompleted: true },
        { lessonId: 6, name: 'HTML Tags', durationMinutes: 15, isCompleted: false },
      ],
    },
  ],
};

function renderPage(initialPath = '/courses/1/learn/5') {
  localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner' }));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/courses" element={<div>CoursesList</div>} />
            <Route path="/courses/:courseId/learn/:lessonId" element={<CourseContentPage />} />
            <Route path="/courses/:courseId/learn" element={<CourseContentPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('CourseContentPage', () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
  });

  it('shows a loading state while fetching', async () => {
    let resolveFn;
    api.get.mockImplementation(() => new Promise((resolve) => { resolveFn = resolve; }));

    renderPage();

    expect(screen.getByText('Loading course content...')).toBeInTheDocument();

    resolveFn(courseData);
    await screen.findByText('Welcome aboard.');
  });

  it('renders the course and lesson content', async () => {
    api.get.mockResolvedValue(courseData);

    renderPage();

    const titles = await screen.findAllByText('Modern Web Development');
    expect(titles.length).toBeGreaterThan(0);
    expect(screen.getByText('50% complete')).toBeInTheDocument();
    expect(screen.getByText(/HTML Fundamentals/)).toBeInTheDocument();
    expect(screen.getByText('Welcome aboard.')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith(
      '/coursecontent/courses/1/content?lessonId=5',
      { signal: expect.anything() },
    );
  });

  it('fetches without a lessonId when none is present', async () => {
    api.get.mockResolvedValue(courseData);

    renderPage('/courses/1/learn');

    const titles = await screen.findAllByText('Modern Web Development');
    expect(titles.length).toBeGreaterThan(0);
    expect(api.get).toHaveBeenCalledWith('/coursecontent/courses/1/content', { signal: expect.anything() });
  });

  it('renders an error message when the request fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    renderPage();

    expect((await screen.findAllByText('Network error')).length).toBeGreaterThan(0);
  });

  it('shows a friendly empty state instead of crashing when the lesson is missing', async () => {
    api.get.mockResolvedValue({ ...courseData, currentLesson: null, modules: [] });

    renderPage();

    expect(await screen.findByText('Lesson unavailable')).toBeInTheDocument();
  });

  it('navigates back to the courses list', async () => {
    api.get.mockResolvedValue(courseData);

    renderPage();

    await screen.findAllByText('Modern Web Development');
    fireEvent.click(screen.getByText('Courses'));

    expect(await screen.findByText('CoursesList')).toBeInTheDocument();
  });
});