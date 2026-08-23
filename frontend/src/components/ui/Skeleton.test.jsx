import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Skeleton, { SkeletonText, SkeletonCard, SkeletonStat, SkeletonStatus } from './Skeleton';

describe('Skeleton', () => {
  it('renders a single shimmer block with the skeleton class', () => {
    const { container } = render(<Skeleton height={20} width={120} />);
    const block = container.querySelector('.skeleton');
    expect(block).toBeInTheDocument();
    expect(block.style.height).toBe('20px');
    expect(block.style.width).toBe('120px');
  });

  it('renders the given number of text lines', () => {
    const { container } = render(<SkeletonText lines={4} />);
    expect(container.querySelectorAll('.skeleton')).toHaveLength(4);
  });

  it('shortens the last text line by default', () => {
    const { container } = render(<SkeletonText lines={3} />);
    const blocks = container.querySelectorAll('.skeleton');
    expect(blocks[blocks.length - 1].style.width).toBe('60%');
    expect(blocks[0].style.width).toBe('100%');
  });

  it('renders card-shaped placeholders', () => {
    const { container } = render(<SkeletonCard minHeight={180} />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('renders stat placeholders', () => {
    const { container } = render(<SkeletonStat />);
    expect(container.querySelectorAll('.skeleton')).toHaveLength(2);
  });

  it('exposes an accessible status region with the loading label', () => {
    render(
      <SkeletonStatus label="Loading jobs...">
        <SkeletonCard />
      </SkeletonStatus>,
    );
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByText('Loading jobs...')).toBeInTheDocument();
  });
});
