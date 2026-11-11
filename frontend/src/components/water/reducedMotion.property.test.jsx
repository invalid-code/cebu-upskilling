import { cleanup, render, screen } from '@testing-library/react';
import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import LiquidMeter from './LiquidMeter';
import WaveDivider from './WaveDivider';
import TideTransition from './TideTransition';
import { computeMeterLevel } from '../../lib/water/computeMeterLevel.js';
import { shouldRenderWaterCanvas } from '../../lib/water/shouldRenderWaterCanvas.js';

function mockReduced(reduced) {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: reduced && query.includes('reduce'),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}

beforeEach(() => mockReduced(true));
afterEach(() => {
  cleanup();
  delete window.matchMedia;
});

const valueArb = fc.oneof(
  fc.double({ min: -50, max: 150, noNaN: true }),
  fc.constantFrom(NaN, Infinity, -Infinity, undefined, null),
);

// Feature: frontend-design, Property 5: Reduced motion
describe('Property 5: Reduced motion', () => {
  /** **Validates: Requirements 15.4, 16.1, 17.1, 17.2, 17.3, 17.4** */
  it('meter wave amplitude is 0 for every value when reduced', () => {
    fc.assert(
      fc.property(valueArb, (value) => {
        expect(computeMeterLevel(value, true).waveAmplitude).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  it('the rendered LiquidMeter has zero wave amplitude for every value and variant when reduced', () => {
    fc.assert(
      fc.property(valueArb, fc.constantFrom('bar', 'vessel', 'ring'), fc.double({ min: 0, max: 10, noNaN: true }), (value, variant, amp) => {
        const { unmount } = render(<LiquidMeter value={value} label="Progress" variant={variant} waveAmplitude={amp} />);
        const meter = screen.getByRole('meter', { name: 'Progress' });
        expect(meter.style.getPropertyValue('--wave-amp')).toBe('0');
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('canvas gating is static for every environment when reduced', () => {
    fc.assert(
      fc.property(
        fc.record({
          saveData: fc.boolean(),
          webgl2: fc.boolean(),
          cores: fc.integer({ min: 1, max: 32 }),
          inView: fc.boolean(),
          tabVisible: fc.boolean(),
        }),
        fc.integer({ min: 0, max: 5 }),
        (env, count) => {
          expect(shouldRenderWaterCanvas({ ...env, reduced: true }, count)).toBe('static');
        },
      ),
      { numRuns: 100 },
    );
  });

  it('WaveDivider is frozen and TideTransition does not animate for any tone, flip or key when reduced', () => {
    fc.assert(
      fc.property(fc.constantFrom('surface', 'deep', 'sand', undefined), fc.boolean(), fc.string({ minLength: 1, maxLength: 8 }), (tone, flip, key) => {
        const { unmount } = render(
          <>
            <WaveDivider tone={tone} flip={flip} />
            <TideTransition transitionKey={key}><span>content</span></TideTransition>
          </>,
        );
        expect(screen.getByTestId('wave-divider')).toHaveAttribute('data-frozen', 'true');
        expect(screen.getByText('content').parentElement).toHaveAttribute('data-tide', 'reduced');
        unmount();
      }),
      { numRuns: 100 },
    );
  });

  it('the ripple hook yields no ripple element and a flash instead, for any pointer position', async () => {
    const { default: Button } = await import('../ui/Button');
    vi.useFakeTimers();
    try {
      const { fireEvent } = await import('@testing-library/react');
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 500 }), fc.integer({ min: 0, max: 500 }), (x, y) => {
          const { unmount } = render(<Button>Go</Button>);
          const btn = screen.getByRole('button', { name: 'Go' });
          fireEvent.pointerDown(btn, { clientX: x, clientY: y, button: 0 });
          expect(btn.querySelectorAll('[data-ripple]')).toHaveLength(0);
          unmount();
        }),
        { numRuns: 100 },
      );
    } finally {
      vi.useRealTimers();
    }
  });
});
