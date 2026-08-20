import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LessonResources from './LessonResources';

describe('LessonResources', () => {
  it('renders default lesson resources', () => {
    render(<LessonResources media={[]} />);

    expect(screen.getByText('Lesson resources')).toBeInTheDocument();
    expect(screen.getByText('Lesson transcript')).toBeInTheDocument();
    expect(screen.getByText('PDF · 4 pages')).toBeInTheDocument();
    expect(screen.getByText('Practice files')).toBeInTheDocument();
    expect(screen.getByText('ZIP · 3 files')).toBeInTheDocument();
  });

  it('renders media files with name, type and size', () => {
    const media = [
      { pathFile: 'https://cdn.example/lesson-1.pdf', type: 'PDF', mbSize: 2.4 },
      { pathFile: 'https://cdn.example/starter.zip', type: 'ZIP', mbSize: 1.2 },
    ];

    render(<LessonResources media={media} />);

    expect(screen.getByText('lesson-1.pdf')).toBeInTheDocument();
    expect(screen.getByText('PDF · 2.4 MB')).toBeInTheDocument();
    expect(screen.getByText('starter.zip')).toBeInTheDocument();
    expect(screen.getByText('ZIP · 1.2 MB')).toBeInTheDocument();
  });

  it('renders the notes and help sections', () => {
    render(<LessonResources media={[]} />);

    expect(screen.getByText('My notes')).toBeInTheDocument();
    expect(screen.getByText('Save note')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add a note about this lesson...')).toBeInTheDocument();
    expect(screen.getByText('Need help?')).toBeInTheDocument();
    expect(screen.getByText(/Ask the learning community about this lesson/)).toBeInTheDocument();
    expect(screen.getByText('Join discussion →')).toBeInTheDocument();
  });
});