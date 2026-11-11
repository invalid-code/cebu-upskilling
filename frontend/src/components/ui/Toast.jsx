import { useCallback, useEffect, useRef } from 'react';
import { useToastStore } from '../../stores/toastStore';
import styles from './Toast.module.css';

/**
 * Single toast with an auto-dismiss timer that pauses while the pointer or keyboard focus is
 * inside it and resumes with the remaining time.
 */
function ToastItem({ toast, onDismiss }) {
  const { message, variant, duration } = toast;
  const remaining = useRef(duration);
  const startedAt = useRef(null);
  const timer = useRef(null);
  const pointerInside = useRef(false);
  const focusInside = useRef(false);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const start = useCallback(() => {
    clear();
    startedAt.current = Date.now();
    timer.current = setTimeout(onDismiss, remaining.current);
  }, [clear, onDismiss]);

  const pause = useCallback(() => {
    if (timer.current == null) return;
    clear();
    remaining.current = Math.max(0, remaining.current - (Date.now() - startedAt.current));
  }, [clear]);

  const maybeResume = () => {
    if (!pointerInside.current && !focusInside.current && timer.current == null) start();
  };

  useEffect(() => {
    start();
    return clear;
  }, [start, clear]);

  return (
    <div
      className={`${styles.toast} ${styles[variant] || styles.info}`}
      data-variant={variant}
      onPointerEnter={() => {
        pointerInside.current = true;
        pause();
      }}
      onPointerLeave={() => {
        pointerInside.current = false;
        maybeResume();
      }}
      onFocus={() => {
        focusInside.current = true;
        pause();
      }}
      onBlur={(e) => {
        if (e.currentTarget.contains(e.relatedTarget)) return;
        focusInside.current = false;
        maybeResume();
      }}
    >
      <span className={styles.message}>{message}</span>
      <button type="button" className={styles.dismiss} aria-label="Dismiss notification" onClick={onDismiss}>
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

/** Polite live region that always stays mounted so announcements are reliable. */
export default function ToastViewport() {
  const toast = useToastStore((s) => s.toast);
  const clearToast = useToastStore((s) => s.clearToast);

  return (
    <div className={`toast ${styles.viewport}`} role="status" aria-live="polite">
      {toast && <ToastItem key={toast.id} toast={toast} onDismiss={clearToast} />}
    </div>
  );
}
