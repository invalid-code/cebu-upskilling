import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import CourseContentPage from './CourseContentPage';

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
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
        { lessonId: '55555555-5555-5555-5555-555555555555', name: 'HTML Introduction', durationMinutes: 12, isCompleted: true },
        { lessonId: '66666666-6666-6666-6666-666666666666', name: 'HTML Tags', durationMinutes: 15, isCompleted: false },
      ],
    },
  ],
};

function renderPage(initialPath = '/courses/11111111-1111-1111-1111-111111111111/learn/55555555-5555-5555-5555-555555555555') {
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
    api.put.mockReset();
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
      '/coursecontent/courses/11111111-1111-1111-1111-111111111111/content?lessonId=55555555-5555-5555-5555-555555555555',
      { signal: expect.anything() },
    );
  });

  it('fetches without a lessonId when none is present', async () => {
    api.get.mockResolvedValue(courseData);

    renderPage('/courses/11111111-1111-1111-1111-111111111111/learn');

    const titles = await screen.findAllByText('Modern Web Development');
    expect(titles.length).toBeGreaterThan(0);
    expect(api.get).toHaveBeenCalledWith('/coursecontent/courses/11111111-1111-1111-1111-111111111111/content', { signal: expect.anything() });
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

  describe('progress saving', () => {
    const SECOND = '/courses/11111111-1111-1111-1111-111111111111/learn/66666666-6666-6666-6666-666666666666';

    it('shows the saved indication, updates the meter and raises a certificate toast', async () => {
      api.get.mockResolvedValue(courseData);
      api.put.mockResolvedValue({ lessonId: 'x', isCompleted: true, progressPercent: 100, certificateId: 'cert-1' });
      renderPage(SECOND);
      fireEvent.click(await screen.findByRole('button', { name: 'Mark lesson complete' }));

      expect(await screen.findByText('Progress saved')).toBeInTheDocument();
      expect(screen.getByText('100% complete')).toBeInTheDocument();
      expect(screen.getByRole('meter', { name: 'Course progress' })).toHaveAttribute('aria-valuenow', '100');
      expect(document.querySelector('[data-variant="certificate"]')).not.toBeNull();
    });

    it('shows an error and keeps the meter when saving fails', async () => {
      api.get.mockResolvedValue(courseData);
      api.put.mockRejectedValue(new Error('Server error'));
      renderPage(SECOND);
      fireEvent.click(await screen.findByRole('button', { name: 'Mark lesson complete' }));

      expect(await screen.findByText(/Progress not saved/)).toBeInTheDocument();
      expect(screen.getByText('50% complete')).toBeInTheDocument();
      expect(screen.getAllByRole('heading', { name: 'HTML Introduction' }).length).toBeGreaterThan(0);
    });
  });

  describe('responsive panes', () => {
    const originalWidth = window.innerWidth;
    afterEach(() => { window.innerWidth = originalWidth; });

    it('shows outline, lesson and notes side by side at 1024px and up', async () => {
      window.innerWidth = 1280;
      api.get.mockResolvedValue(courseData);
      renderPage();
      await screen.findByText('Welcome aboard.');
      expect(document.querySelector('[data-mode="wide"]')).not.toBeNull();
      expect(screen.getByLabelText('Course outline')).toBeInTheDocument();
      expect(screen.getByLabelText('Notes and discussion')).toBeInTheDocument();
    });

    it('opens notes/discussion as a bottom sheet between 640px and 1023px', async () => {
      window.innerWidth = 800;
      api.get.mockResolvedValue(courseData);
      renderPage();
      await screen.findByText('Welcome aboard.');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Notes & discussion/ }));
      expect(screen.getByRole('dialog', { name: 'Notes & discussion' })).toBeInTheDocument();
    });

    it('opens the outline as a drawer below 640px', async () => {
      window.innerWidth = 400;
      api.get.mockResolvedValue(courseData);
      renderPage();
      await screen.findByText('Welcome aboard.');
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Course outline/ }));
      expect(screen.getByRole('dialog', { name: 'Course outline' })).toBeInTheDocument();
    });
  });

  it('navigates back to the courses list', async () => {
    api.get.mockResolvedValue(courseData);

    renderPage();

    await screen.findAllByText('Modern Web Development');
    fireEvent.click(screen.getByText('Courses'));

    expect(await screen.findByText('CoursesList')).toBeInTheDocument();
  });
});