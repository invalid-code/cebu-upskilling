import { useEffect, useState } from 'react';

const WIDE_QUERY = '(min-width: 1024px)';
const MEDIUM_QUERY = '(min-width: 640px)';

function read() {
  if (typeof window === 'undefined') return 'wide';
  if (typeof window.matchMedia === 'function') {
    if (window.matchMedia(WIDE_QUERY).matches) return 'wide';
    if (window.matchMedia(MEDIUM_QUERY).matches) return 'medium';
    // jsdom-style environments report no match for any query; fall back to the real width.
    if (window.innerWidth >= 1024) return 'wide';
    if (window.innerWidth >= 640) return 'medium';
    return 'narrow';
  }
  if (window.innerWidth >= 1024) return 'wide';
  return window.innerWidth >= 640 ? 'medium' : 'narrow';
}

/**
 * Current layout mode: 'wide' (>= 1024px), 'medium' (640-1023px) or 'narrow' (< 640px).
 * Updates live on resize / media-query change.
 */
export default function useViewportMode() {
  const [mode, setMode] = useState(read);

  useEffect(() => {
    const update = () => setMode(read());
    const lists = typeof window.matchMedia === 'function'
      ? [window.matchMedia(WIDE_QUERY), window.matchMedia(MEDIUM_QUERY)]
      : [];
    lists.forEach((l) => l.addEventListener?.('change', update));
    window.addEventListener('resize', update);
    update();
    return () => {
      lists.forEach((l) => l.removeEventListener?.('change', update));
      window.removeEventListener('resize', update);
    };
  }, []);

  return mode;
}
