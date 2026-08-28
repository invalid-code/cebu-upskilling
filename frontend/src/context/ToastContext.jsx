/* eslint-disable react/only-export-components */
import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const VARIANT = {
  success: {
    bg: 'var(--teal)',
    color: 'var(--surface)',
    Icon: CheckCircle2,
  },
  error: {
    bg: 'var(--danger)',
    color: 'var(--surface)',
    Icon: AlertCircle,
  },
  info: {
    bg: 'var(--ink)',
    color: 'var(--surface)',
    Icon: Info,
  },
};

function resolveVariant(input) {
  if (!input) return 'success';
  if (typeof input === 'string') {
    const v = input.toLowerCase();
    if (v === 'error' || v === 'danger') return 'error';
    if (v === 'info') return 'info';
    return 'success';
  }
  if (typeof input === 'object' && input.variant) return resolveVariant(input.variant);
  return 'success';
}

export function ToastProvider({ children }) {
  const [toastData, setToastData] = useState(null);
  const timeoutRef = useRef(null);

  const showToast = useCallback((message, variantOrOptions) => {
    const variant = resolveVariant(variantOrOptions);
    const text = message == null ? '' : String(message);
    if (!text) return;
    setToastData({ message: text, variant });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const duration = variant === 'error' ? 3800 : variant === 'info' ? 3000 : 2300;
    timeoutRef.current = setTimeout(() => setToastData(null), duration);
  }, []);

  const dismiss = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToastData(null);
  }, []);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  const toast = toastData?.message ?? null;
  const variant = toastData?.variant ?? 'success';
  const config = VARIANT[variant] ?? VARIANT.success;
  const Icon = config.Icon;

  return (
    <ToastContext.Provider value={{ toast, toastData, showToast, dismiss, variant }}>
      {children}
      <div
        className="toast"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        onClick={dismiss}
        style={{
          position: 'fixed',
          right: 22,
          bottom: 22,
          background: config.bg,
          color: config.color,
          padding: '12px 14px 12px 13px',
          borderRadius: 12,
          boxShadow: 'var(--shadow)',
          fontSize: 13,
          fontWeight: 600,
          lineHeight: 1.4,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          maxWidth: 'min(420px, calc(100vw - 32px))',
          transform: toast ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
          opacity: toast ? 1 : 0,
          pointerEvents: toast ? 'auto' : 'none',
          transition: 'transform 0.32s var(--ease), opacity 0.32s var(--ease)',
          zIndex: 30,
          cursor: toast ? 'pointer' : 'default',
          border: '1px solid rgba(255,255,255,0.14)',
        }}
      >
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.14)',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
          }}
          aria-hidden="true"
        >
          <Icon size={16} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>{toast}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); dismiss(); }}
          aria-label="Dismiss notification"
          style={{
            width: 26,
            height: 26,
            borderRadius: 7,
            background: 'rgba(255,255,255,0.12)',
            color: 'inherit',
            display: 'grid',
            placeItems: 'center',
            flexShrink: 0,
            border: 0,
            cursor: 'pointer',
          }}
        >
          <X size={13} />
        </button>
      </div>
    </ToastContext.Provider>
  );
}

const noop = () => {};
const fallbackToast = { toast: null, toastData: null, variant: 'success', showToast: noop, dismiss: noop };

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Gracefully degrade when rendered outside a provider (e.g. isolated unit tests
    // that pre-date toast usage on a page). No-op showToast keeps tests green
    // while still surfacing a warning in dev.
    if (import.meta.env.DEV) console.warn('useToast called outside ToastProvider — toast will be a no-op');
    return fallbackToast;
  }
  return ctx;
}
