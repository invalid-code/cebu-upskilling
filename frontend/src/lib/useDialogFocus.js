import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

/**
 * Dialog behaviour for overlays: initial focus into the container, Tab/Shift+Tab
 * focus trapping, Escape to close, and focus restoration to the opener on close.
 *
 * @param {boolean} active  whether the dialog is currently open
 * @param {() => void} onClose  escape/close handler
 * @param {{ current: HTMLElement | null }} containerRef  the dialog element
 */
export default function useDialogFocus(active, onClose, containerRef) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const openerRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    openerRef.current = document.activeElement;
    const container = containerRef.current;
    container?.focus?.();

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;

      const nodes = Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) || []);
      if (nodes.length === 0) {
        event.preventDefault();
        container?.focus?.();
        return;
      }
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const activeEl = document.activeElement;

      const outside = !container.contains(activeEl) || activeEl === container;

      if (event.shiftKey && (activeEl === first || outside)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (activeEl === last || outside)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const opener = openerRef.current;
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus();
      } else {
        // Opener was removed (or never existed): fall back to the document body.
        document.body?.focus?.();
      }
    };
  }, [active, containerRef]);
}
