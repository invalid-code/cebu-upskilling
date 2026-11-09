import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  motion: { reduced: false, saveData: false, canUseWebGL: true, allowAmbient: true },
  renderers: [],
  createCalls: 0,
  createImpl: null,
}));

vi.mock('../../hooks/useMotionPreference', () => ({
  useMotionPreference: () => h.motion,
  default: () => h.motion,
}));

vi.mock('./waterShader.js', () => ({
  createWaterRenderer: (canvas, opts) => {
    h.createCalls += 1;
    if (h.createImpl) return h.createImpl(canvas, opts);
    let running = false;
    const renderer = {
      start: vi.fn(() => { running = true; }),
      stop: vi.fn(() => { running = false; }),
      isRunning: () => running,
      setIntensity: vi.fn(),
      resize: vi.fn(),
      addRipple: vi.fn(),
      destroy: vi.fn(() => { running = false; }),
    };
    h.renderers.push(renderer);
    return renderer;
  },
}));

import WaterCanvas, { resetWaterCanvasRegistry } from './WaterCanvas';

let observers;
let rafQueue;

class FakeIntersectionObserver {
  constructor(cb) {
    this.cb = cb;
    observers.push(this);
  }
  observe() {}
  disconnect() {}
  trigger(ratio) {
    this.cb([{ isIntersecting: ratio > 0, intersectionRatio: ratio }]);
  }
}

function setVisible(ratio) {
  act(() => observers.forEach((o) => o.trigger(ratio)));
}

function setTabHidden(hidden) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
  act(() => { document.dispatchEvent(new Event('visibilitychange')); });
}

/** Run pending requestAnimationFrame callbacks, i.e. simulate the first paint. */
function paint() {
  act(() => {
    const q = rafQueue.splice(0);
    q.forEach(([, cb]) => cb(performance.now()));
  });
}

async function loadShader(expectedCreates) {
  paint();
  await waitFor(() => expect(h.createCalls).toBe(expectedCreates));
}

const running = () => h.renderers.filter((r) => r.isRunning()).length;

beforeEach(() => {
  observers = [];
  rafQueue = [];
  let id = 0;
  vi.stubGlobal('IntersectionObserver', FakeIntersectionObserver);
  vi.stubGlobal('requestAnimationFrame', (cb) => { id += 1; rafQueue.push([id, cb]); return id; });
  vi.stubGlobal('cancelAnimationFrame', (n) => { rafQueue = rafQueue.filter(([i]) => i !== n); });
  Object.defineProperty(navigator, 'hardwareConcurrency', { configurable: true, value: 8 });
  Object.assign(h.motion, { reduced: false, saveData: false, canUseWebGL: true });
  h.renderers.length = 0;
  h.createCalls = 0;
  h.createImpl = null;
  setTabHidden(false);
});

afterEach(() => {
  cleanup();
  resetWaterCanvasRegistry();
  vi.unstubAllGlobals();
});

