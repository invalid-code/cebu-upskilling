import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CourseDetailPanel from './CourseDetailPanel';

const course = {
  courseId: 4,
  name: 'Modern Web Development',
  provider: 'DevCon Cebu Academy',
  category: 'Web',
  technicalLevel: 3,
  description: 'Build production-ready web apps',
  lessonCount: 8,
  totalModules: 3,
  completedModules: 1,
  modules: [
    { moduleNumber: 1, name: 'HTML Fundamentals', lessonCount: 4 },
    { moduleNumber: 2, name: 'CSS Styling', lessonCount: 1 },
    { moduleNumber: 3, name: 'JavaScript Core', lessonCount: 3 },
  ],
};

describe('CourseDetailPanel', () => {
  it('renders nothing when no course is provided', () => {
    const { container } = render(<CourseDetailPanel course={null} onClose={vi.fn()} onResume={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the course title, provider and stats', () => {
    render(<CourseDetailPanel course={course} onClose={vi.fn()} onResume={vi.fn()} />);

    expect(screen.getByText('Modern Web Development')).toBeInTheDocument();
    expect(screen.getByText('DevCon Cebu Academy')).toBeInTheDocument();
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('8h')).toBeInTheDocument();
    expect(screen.getByText('to finish')).toBeInTheDocument();
  });

  it('renders syllabus modules with lesson counts', () => {
    render(<CourseDetailPanel course={course} onClose={vi.fn()} onResume={vi.fn()} />);

    expect(screen.getByText('Syllabus')).toBeInTheDocument();
    expect(screen.getByText('1. HTML Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('4 lessons')).toBeInTheDocument();
    expect(screen.getByText('2. CSS Styling')).toBeInTheDocument();
    expect(screen.getByText('1 lesson')).toBeInTheDocument();
  });

  it('shows Start course when nothing is completed and Resume course otherwise', () => {
    const { rerender } = render(<CourseDetailPanel course={{ ...course, completedModules: 0 }} onClose={vi.fn()} onResume={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Start course/ })).toBeInTheDocument();

    rerender(<CourseDetailPanel course={course} onClose={vi.fn()} onResume={vi.fn()} />);
    expect(screen.getByRole('button', { name: /Resume course/ })).toBeInTheDocument();
  });

  it('calls onResume with the course id', () => {
    const onResume = vi.fn();
    render(<CourseDetailPanel course={course} onClose={vi.fn()} onResume={onResume} />);

    fireEvent.click(screen.getByRole('button', { name: /Resume course/ }));

    expect(onResume).toHaveBeenCalledWith(4);
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(<CourseDetailPanel course={course} onClose={onClose} onResume={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not close when the panel itself is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<CourseDetailPanel course={course} onClose={onClose} onResume={vi.fn()} />);

    const panel = container.querySelector('[style*="slideInRight"]');
    fireEvent.click(panel);

    expect(onClose).not.toHaveBeenCalled();
  });
});