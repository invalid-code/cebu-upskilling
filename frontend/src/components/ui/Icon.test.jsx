import { render } from '@testing-library/react';
import { Bell } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import Icon, { ICON_STROKE_WIDTH } from './Icon';

describe('Icon', () => {
  it('renders lucide icons with the shared 1.75 stroke width', () => {
    const { container } = render(<Icon as={Bell} size={20} aria-hidden="true" />);
    const svg = container.querySelector('svg');
    expect(ICON_STROKE_WIDTH).toBe(1.75);
    expect(svg.getAttribute('stroke-width')).toBe('1.75');
    expect(svg.getAttribute('width')).toBe('20');
  });

  it('renders nothing when no icon component is given', () => {
    const { container } = render(<Icon />);
    expect(container.firstChild).toBeNull();
  });
});
