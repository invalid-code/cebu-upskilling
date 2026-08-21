import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DiscussionModal from './DiscussionModal';

vi.mock('../../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

vi.mock('../../context/ToastContext', () => ({
  useToast: () => ({ showToast: vi.fn() }),
}));

import { api } from '../../api/client';

describe('DiscussionModal', () => {
  beforeEach(() => {
    api.get.mockReset();
    api.post.mockReset();
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    render(<DiscussionModal open={false} onClose={vi.fn()} lessonId={1} />);

    expect(screen.queryByText('Lesson discussion')).not.toBeInTheDocument();
  });

  it('loads and displays posts when opened', async () => {
    api.get.mockResolvedValue({
      lessonId: 1,
      posts: [
        { postId: 1, authorName: 'Jose Rizal', content: 'Great question!', createdAt: '2026-08-01T00:00:00Z', isOwn: false },
        { postId: 2, authorName: 'Maria Clara', content: 'I found this helpful.', createdAt: '2026-08-01T01:00:00Z', isOwn: true },
      ],
    });

    render(<DiscussionModal open onClose={vi.fn()} lessonId={1} />);

    expect(await screen.findByText('Great question!')).toBeInTheDocument();
    expect(screen.getByText('I found this helpful.')).toBeInTheDocument();
    expect(screen.getByText('Jose Rizal')).toBeInTheDocument();
    expect(screen.getByText('Maria Clara')).toBeInTheDocument();
    expect(api.get).toHaveBeenCalledWith('/discussions/lessons/1', { signal: expect.anything() });
  });

  it('shows an empty state when there are no posts', async () => {
    api.get.mockResolvedValue({ lessonId: 1, posts: [] });

    render(<DiscussionModal open onClose={vi.fn()} lessonId={1} />);

    expect(await screen.findByText(/No discussion yet/)).toBeInTheDocument();
  });

  it('posts a new message and appends it to the list', async () => {
    api.get.mockResolvedValue({ lessonId: 1, posts: [] });
    api.post.mockResolvedValue({
      postId: 3,
      authorName: 'Jose Rizal',
      content: 'Does anyone have tips?',
      createdAt: '2026-08-02T00:00:00Z',
      isOwn: true,
    });

    render(<DiscussionModal open onClose={vi.fn()} lessonId={1} />);

    await screen.findByText(/No discussion yet/);

    fireEvent.change(screen.getByPlaceholderText('Ask a question or share what you learned...'), {
      target: { value: 'Does anyone have tips?' },
    });
    fireEvent.click(screen.getByText('Post'));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/discussions/lessons/1/posts', { content: 'Does anyone have tips?' });
    });
    expect(await screen.findByText('Does anyone have tips?')).toBeInTheDocument();
  });

  it('surfaces an error when the discussion fails to load', async () => {
    api.get.mockRejectedValue(new Error('Network error'));

    render(<DiscussionModal open onClose={vi.fn()} lessonId={1} />);

    expect(await screen.findByText('Network error')).toBeInTheDocument();
  });
});