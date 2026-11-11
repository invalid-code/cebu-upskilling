import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthContext';
import { ToastProvider } from '../../context/ToastContext';
import CourseManagementPage from '../../pages/CourseManagementPage';

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), postForm: vi.fn() },
}));
import { api } from '../../api/client';

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
  localStorage.setItem('user', JSON.stringify({ firstName: 'Ana', lastName: 'Santos', role: 'CourseProvider' }));
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

const goToStep = (n) => fireEvent.click(screen.getByRole('button', { name: new RegExp(`Step ${n} of 4`) }));

describe('Course Studio - additional coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.values(api).forEach((fn) => fn.mockReset());
  });

  it('shows the unavailable notice on AI 502 and keeps manual controls enabled', async () => {
    api.post.mockRejectedValue(Object.assign(new Error('bad gateway'), { status: 502 }));
    renderAt('/company-courses/new');
    await screen.findByText('Generate with AI');
    fireEvent.change(screen.getByPlaceholderText(/A 4-week onboarding for junior customer/), { target: { value: 'brief' } });
    fireEvent.click(screen.getByRole('button', { name: /Generate draft into editor/ }));
    expect(await screen.findByText('Suggestions are unavailable right now')).toBeInTheDocument();
    expect(screen.queryByText('bad gateway')).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. Modern customer support fundamentals')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeEnabled();
  });

  it('retains data from every step when moving back and forth', async () => {
    renderAt('/company-courses/new');
    fireEvent.change(await screen.findByPlaceholderText('e.g. Modern customer support fundamentals'), { target: { value: 'Kept name' } });
    goToStep(2);
    fireEvent.click(screen.getByRole('button', { name: 'Add module' }));
    goToStep(3);
    fireEvent.click(screen.getByRole('button', { name: 'Add lesson' }));
    fireEvent.change(screen.getByLabelText('Lesson 1 name'), { target: { value: 'Kept lesson' } });
    goToStep(4);
    goToStep(1);
    expect(screen.getByDisplayValue('Kept name')).toBeInTheDocument();
    goToStep(3);
    expect(screen.getByDisplayValue('Kept lesson')).toBeInTheDocument();
  });

  describe('unsaved-changes route-leave prompt', () => {
    async function openDirtyEditor() {
      api.get.mockImplementation(async (url) => (url === '/company/courses' ? [] : existingCourse));
      renderAt('/company-courses/42/edit');
      const name = await screen.findByDisplayValue('Existing Course');
      fireEvent.change(name, { target: { value: 'Edited' } });
      fireEvent.click(screen.getByRole('link', { name: /All courses/ }));
    }

    it('prompts when leaving with unsaved edits and stays on Keep editing', async () => {
      await openDirtyEditor();
      expect(await screen.findByText('Discard unsaved changes?')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Keep editing' }));
      await waitFor(() => expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument());
      expect(screen.getByDisplayValue('Edited')).toBeInTheDocument();
    });

    it('navigates away after Leave without saving', async () => {
      await openDirtyEditor();
      await screen.findByText('Discard unsaved changes?');
      fireEvent.click(screen.getByRole('button', { name: 'Leave without saving' }));
      expect(await screen.findByText('Course studio')).toBeInTheDocument();
    });

    it('does not prompt when there are no edits', async () => {
      api.get.mockImplementation(async (url) => (url === '/company/courses' ? [] : existingCourse));
      renderAt('/company-courses/42/edit');
      await screen.findByDisplayValue('Existing Course');
      fireEvent.click(screen.getByRole('link', { name: /All courses/ }));
      expect(await screen.findByText('Course studio')).toBeInTheDocument();
      expect(screen.queryByText('Discard unsaved changes?')).not.toBeInTheDocument();
    });
  });
});
