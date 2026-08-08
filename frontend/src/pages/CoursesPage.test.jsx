import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { EnrollmentsProvider } from '../context/EnrollmentsContext';
import CoursesPage from './CoursesPage';

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
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
    price: 0,
  },
  {
    courseId: 2,
    name: 'TypeScript from Zero to Confident',
    genre: { name: 'DevCon Cebu Academy' },
    technicalLevel: 12,
    description: 'Build toward Intermediate.',
    price: 2500,
  },
  {
    courseId: 3,
    name: 'Frontend Portfolio Sprint',
    genre: { name: 'Serbisyo Digital' },
    technicalLevel: 6,
    description: 'Ship one portfolio project.',
    price: 5000,
  },
];

function renderCourses() {
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
    localStorage.setItem('user', JSON.stringify({ firstName: 'Test', role: 'Learner' }));
    localStorage.setItem('token', 'abc');
    api.get.mockReset();
    api.get.mockResolvedValue(mockCourses);
  });

  it('renders the courses page heading', async () => {
    renderCourses();
    expect(await screen.findByRole('heading', { name: 'Courses for the gap you have.' })).toBeInTheDocument();
  });

  it('renders search and filter inputs', async () => {
    renderCourses();
    expect(await screen.findByPlaceholderText('Search courses or skills')).toBeInTheDocument();
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
    expect(selects[0]).toHaveValue('');
    expect(selects[1]).toHaveValue('');
  });

  it('displays course cards when data loads', async () => {
    renderCourses();
    expect(await screen.findByText('Modern JavaScript for Frontend Work')).toBeInTheDocument();
    expect(screen.getByText('TypeScript from Zero to Confident')).toBeInTheDocument();
    expect(screen.getByText('Frontend Portfolio Sprint')).toBeInTheDocument();
  });

  it('populates provider filter with unique providers', async () => {
    renderCourses();
    await screen.findByText('Modern JavaScript for Frontend Work');

    const providerSelect = screen.getAllByRole('combobox')[0];
    expect(providerSelect).toHaveValue('');
    expect(screen.getByRole('option', { name: 'CodeChum Learning' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'DevCon Cebu Academy' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Serbisyo Digital' })).toBeInTheDocument();
  });

  it('filters courses by search term', async () => {
    renderCourses();
    await screen.findByText('Modern JavaScript for Frontend Work');

    const searchInput = screen.getByPlaceholderText('Search courses or skills');
    fireEvent.change(searchInput, { target: { value: 'TypeScript' } });

    expect(screen.getByText('TypeScript from Zero to Confident')).toBeInTheDocument();
    expect(screen.queryByText('Modern JavaScript for Frontend Work')).not.toBeInTheDocument();
    expect(screen.queryByText('Frontend Portfolio Sprint')).not.toBeInTheDocument();
  });

  it('filters courses by provider', async () => {
    renderCourses();
    await screen.findByText('Modern JavaScript for Frontend Work');

    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'DevCon Cebu Academy' },
    });

    expect(screen.getByText('TypeScript from Zero to Confident')).toBeInTheDocument();
    expect(screen.queryByText('Modern JavaScript for Frontend Work')).not.toBeInTheDocument();
    expect(screen.queryByText('Frontend Portfolio Sprint')).not.toBeInTheDocument();
  });

  it('filters courses by price - free', async () => {
    renderCourses();
    await screen.findByText('Modern JavaScript for Frontend Work');

    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'free' },
    });

    expect(screen.getByText('Modern JavaScript for Frontend Work')).toBeInTheDocument();
    expect(screen.queryByText('TypeScript from Zero to Confident')).not.toBeInTheDocument();
    expect(screen.queryByText('Frontend Portfolio Sprint')).not.toBeInTheDocument();
  });

  it('filters courses by price - paid', async () => {
    renderCourses();
    await screen.findByText('Modern JavaScript for Frontend Work');

    fireEvent.change(screen.getAllByRole('combobox')[1], {
      target: { value: 'paid' },
    });

    expect(screen.queryByText('Modern JavaScript for Frontend Work')).not.toBeInTheDocument();
    expect(screen.getByText('TypeScript from Zero to Confident')).toBeInTheDocument();
    expect(screen.getByText('Frontend Portfolio Sprint')).toBeInTheDocument();
  });

  it('shows empty state when no courses match filter', async () => {
    renderCourses();
    await screen.findByText('Modern JavaScript for Frontend Work');

    const searchInput = screen.getByPlaceholderText('Search courses or skills');
    fireEvent.change(searchInput, { target: { value: 'NonExistentCourse' } });

    expect(await screen.findByText('No courses match your search.')).toBeInTheDocument();
  });

  it('shows loading state initially', async () => {
    const resolveFns = [];
    api.get.mockImplementation(() => new Promise((resolve) => { resolveFns.push(resolve); }));

    renderCourses();

    expect(screen.getByText('Loading courses...')).toBeInTheDocument();

    resolveFns.forEach((resolve) => resolve(mockCourses));
    await waitFor(() => expect(screen.queryByText('Loading courses...')).not.toBeInTheDocument());
    await waitFor(() => expect(screen.getByText('Modern JavaScript for Frontend Work')).toBeInTheDocument());
  });

  it('shows error state when API fails', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    renderCourses();

    expect(await screen.findByText("Couldn't load courses. Check back later.")).toBeInTheDocument();
  });
});