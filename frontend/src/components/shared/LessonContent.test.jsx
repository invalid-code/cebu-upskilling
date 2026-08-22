import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LessonContent from './LessonContent';

const lesson = {
  name: 'HTML Fundamentals',
  lessonOrder: 1,
  description: 'Falls back when there are no blocks',
  contentBlocks: [
    { blockType: 'text', content: 'Welcome to HTML.' },
    { blockType: 'heading', content: 'What is HTML?' },
    { blockType: 'code', content: '<h1>Hello</h1>' },
  ],
};

describe('LessonContent', () => {
  it('renders nothing when no lesson is provided', () => {
    const { container } = render(<LessonContent lesson={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the lesson title and module dot lesson label', () => {
    render(<LessonContent lesson={lesson} moduleNumber={1} lessonNumber={2} />);

    expect(screen.getByText('Module 1 · Lesson 2')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'HTML Fundamentals' })).toBeInTheDocument();
  });

  it('does not render the small label when module or lesson number is missing', () => {
    render(<LessonContent lesson={lesson} />);

    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
    expect(screen.getAllByText('HTML Fundamentals')).toHaveLength(1);
  });

  it('renders text, heading and code blocks', () => {
    render(<LessonContent lesson={lesson} />);

    expect(screen.getByText('Welcome to HTML.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What is HTML?' })).toBeInTheDocument();
    expect(screen.getByText('example.js')).toBeInTheDocument();
    expect(screen.getByText('<h1>Hello</h1>')).toBeInTheDocument();
  });

  it('falls back to the description when there are no content blocks', () => {
    render(<LessonContent lesson={{ ...lesson, contentBlocks: [] }} />);

    expect(screen.getByText('Falls back when there are no blocks')).toBeInTheDocument();
  });
});