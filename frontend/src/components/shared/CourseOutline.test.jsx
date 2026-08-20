import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
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

describe('CourseOutline', () => {
  it('renders the outline header with the current module', () => {
    render(<CourseOutline modules={modules} currentLessonId={2} onLessonClick={vi.fn()} />);

    expect(screen.getByText('Course Outline')).toBeInTheDocument();
    expect(screen.getByText('Module 1 · HTML Fundamentals')).toBeInTheDocument();
  });

  it('falls back to All Modules when the lesson is not found', () => {
    render(<CourseOutline modules={modules} currentLessonId={999} onLessonClick={vi.fn()} />);

    expect(screen.getByText('All Modules')).toBeInTheDocument();
  });

  it('sums progress across modules', () => {
    render(<CourseOutline modules={modules} currentLessonId={1} onLessonClick={vi.fn()} />);

    expect(screen.getByText('1 of 3 lessons')).toBeInTheDocument();
  });

  it('renders lesson names and durations', () => {
    render(<CourseOutline modules={modules} currentLessonId={1} onLessonClick={vi.fn()} />);

    expect(screen.getByText('HTML Introduction')).toBeInTheDocument();
    expect(screen.getByText('HTML Tags')).toBeInTheDocument();
    expect(screen.getByText('Selectors')).toBeInTheDocument();
    expect(screen.getAllByText('12 min').length).toBe(1);
  });

  it('calls onLessonClick with the lesson id', () => {
    const onLessonClick = vi.fn();
    render(<CourseOutline modules={modules} currentLessonId={1} onLessonClick={onLessonClick} />);

    fireEvent.click(screen.getByText('HTML Tags'));

    expect(onLessonClick).toHaveBeenCalledWith(2);
  });
});