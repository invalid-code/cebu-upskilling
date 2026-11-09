import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Stepper, { stepStatus } from './Stepper';

const steps = ['Account', { id: 'p', label: 'Profile' }, 'Review'];

describe('Stepper', () => {
  it('maps indexes to completed / current / not-started', () => {
    expect(stepStatus(0, 1)).toBe('completed');
    expect(stepStatus(1, 1)).toBe('current');
    expect(stepStatus(2, 1)).toBe('not-started');
  });

  it('shows the step number, total and a text status for each step', () => {
    render(<Stepper steps={steps} current={1} />);
    expect(screen.getByText('Step 2 of 3')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 3: Completed')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of 3: Current')).toBeInTheDocument();
    expect(screen.getByText('Step 3 of 3: Not started')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('marks only the current step with aria-current and renders non-interactive without onSelect', () => {
    const { container } = render(<Stepper steps={steps} current={0} />);
    expect(container.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('clamps an out-of-range current index', () => {
    render(<Stepper steps={steps} current={99} />);
    expect(screen.getByText('Step 3 of 3')).toBeInTheDocument();
  });

  it('handles an empty steps list', () => {
    render(<Stepper steps={[]} current={0} />);
    expect(screen.getByText('Step 0 of 0')).toBeInTheDocument();
  });

  it('calls onSelect with the index on click and via keyboard', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<Stepper steps={steps} current={0} onSelect={onSelect} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    await user.click(buttons[2]);
    expect(onSelect).toHaveBeenLastCalledWith(2);
    buttons[1].focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenLastCalledWith(1);
    await user.keyboard(' ');
    expect(onSelect).toHaveBeenCalledTimes(3);
  });
});
