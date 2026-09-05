import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import CourseManagementPage from './CourseManagementPage';

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), postForm: vi.fn() },
}));

import { api } from '../api/client';

const recruiter = { firstName: 'Maria', lastName: 'Lopez', role: 'Recruiter' };

const draftResponse = {
  name: 'AI Onboarding for Support',
  description: 'Master ticketing and escalation.',
  technicalLevel: 3,
  mode: 'Online',
  rationale: 'Grounded in 2 skills — prepares BPO agents.',
  matchedSkills: [
    { skillId: 1, name: 'Customer Support', category: 'Service' },
    { skillId: 2, name: 'Ticketing', category: null },
  ],
  modules: [
    { name: 'Module 1: Basics', description: 'Intro', order: 0, lessons: [{ name: 'Lesson 1', description: 'A', order: 0 }, { name: 'Lesson 2', description: 'B', order: 1 }] },
    { name: 'Module 2: Escalation', description: 'Escalate', order: 1, lessons: [{ name: 'Lesson 3', description: 'C', order: 0 }] },
  ],
};

const existingCourse = {
  courseId: 42,
  name: 'Existing Course',
  description: 'Existing desc',
  technicalLevel: 2,
  mode: 'Hybrid',
  price: 100,
  modules: [{ name: 'M1', description: 'D1', order: 0, lessons: [{ name: 'L1', description: '', order: 0 }] }],
  status: 'Draft',
};

