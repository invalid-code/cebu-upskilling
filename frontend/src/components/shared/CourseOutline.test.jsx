import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import CourseOutline from './CourseOutline';

const modules = [
  {
    moduleNumber: 1,
    name: 'HTML Fundamentals',
    completedLessonCount: 1,
    lessons: [
      { lessonId: 1, name: 'HTML Introduction', durationMinutes: 12, isCompleted: true },
      { lessonId: 2, name: 'HTML Tags', durationMinutes: 15, isCompleted: false },
    ],
  },
  {
    moduleNumber: 2,
    name: 'CSS Styling',
    completedLessonCount: 0,
    lessons: [{ lessonId: 3, name: 'Selectors', durationMinutes: 10, isCompleted: false }],
  },
];

function renderOutline(props = {}) {
  return render(
    <MemoryRouter>
      <CourseOutline
        modules={modules}
        currentLessonId={2}
        onLessonClick={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );
}

describe('CourseOutline', () => {
  it('renders the outline header with the current module', () => {
    renderOutline();

    expect(screen.getByText('Course Outline')).toBeInTheDocument();
    expect(screen.getByText('HTML Fundamentals')).toBeInTheDocument();
  });

  it('falls back to All Modules when the lesson is not found', () => {
    renderOutline({ currentLessonId: 999 });

    expect(screen.getByText('All Modules')).toBeInTheDocument();
  });

  it('sums progress across modules', () => {
    renderOutline({ currentLessonId: 1 });

    expect(screen.getByText(/1 of 3 lessons/)).toBeInTheDocument();
  });

  it('renders lesson names and durations', () => {
    renderOutline({ currentLessonId: 1 });

    expect(screen.getByText('HTML Introduction')).toBeInTheDocument();
    expect(screen.getByText('HTML Tags')).toBeInTheDocument();
    expect(screen.getByText('12 min')).toBeInTheDocument();
  });

  it('renders only the current module lessons by default', () => {
    renderOutline({ currentLessonId: 1 });

    expect(screen.getByText('HTML Introduction')).toBeInTheDocument();
    expect(screen.getByText('HTML Tags')).toBeInTheDocument();
    expect(screen.queryByText('Selectors')).not.toBeInTheDocument();
  });

  it('shows all modules when All course modules is clicked', () => {
    renderOutline({ currentLessonId: 1 });

    expect(screen.queryByText('Selectors')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('All course modules'));

    expect(screen.getByText('Selectors')).toBeInTheDocument();
    expect(screen.getByText('All Modules')).toBeInTheDocument();
  });

  it('keeps each module\'s lessons under its own module label', () => {
    renderOutline({ currentLessonId: 1 });

    fireEvent.click(screen.getByText('All course modules'));

    const html = document.body.innerHTML;
    expect(html.indexOf('HTML Introduction')).toBeLessThan(html.indexOf('Selectors'));
  });

  it('collapses back to the current module when clicked again', () => {
    renderOutline({ currentLessonId: 1 });

    fireEvent.click(screen.getByText('All course modules'));
    fireEvent.click(screen.getByText('All course modules'));

    expect(screen.queryByText('Selectors')).not.toBeInTheDocument();
    expect(screen.getByText('HTML Fundamentals')).toBeInTheDocument();
  });

  it('calls onLessonClick with the lesson id', () => {
    const onLessonClick = vi.fn();
    renderOutline({ currentLessonId: 1, onLessonClick });

    fireEvent.click(screen.getByText('HTML Tags'));

    expect(onLessonClick).toHaveBeenCalledWith(2);
  });

  it('does not duplicate the module name when it is a generic Module N fallback', () => {
    const genericModules = [
      {
        moduleNumber: 1,
        name: 'Module 1',
        completedLessonCount: 0,
        lessons: [{ lessonId: 1, name: 'Intro', durationMinutes: 10, isCompleted: false }],
      },
    ];

    render(
      <MemoryRouter>
        <CourseOutline modules={genericModules} currentLessonId={1} onLessonClick={vi.fn()} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Module 1')).toBeInTheDocument();
    expect(screen.queryByText('Module 1 · Module 1')).not.toBeInTheDocument();
  });
});