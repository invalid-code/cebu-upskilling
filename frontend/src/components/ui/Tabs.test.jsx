import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Tabs from './Tabs';

const tabs = [
  { key: 'courses', label: 'Courses' },
  { key: 'jobs', label: 'Jobs' },
];

describe('Tabs', () => {
  it('renders all tab labels', () => {
    render(<Tabs tabs={tabs} active="courses" onChange={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Courses' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Jobs' })).toBeInTheDocument();
  });

  it('calls onChange with the clicked tab key', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="courses" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Jobs' }));
    expect(onChange).toHaveBeenCalledWith('jobs');
  });
});