function renderAt(path) {
  window.history.pushState({}, '', path);
  localStorage.setItem('user', JSON.stringify(recruiter));
  localStorage.setItem('token', 'abc');
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/company-courses" element={<CourseManagementPage />} />
            <Route path="/company-courses/new" element={<CourseManagementPage />} />
            <Route path="/company-courses/:courseId/edit" element={<CourseManagementPage />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('CourseManagementPage', () => {
  beforeEach(() => {
    localStorage.clear();
    api.get.mockReset();
    api.post.mockReset();
    api.put.mockReset();
    api.delete.mockReset();
    api.postForm.mockReset();
    vi.stubGlobal('confirm', vi.fn(() => true));
  });

  describe('CourseList', () => {
    it('renders studio heading and Create course without Generate with AI', async () => {
      api.get.mockResolvedValue([]);
      renderAt('/company-courses');
      expect(await screen.findByText('Course studio')).toBeInTheDocument();
      expect(screen.getByText(/Build practical learning paths/)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Create course/ })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Generate with AI/ })).not.toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Generate with AI/ })).not.toBeInTheDocument();
      expect(api.get).toHaveBeenCalledWith('/company/courses');
    });

    it('shows loading then empty state', async () => {
      let resolve;
      api.get.mockImplementation(() => new Promise((r) => { resolve = r; }));
      renderAt('/company-courses');
      expect(screen.getByText('Loading your curriculum...')).toBeInTheDocument();
      resolve([]);
      expect(await screen.findByText('Start your course library')).toBeInTheDocument();
    });

    it('lists courses with edit and delete actions', async () => {
      api.get.mockResolvedValue([
        { courseId: 1, name: 'Intro to Support', moduleCount: 2, lessonCount: 4, mode: 'Online', status: 'Draft' },
        { courseId: 2, name: 'Advanced Ops', moduleCount: 3, lessonCount: 6, mode: 'Hybrid', status: 'Published' },
      ]);
      renderAt('/company-courses');
      expect(await screen.findByText('Intro to Support')).toBeInTheDocument();
      expect(screen.getByText('Advanced Ops')).toBeInTheDocument();
      expect(screen.getByText('2 modules · 4 lessons · Online')).toBeInTheDocument();
      expect(screen.getAllByRole('link', { name: 'Edit course' })).toHaveLength(2);
    });

    it('deletes a course after confirm', async () => {
      api.get.mockResolvedValue([{ courseId: 9, name: 'Temp Course', moduleCount: 1, lessonCount: 1, mode: 'Online', status: 'Draft' }]);
      api.delete.mockResolvedValue({});
      renderAt('/company-courses');
      await screen.findByText('Temp Course');
      fireEvent.click(screen.getByLabelText('Delete Temp Course'));
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/company/courses/9'));
    });
  });

  describe('CourseEditor - create mode AI generation', () => {
    it('shows AI panel only when creating', async () => {
      api.get.mockResolvedValue([]);
      renderAt('/company-courses/new');
      expect(await screen.findByText('Generate with AI')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/A 4-week onboarding for junior customer/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Generate draft into editor/ })).toBeDisabled();
      expect(screen.getByText(/Optional — describe what the course should teach/)).toBeInTheDocument();
    });

    it('does not show AI panel when editing existing course', async () => {
      api.get.mockResolvedValue(existingCourse);
      renderAt('/company-courses/42/edit');
      await waitFor(() => expect(api.get).toHaveBeenCalledWith('/company/courses/42'));
      expect(await screen.findByDisplayValue('Existing Course')).toBeInTheDocument();
      expect(screen.queryByText('Generate with AI')).not.toBeInTheDocument();
    });

    it('validates empty brief without calling API', async () => {
      renderAt('/company-courses/new');
      await screen.findByText('Generate with AI');
      const btn = screen.getByRole('button', { name: /Generate draft into editor/ });
      expect(btn).toBeDisabled();
      fireEvent.click(btn);
      expect(api.post).not.toHaveBeenCalled();
    });

    it('calls generate endpoint with correct payload and populates editor', async () => {
      api.post.mockResolvedValue(draftResponse);
      renderAt('/company-courses/new');
      await screen.findByText('Generate with AI');

      const brief = screen.getByPlaceholderText(/A 4-week onboarding for junior customer/);
      fireEvent.change(brief, { target: { value: 'Onboarding for support agents' } });

      fireEvent.click(screen.getByRole('button', { name: /Generate draft into editor/ }));

      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith('/company/courses/generate', {
          brief: 'Onboarding for support agents',
          technicalLevel: 3,
          mode: 'Online',
          moduleCount: 4,
          lessonsPerModule: 3,
        }),
      );

      // Draft populates course fields
      expect(await screen.findByDisplayValue('AI Onboarding for Support')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Master ticketing and escalation.')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Module 1: Basics')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Lesson 1')).toBeInTheDocument();
      // Skills and rationale appear
      expect(screen.getByText('Customer Support · Service')).toBeInTheDocument();
      expect(screen.getByText('Ticketing')).toBeInTheDocument();
      expect(screen.getByText(/Grounded in 2 skills/)).toBeInTheDocument();
    });

    it('shows API error when generation fails', async () => {
      api.post.mockRejectedValue(new Error('AI unavailable'));
      renderAt('/company-courses/new');
      await screen.findByText('Generate with AI');
      fireEvent.change(screen.getByPlaceholderText(/A 4-week onboarding for junior customer/), { target: { value: 'test brief' } });
      fireEvent.click(screen.getByRole('button', { name: /Generate draft into editor/ }));
      expect(await screen.findByText('AI unavailable')).toBeInTheDocument();
    });

    it('disables Generate button while generating', async () => {
      let resolve;
      api.post.mockImplementation(() => new Promise((r) => { resolve = r; }));
      renderAt('/company-courses/new');
      await screen.findByText('Generate with AI');
      fireEvent.change(screen.getByPlaceholderText(/A 4-week onboarding for junior customer/), { target: { value: 'brief' } });
      fireEvent.click(screen.getByRole('button', { name: /Generate draft into editor/ }));
      expect(screen.getByRole('button', { name: /Generating/ })).toBeDisabled();
      resolve(draftResponse);
      await waitFor(() => expect(screen.queryByText('Generating…')).not.toBeInTheDocument());
    });

    it('saves generated draft via normal course creation', async () => {
      api.post.mockResolvedValueOnce(draftResponse); // generate
      api.post.mockResolvedValueOnce({ courseId: 99, name: 'AI Onboarding for Support' }); // save
      renderAt('/company-courses/new');
      await screen.findByText('Generate with AI');
      fireEvent.change(screen.getByPlaceholderText(/A 4-week onboarding for junior customer/), { target: { value: 'brief' } });
      fireEvent.click(screen.getByRole('button', { name: /Generate draft into editor/ }));
      await screen.findByDisplayValue('AI Onboarding for Support');

      fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
      await waitFor(() =>
        expect(api.post).toHaveBeenCalledWith('/company/courses', expect.objectContaining({ name: 'AI Onboarding for Support', modules: expect.any(Array) })),
      );
    });
  });

  describe('CourseEditor - save and publish', () => {
    it('creates course via POST when new and publishes after save', async () => {
      api.post.mockResolvedValueOnce({ courseId: 10, name: 'New Course' });
      api.post.mockResolvedValueOnce({}); // publish
      renderAt('/company-courses/new');
      await screen.findByPlaceholderText('e.g. Modern customer support fundamentals');
      fireEvent.change(screen.getByPlaceholderText('e.g. Modern customer support fundamentals'), { target: { value: 'New Course' } });
      fireEvent.click(screen.getByRole('button', { name: 'Publish' }));
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/company/courses', expect.objectContaining({ name: 'New Course' })));
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/company/courses/10/publish'));
    });

    it('updates existing course via PUT', async () => {
      api.get.mockResolvedValue(existingCourse);
      api.put.mockResolvedValue({ courseId: 42 });
      renderAt('/company-courses/42/edit');
      await screen.findByDisplayValue('Existing Course');
      fireEvent.change(screen.getByDisplayValue('Existing Course'), { target: { value: 'Updated Course' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
      await waitFor(() => expect(api.put).toHaveBeenCalledWith('/company/courses/42', expect.objectContaining({ name: 'Updated Course' })));
    });

    it('includes lesson content blocks in the save payload', async () => {
      api.post.mockResolvedValueOnce({ courseId: 11, name: 'Content Course' });
      renderAt('/company-courses/new');
      await screen.findByPlaceholderText('e.g. Modern customer support fundamentals');
      fireEvent.click(screen.getByRole('button', { name: 'Add module' }));
      fireEvent.click(screen.getByRole('button', { name: 'Add lesson' }));
      fireEvent.change(screen.getByLabelText('Lesson 1 name'), { target: { value: 'Intro' } });
      fireEvent.click(screen.getByRole('button', { name: 'Toggle content for lesson 1' }));
      fireEvent.click(screen.getByRole('button', { name: 'Add content block' }));
      fireEvent.change(screen.getByLabelText('Content block 1 text'), { target: { value: 'Welcome to the course' } });
      fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
      await waitFor(() => expect(api.post).toHaveBeenCalledWith('/company/courses', expect.objectContaining({
        modules: [expect.objectContaining({
          lessons: [expect.objectContaining({
            name: 'Intro',
            contents: [{ blockType: 'text', content: 'Welcome to the course' }],
          })],
        })],
      })));
    });

    it('loads existing lesson contents in edit mode', async () => {
      api.get.mockResolvedValue({
        ...existingCourse,
        modules: [{ name: 'M1', description: 'D1', order: 0, lessons: [{ name: 'L1', description: '', order: 0, contents: [{ contentId: 5, blockType: 'heading', content: 'Getting started', lessonOrder: 0 }] }] }],
      });
      renderAt('/company-courses/42/edit');
      await screen.findByDisplayValue('L1');
      fireEvent.click(screen.getByRole('button', { name: 'Toggle content for lesson 1' }));
      expect(screen.getByLabelText('Content block 1 text')).toHaveValue('Getting started');
    });

    it('lists existing lesson media in edit mode', async () => {
      api.get.mockResolvedValue({
        ...existingCourse,
        modules: [{ name: 'M1', description: 'D1', order: 0, lessons: [{ lessonId: 9, name: 'L1', description: '', order: 0, contents: [], media: [{ mediaId: 3, pathFile: 'https://cdn.example/handout.pdf', type: 'application/pdf', mbSize: 1.0 }] }] }],
      });
      renderAt('/company-courses/42/edit');
      await screen.findByDisplayValue('L1');
      fireEvent.click(screen.getByRole('button', { name: 'Toggle content for lesson 1' }));
      expect(screen.getByText(/handout.pdf/)).toBeInTheDocument();
    });

    it('attaches a video to a saved lesson via the video endpoint', async () => {
      api.get.mockResolvedValue({
        ...existingCourse,
        modules: [{ name: 'M1', description: 'D1', order: 0, lessons: [{ lessonId: 9, name: 'L1', description: '', order: 0, contents: [], media: [] }] }],
      });
      api.postForm.mockResolvedValue({ mediaId: 4, pathFile: 'https://cdn.example/intro.mp4', type: 'video/mp4', mbSize: 12.5 });
      renderAt('/company-courses/42/edit');
      await screen.findByDisplayValue('L1');
      fireEvent.click(screen.getByRole('button', { name: 'Toggle content for lesson 1' }));

      const input = screen.getByLabelText('Attach video to lesson 1');
      fireEvent.change(input, { target: { files: [new File(['x'], 'intro.mp4', { type: 'video/mp4' })] } });

      await waitFor(() => expect(api.postForm).toHaveBeenCalledWith('/media/lessons/9/video', expect.any(FormData)));
      expect(await screen.findByText(/intro.mp4/)).toBeInTheDocument();
    });

    it('attaches a document to a saved lesson via the documents endpoint', async () => {
      api.get.mockResolvedValue({
        ...existingCourse,
        modules: [{ name: 'M1', description: 'D1', order: 0, lessons: [{ lessonId: 9, name: 'L1', description: '', order: 0, contents: [], media: [] }] }],
      });
      api.postForm.mockResolvedValue({ mediaId: 5, pathFile: 'https://cdn.example/handout.pdf', type: 'application/pdf', mbSize: 1.0 });
      renderAt('/company-courses/42/edit');
      await screen.findByDisplayValue('L1');
      fireEvent.click(screen.getByRole('button', { name: 'Toggle content for lesson 1' }));

      const input = screen.getByLabelText('Attach file to lesson 1');
      fireEvent.change(input, { target: { files: [new File(['x'], 'handout.pdf', { type: 'application/pdf' })] } });

      await waitFor(() => expect(api.postForm).toHaveBeenCalledWith('/media/lessons/9/documents', expect.any(FormData)));
      expect(await screen.findByText(/handout.pdf/)).toBeInTheDocument();
    });

    it('asks to save first before attaching files to a new lesson', async () => {
      renderAt('/company-courses/new');
      await screen.findByPlaceholderText('e.g. Modern customer support fundamentals');
      fireEvent.click(screen.getByRole('button', { name: 'Add module' }));
      fireEvent.click(screen.getByRole('button', { name: 'Add lesson' }));
      fireEvent.click(screen.getByRole('button', { name: 'Toggle content for lesson 1' }));
      expect(screen.getByText(/Save the course first/)).toBeInTheDocument();
      expect(screen.queryByLabelText('Attach file to lesson 1')).not.toBeInTheDocument();
    });

    it('rejects a non-video file on the video control without calling the API', async () => {
      api.get.mockResolvedValue({
        ...existingCourse,
        modules: [{ name: 'M1', description: 'D1', order: 0, lessons: [{ lessonId: 9, name: 'L1', description: '', order: 0, contents: [], media: [] }] }],
      });
      renderAt('/company-courses/42/edit');
      await screen.findByDisplayValue('L1');
      fireEvent.click(screen.getByRole('button', { name: 'Toggle content for lesson 1' }));

      const input = screen.getByLabelText('Attach video to lesson 1');
      fireEvent.change(input, { target: { files: [new File(['x'], 'notes.pdf', { type: 'application/pdf' })] } });

      expect(await screen.findByText('Only video files are allowed')).toBeInTheDocument();
      expect(api.postForm).not.toHaveBeenCalled();
    });

    it('rejects an oversized document without calling the API', async () => {
      api.get.mockResolvedValue({
        ...existingCourse,
        modules: [{ name: 'M1', description: 'D1', order: 0, lessons: [{ lessonId: 9, name: 'L1', description: '', order: 0, contents: [], media: [] }] }],
      });
      renderAt('/company-courses/42/edit');
      await screen.findByDisplayValue('L1');
      fireEvent.click(screen.getByRole('button', { name: 'Toggle content for lesson 1' }));

      const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'big.pdf', { type: 'application/pdf' });
      const input = screen.getByLabelText('Attach file to lesson 1');
      fireEvent.change(input, { target: { files: [big] } });

      expect(await screen.findByText('File must be 10 MB or smaller')).toBeInTheDocument();
      expect(api.postForm).not.toHaveBeenCalled();
    });
  });
});
