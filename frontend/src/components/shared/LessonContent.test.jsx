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
    const { container } = render(<LessonContent lesson={null} moduleName="Module" />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the lesson title and module label', () => {
    render(<LessonContent lesson={lesson} moduleName="Web Basics" />);

    expect(screen.queryByText('Web Basics')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'HTML Fundamentals' })).toBeInTheDocument();
  });

  it('falls back to the lesson title when no module name is provided', () => {
    render(<LessonContent lesson={lesson} moduleName={undefined} />);

    expect(screen.getAllByText('HTML Fundamentals')).toHaveLength(1);
  });

  it('renders text, heading and code blocks', () => {
    render(<LessonContent lesson={lesson} moduleName="Web Basics" />);

    expect(screen.getByText('Welcome to HTML.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'What is HTML?' })).toBeInTheDocument();
    expect(screen.getByText('example.js')).toBeInTheDocument();
    expect(screen.getByText('<h1>Hello</h1>')).toBeInTheDocument();
  });

  it('falls back to the description when there are no content blocks', () => {
    render(<LessonContent lesson={{ ...lesson, contentBlocks: [] }} moduleName="Web Basics" />);

    expect(screen.getByText('Falls back when there are no blocks')).toBeInTheDocument();
  });
});