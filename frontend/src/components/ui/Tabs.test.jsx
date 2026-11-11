import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Tabs from './Tabs';

const tabs = [
  { key: 'courses', label: 'Courses' },
  { key: 'jobs', label: 'Jobs' },
  { key: 'skills', label: 'Skills' },
];

describe('Tabs', () => {
  it('renders all tab labels with tab roles', () => {
    render(<Tabs tabs={tabs} active="courses" onChange={vi.fn()} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Courses' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Jobs' })).toBeInTheDocument();
  });

  it('calls onChange with the clicked tab key', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="courses" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Jobs' }));
    expect(onChange).toHaveBeenCalledWith('jobs');
  });

  it('marks exactly one tab selected', () => {
    render(<Tabs tabs={tabs} active="jobs" onChange={vi.fn()} />);
    const selected = screen.getAllByRole('tab').filter((t) => t.getAttribute('aria-selected') === 'true');
    expect(selected).toHaveLength(1);
    expect(selected[0]).toHaveTextContent('Jobs');
  });

  it('associates the selected tab with its tabpanel', () => {
    render(<Tabs tabs={tabs} active="jobs" onChange={vi.fn()}><p>Jobs content</p></Tabs>);
    const tab = screen.getByRole('tab', { name: 'Jobs' });
    const panel = screen.getByRole('tabpanel');
    expect(tab.getAttribute('aria-controls')).toBe(panel.id);
    expect(panel.getAttribute('aria-labelledby')).toBe(tab.id);
    expect(panel).toHaveTextContent('Jobs content');
  });

  it('moves with Left/Right arrows and wraps', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="courses" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Courses' }), { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('skills');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Skills' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('courses');
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Courses' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('jobs');
  });
});

describe('Tabs keyboard and ARIA gaps', () => {
  it('jumps with Home/End and focuses the target tab', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="jobs" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Jobs' }), { key: 'End' });
    expect(onChange).toHaveBeenLastCalledWith('skills');
    expect(screen.getByRole('tab', { name: 'Skills' })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Jobs' }), { key: 'Home' });
    expect(onChange).toHaveBeenLastCalledWith('courses');
  });

  it('ignores unrelated keys', () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="jobs" onChange={onChange} />);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'Jobs' }), { key: 'a' });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('uses a roving tabindex and labels the tablist', () => {
    render(<Tabs tabs={tabs} active="jobs" onChange={vi.fn()} label="Sections" />);
    expect(screen.getByRole('tablist', { name: 'Sections' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Jobs' })).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('tab', { name: 'Courses' })).toHaveAttribute('tabindex', '-1');
  });

  it('renders one tabpanel per tab with only the active one visible and filled', () => {
    const { container } = render(<Tabs tabs={tabs} active="skills" onChange={vi.fn()}><p>body</p></Tabs>);
    expect(container.querySelectorAll('[role="tabpanel"]')).toHaveLength(3);
    expect(screen.getAllByRole('tabpanel')).toHaveLength(1);
    expect(screen.getByRole('tabpanel')).toHaveTextContent('body');
  });

  it('falls back to the first tab when active is unknown', () => {
    render(<Tabs tabs={tabs} active="nope" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'Courses' })).toHaveAttribute('aria-selected', 'true');
  });
});
