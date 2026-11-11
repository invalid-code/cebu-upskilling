import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { useMotionPreference } from '../../hooks/useMotionPreference';
import { shouldRenderWaterCanvas } from '../../lib/water/shouldRenderWaterCanvas';
import styles from './WaterCanvas.module.css';

const MAX_DPR = 1.5;
// The surface is a soft, low-frequency gradient, so it is rendered at a fraction of CSS resolution and
// upscaled by the compositor. This bounds fragment work (the main cost on software/integrated GPUs, which
// otherwise delays input handling) without a visible design change.
const RENDER_SCALE = 0.5;
const MAX_PIXELS = 400 * 300;

// ---------------------------------------------------------------------------
// Module-level registry: guarantees at most one canvas is in the 'animate' state.
// ---------------------------------------------------------------------------
const animating = new Set();
const listeners = new Set();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

const registry = {
  subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getVersion: () => version,
  /** Claim the single animation slot. Returns false when another canvas holds it. */
  claim(id) {
    if (animating.has(id)) return true;
    if (animating.size >= 1) return false;
    animating.add(id);
    emit();
    return true;
  },
  release(id) {
    if (animating.delete(id)) emit();
  },
  has: (id) => animating.has(id),
  othersCount: (id) => animating.size - (animating.has(id) ? 1 : 0),
};

/** Test helper: clear the registry. */
export function resetWaterCanvasRegistry() {
  animating.clear();
  emit();
}

function readTabVisible() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

function readCores() {
  const cores = typeof navigator === 'undefined' ? undefined : navigator.hardwareConcurrency;
  return typeof cores === 'number' && cores > 0 ? cores : 4;
}

/** Static SVG water surface. Fills its box, so swapping with the canvas never shifts layout. */
function StaticWater({ intensity }) {
  const amp = 6 + intensity * 10;
  return (
    <svg
      className={styles.fill}
      viewBox="0 0 400 200"
      preserveAspectRatio="none"
      focusable="false"
      aria-hidden="true"
      data-testid="water-canvas-fallback"
    >
      <rect width="400" height="200" fill="#0f7686" />
      <path
        d={`M0 70 C80 ${70 - amp} 160 ${70 + amp} 240 70 S360 ${70 - amp} 400 70 L400 200 L0 200 Z`}
        fill="#9ee4e0"
        opacity="0.28"
      />
      <path
        d={`M0 110 C100 ${110 + amp} 180 ${110 - amp} 260 110 S360 ${110 + amp} 400 110 L400 200 L0 200 Z`}
        fill="#043b49"
        opacity="0.45"
      />
    </svg>
  );
}

/**
 * Ambient WebGL water surface.
 * - Shader code lives in `waterShader.js`, loaded with a dynamic import after first paint.
 * - Falls back to a static SVG of identical size on gate 'static', context creation failure or context loss.
 * - Renders zero frames while paused (out of view or tab hidden).
 *
 * @param {{ intensity?: number, interactive?: boolean, className?: string, style?: object }} props
 */
