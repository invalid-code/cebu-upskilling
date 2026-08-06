import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { EnrollmentsProvider } from '../context/EnrollmentsContext';
import { ToastProvider } from '../context/ToastContext';
import OverviewPage from './OverviewPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from '../api/client';

const mockCourses = [
  {
    courseId: 1,
    name: 'Modern JavaScript for Frontend Work',
    genre: { name: 'CodeChum Learning' },
    technicalLevel: 18,
    description: 'Closes your largest current gap.',
  },
  {
    courseId: 2,
    name: 'TypeScript from Zero to Confident',
    genre: { name: 'DevCon Cebu Academy' },
    technicalLevel: 12,
    description: 'Build toward Intermediate.',
  },
  {
    courseId: 3,
    name: 'Frontend Portfolio Sprint',
    genre: { name: 'Serbisyo Digital' },
    technicalLevel: 6,
    description: 'Ship one portfolio project.',
  },
];

function renderOverview() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <EnrollmentsProvider>
          <ToastProvider>
            <OverviewPage />
          </ToastProvider>
        </EnrollmentsProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe('OverviewPage', () => {
  beforeEach(() => {
    localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner' }));
    localStorage.setItem('token', 'abc');
    api.get.mockReset();
    api.post.mockReset();
    api.get.mockImplementation((path) => {
      if (path === '/courses') return Promise.resolve(mockCourses);
      if (path === '/enrollments') return Promise.resolve([]);
      return Promise.resolve([]);
    });
  });

  it('renders the dashboard heading', async () => {
    renderOverview();
    expect(await screen.findByRole('heading', { name: 'Your next move is clear.' })).toBeInTheDocument();
  });

  it('shows empty states when there is no backend data', async () => {
    api.get.mockImplementation((path) => {
      if (path === '/courses') return Promise.resolve([]);
      if (path === '/enrollments') return Promise.resolve([]);
      return Promise.resolve([]);
    });
    renderOverview();
    expect(await screen.findByText('No skill gaps loaded')).toBeInTheDocument();
    expect(screen.getByText('No score yet')).toBeInTheDocument();
    expect(screen.getByText('Your pathway will appear here')).toBeInTheDocument();
  });

  it('renders recommended courses fetched from the backend', async () => {
    renderOverview();
    expect(await screen.findByText('Modern JavaScript for Frontend Work')).toBeInTheDocument();
    expect(screen.getByText('TypeScript from Zero to Confident')).toBeInTheDocument();
    expect(screen.getByText('Frontend Portfolio Sprint')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Enroll' })).toHaveLength(3);
  });

  it('shows a toast when a course is enrolled', async () => {
    api.post.mockResolvedValue({ courseId: 1, started: '2026-01-01T00:00:00Z' });
    renderOverview();
    const enroll = await screen.findAllByRole('button', { name: 'Enroll' });
    fireEvent.click(enroll[0]);
    expect(await screen.findByText('Course added to your pathway')).toBeInTheDocument();
  });
});
