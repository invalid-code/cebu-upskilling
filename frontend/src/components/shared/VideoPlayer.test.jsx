import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import VideoPlayer from './VideoPlayer';

const videoMedia = [
  { pathFile: 'https://cdn.example/lesson-1.mp4', type: 'video/mp4', mbSize: 25.5 },
];

describe('VideoPlayer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows a placeholder when there is no video media', () => {
    render(<VideoPlayer media={[]} lessonName="HTML" />);

    expect(screen.getByText('No video available for this lesson yet.')).toBeInTheDocument();
  });

  it('renders the lesson info overlay when a video exists', () => {
    render(<VideoPlayer media={videoMedia} lessonName="HTML Fundamentals" currentIndex={1} totalLessons={4} />);

    expect(screen.getByText('Lesson 2 of 4')).toBeInTheDocument();
    expect(screen.getByText('HTML Fundamentals')).toBeInTheDocument();
    expect(screen.getByText('25.5 MB · Watch at your own pace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Play' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip back 10 seconds' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip forward 10 seconds' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mute' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fullscreen' })).toBeInTheDocument();
  });

  it('toggles play state through the video element', () => {
    const play = vi.fn();
    const pause = vi.fn();
    Object.defineProperty(HTMLMediaElement.prototype, 'play', { configurable: true, value: play });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', { configurable: true, value: pause });

    render(<VideoPlayer media={videoMedia} lessonName="HTML Fundamentals" />);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(play).toHaveBeenCalled();
  });
});