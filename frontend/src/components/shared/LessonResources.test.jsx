import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LessonResources from './LessonResources';

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import { api } from '../../api/client';

describe('LessonResources', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    api.put.mockReset();
    api.get.mockImplementation((path) => {
      if (path.startsWith('/notes/lessons/')) return Promise.resolve({ content: null });
      if (path.startsWith('/notes/courses/')) return Promise.resolve({ notes: [] });
      if (path.startsWith('/discussions/')) return Promise.resolve({ lessonId: 1, posts: [] });
      return Promise.resolve({});
    });
  });

  it('does not render lesson resources when there is no backend media', () => {
    render(<LessonResources media={[]} />);

    expect(screen.queryByText('Lesson resources')).not.toBeInTheDocument();
    expect(screen.queryByText('Lesson transcript')).not.toBeInTheDocument();
    expect(screen.queryByText('Practice files')).not.toBeInTheDocument();
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

  it('labels real MIME types (application/pdf) as PDF', () => {
    const media = [
      { pathFile: 'https://cdn.example/handout.pdf', type: 'application/pdf', mbSize: 1.0 },
      { pathFile: 'https://cdn.example/intro.mp4', type: 'video/mp4', mbSize: 12.5 },
    ];

    render(<LessonResources media={media} />);

    expect(screen.getByText('handout.pdf')).toBeInTheDocument();
    expect(screen.getByText('PDF · 1.0 MB')).toBeInTheDocument();
    expect(screen.getByText('intro.mp4')).toBeInTheDocument();
    expect(screen.getByText('VIDEO · 12.5 MB')).toBeInTheDocument();
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

  it('opens the discussion modal when Join discussion is clicked', async () => {
    render(<LessonResources media={[]} lessonId={1} courseId={2} />);

    fireEvent.click(screen.getByText('Join discussion →'));

    expect(await screen.findByText('Lesson discussion')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/discussions/lessons/1', { signal: expect.anything() });
  });
});