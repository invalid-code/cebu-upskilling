import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastProvider } from '../../context/ToastContext';
import CourseCard from './CourseCard';

const course = {
  name: 'Modern JavaScript',
  provider: 'CodeChum Learning',
  mode: 'Online',
  duration: '18 hours',
  price: 'Free',
  description: 'Learn the essentials',
};

function renderCourse(props) {
  return render(
    <ToastProvider>
      <CourseCard course={course} {...props} />
    </ToastProvider>,
  );
}

describe('CourseCard', () => {
  it('renders course details', () => {
    renderCourse();
    expect(screen.getByText('Modern JavaScript')).toBeInTheDocument();
    expect(screen.getByText('CodeChum Learning · Online')).toBeInTheDocument();
    expect(screen.getByText('18 hours')).toBeInTheDocument();
    expect(screen.getByText('Free')).toBeInTheDocument();
    expect(screen.getByText('Learn the essentials')).toBeInTheDocument();
  });

  it('uses the provided tag label', () => {
    renderCourse({ tagLabel: 'Best next step' });
    expect(screen.getByText('Best next step')).toBeInTheDocument();
  });

  it('shows a toast when Enroll is clicked', () => {
    renderCourse();
    fireEvent.click(screen.getByRole('button', { name: 'Enroll' }));
    expect(screen.getByText('Course added to your pathway')).toBeInTheDocument();
  });
});