export default function WaterCanvas({ intensity = 0.5, interactive = false, className = '', style }) {
  const id = useId();
  const { reduced, saveData, canUseWebGL } = useMotionPreference();
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const rendererRef = useRef(null);

  const level = Math.min(1, Math.max(0, Number.isFinite(intensity) ? intensity : 0));
  const levelRef = useRef(level);
  levelRef.current = level;

  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(readTabVisible);
  const [failed, setFailed] = useState(false);
  const [shaderModule, setShaderModule] = useState(null);
  const [drawn, setDrawn] = useState(false);
  const [, setTick] = useState(0);

  useSyncExternalStore(registry.subscribe, registry.getVersion, registry.getVersion);

  const gate = failed
    ? 'static'
    : shouldRenderWaterCanvas(
        { reduced, saveData, webgl2: canUseWebGL, cores: readCores(), inView, tabVisible },
        registry.othersCount(id),
      );

  // Visibility: IntersectionObserver (>= 1% visible) and the Page Visibility API.
  useEffect(() => {
    const node = rootRef.current;
    let observer;
    if (node && typeof IntersectionObserver === 'function') {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[entries.length - 1];
          if (entry) setInView(entry.isIntersecting && entry.intersectionRatio >= 0.01);
        },
        { threshold: [0, 0.01, 0.5, 1] },
      );
      observer.observe(node);
    } else {
      setInView(true);
    }
    const onVisibility = () => setTabVisible(readTabVisible());
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      observer?.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Claim / release the single animation slot.
  useEffect(() => {
    if (gate === 'animate') {
      if (!registry.claim(id)) setTick((n) => n + 1); // lost the race; re-evaluate as 'static'
    } else {
      registry.release(id);
    }
  }, [gate, id]);
  useEffect(() => () => registry.release(id), [id]);

  const active = gate === 'animate' && registry.has(id);
  const showCanvas = gate !== 'static';

  // Request the shader chunk only after first paint, and only when it can be used.
  useEffect(() => {
    if (!showCanvas || shaderModule) return undefined;
    let cancelled = false;
    let timer;
    const raf = requestAnimationFrame(() => {
      timer = setTimeout(() => {
        import('./waterShader.js')
          .then((mod) => {
            if (!cancelled) setShaderModule(mod);
          })
          .catch(() => {
            if (!cancelled) setFailed(true);
          });
      }, 0);
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(timer);
    };
  }, [showCanvas, shaderModule]);

  // Create the renderer once the chunk and canvas are available.
  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!shaderModule || !showCanvas || !canvas || !root) return undefined;

    let renderer;
    try {
      renderer = shaderModule.createWaterRenderer(canvas, { intensity: levelRef.current });
    } catch {
      setFailed(true);
      return undefined;
    }
    rendererRef.current = renderer;

    const resize = () => {
      const rect = root.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      let scale = dpr * RENDER_SCALE;
      const area = rect.width * rect.height * scale * scale;
      if (area > MAX_PIXELS) scale *= Math.sqrt(MAX_PIXELS / area);
      renderer.resize(rect.width * scale, rect.height * scale);
    };
    resize();
    let resizeObserver;
    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(root);
    }

    const onLost = (event) => {
      event.preventDefault();
      renderer.stop();
      setFailed(true);
    };
    canvas.addEventListener('webglcontextlost', onLost);

    return () => {
      canvas.removeEventListener('webglcontextlost', onLost);
      resizeObserver?.disconnect();
      renderer.destroy();
      if (rendererRef.current === renderer) rendererRef.current = null;
    };
  }, [shaderModule, showCanvas]);

  // Frame loop runs only while animating; stopping cancels rAF so paused canvases render zero frames.
  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer || failed) return undefined;
    if (active) {
      renderer.start();
      setDrawn(true); // canvas has content from the first frame on; reveal it over the SVG
    } else {
      renderer.stop();
    }
    return () => renderer.stop();
  }, [active, shaderModule, showCanvas, failed]);

  useEffect(() => {
    rendererRef.current?.setIntensity(level);
  }, [level]);

  const onPointer = useCallback(
    (event) => {
      const renderer = rendererRef.current;
      const root = rootRef.current;
      if (!interactive || !renderer || !root || !renderer.isRunning()) return;
      const rect = root.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = (event.clientX - rect.left) / rect.width;
      const y = 1 - (event.clientY - rect.top) / rect.height;
      renderer.addRipple(Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y)));
    },
    [interactive],
  );

  const rootClass = [styles.root, interactive ? styles.interactive : '', className].filter(Boolean).join(' ');

  return (
    <div
      ref={rootRef}
      className={rootClass}
      style={style}
      aria-hidden="true"
      data-testid="water-canvas"
      data-gate={gate}
      onPointerDown={interactive ? onPointer : undefined}
      onPointerMove={interactive ? onPointer : undefined}
    >
      <StaticWater intensity={level} />
      {showCanvas && !failed && <canvas ref={canvasRef} className={styles.fill} style={{ opacity: drawn ? 1 : 0 }} />}
    </div>
  );
}