describe('WaterCanvas', () => {
  it('is decorative: hidden from assistive tech', () => {
    render(<WaterCanvas />);
    expect(screen.getByTestId('water-canvas')).toHaveAttribute('aria-hidden', 'true');
  });

  it.each([
    ['reduced motion', { reduced: true }],
    ['save-data', { saveData: true }],
    ['no WebGL2', { canUseWebGL: false }],
  ])('renders only the static fallback and never loads the shader when gated by %s', async (_n, patch) => {
    Object.assign(h.motion, patch);
    render(<WaterCanvas />);
    setVisible(1);
    paint();
    await new Promise((r) => setTimeout(r, 10));
    const root = screen.getByTestId('water-canvas');
    expect(root).toHaveAttribute('data-gate', 'static');
    expect(screen.getByTestId('water-canvas-fallback')).toBeInTheDocument();
    expect(root.querySelector('canvas')).toBeNull();
    expect(h.createCalls).toBe(0);
  });

  it('does not request the shader chunk until after first paint', async () => {
    render(<WaterCanvas />);
    setVisible(1);
    await new Promise((r) => setTimeout(r, 10));
    expect(h.createCalls).toBe(0);
    await loadShader(1);
  });

  it('animates when visible and renders no frames (renderer stopped) while out of view or tab hidden', async () => {
    render(<WaterCanvas />);
    await loadShader(1);
    expect(running()).toBe(0);
    expect(screen.getByTestId('water-canvas')).toHaveAttribute('data-gate', 'paused');

    setVisible(1);
    await waitFor(() => expect(running()).toBe(1));
    expect(screen.getByTestId('water-canvas')).toHaveAttribute('data-gate', 'animate');

    setVisible(0);
    await waitFor(() => expect(running()).toBe(0));
    expect(screen.getByTestId('water-canvas')).toHaveAttribute('data-gate', 'paused');

    setVisible(1);
    await waitFor(() => expect(running()).toBe(1));
    setTabHidden(true);
    await waitFor(() => expect(running()).toBe(0));
    setTabHidden(false);
    await waitFor(() => expect(running()).toBe(1));
  });

  it('treats under 1% visibility as paused', async () => {
    render(<WaterCanvas />);
    await loadShader(1);
    setVisible(0.005);
    expect(running()).toBe(0);
  });

  it('falls back to the static SVG when context creation fails, with no visible error', async () => {
    h.createImpl = () => { throw new Error('webgl2 unavailable'); };
    render(<WaterCanvas />);
    setVisible(1);
    await loadShader(1);
    await waitFor(() => expect(screen.getByTestId('water-canvas')).toHaveAttribute('data-gate', 'static'));
    expect(screen.getByTestId('water-canvas-fallback')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByTestId('water-canvas').textContent).toBe('');
  });

  it('falls back to the static SVG on context loss and stops rendering', async () => {
    render(<WaterCanvas />);
    setVisible(1);
    await loadShader(1);
    await waitFor(() => expect(running()).toBe(1));
    const canvas = screen.getByTestId('water-canvas').querySelector('canvas');
    fireEvent(canvas, new Event('webglcontextlost', { cancelable: true }));
    await waitFor(() => expect(screen.getByTestId('water-canvas')).toHaveAttribute('data-gate', 'static'));
    expect(running()).toBe(0);
  });

  it('keeps the SVG fallback in the same box as the canvas (identical dimensions, no layout shift)', async () => {
    render(<WaterCanvas />);
    setVisible(1);
    await loadShader(1);
    const root = screen.getByTestId('water-canvas');
    const svg = screen.getByTestId('water-canvas-fallback');
    const canvas = root.querySelector('canvas');
    expect(svg.parentElement).toBe(root);
    expect(canvas.parentElement).toBe(root);
    expect(svg.getAttribute('class')).toBe(canvas.getAttribute('class'));
  });

  it('allows at most one animating canvas across several instances', async () => {
    render(
      <>
        <WaterCanvas />
        <WaterCanvas />
        <WaterCanvas />
      </>,
    );
    setVisible(1);
    paint();
    await waitFor(() => expect(h.createCalls).toBeGreaterThan(0));
    paint();
    await waitFor(() => expect(running()).toBe(1));
    const gates = screen.getAllByTestId('water-canvas').map((n) => n.getAttribute('data-gate'));
    expect(gates.filter((g) => g === 'animate')).toHaveLength(1);
    expect(running()).toBeLessThanOrEqual(1);
  });

  it('adds a ripple on pointer interaction only when interactive and animating', async () => {
    const { rerender } = render(<WaterCanvas interactive />);
    setVisible(1);
    await loadShader(1);
    await waitFor(() => expect(running()).toBe(1));
    const root = screen.getByTestId('water-canvas');
    root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 100, height: 100 });
    fireEvent.pointerDown(root, { clientX: 50, clientY: 25 });
    expect(h.renderers[0].addRipple).toHaveBeenCalledWith(0.5, 0.75);
    h.renderers[0].addRipple.mockClear();
    rerender(<WaterCanvas />);
    fireEvent.pointerDown(screen.getByTestId('water-canvas'), { clientX: 1, clientY: 1 });
    expect(h.renderers[0].addRipple).not.toHaveBeenCalled();
  });

  it('destroys the renderer on unmount', async () => {
    const { unmount } = render(<WaterCanvas />);
    setVisible(1);
    await loadShader(1);
    unmount();
    expect(h.renderers[0].destroy).toHaveBeenCalled();
    expect(running()).toBe(0);
  });
});
