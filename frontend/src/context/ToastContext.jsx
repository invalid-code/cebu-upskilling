/* eslint-disable react/only-export-components */
import { createContext, useContext, useEffect } from 'react';
import { useToastStore } from '../stores/toastStore';

const ToastContext = createContext(null);

const variantStyles = {
  success: { background: 'var(--good)' },
  error: { background: 'var(--danger)' },
  info: { background: 'var(--teal)' },
};

export function ToastProvider({ children }) {
  const { toast, showToast } = useToastStore();

  useEffect(() => () => useToastStore.getState().clearToast(), []);

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
      <div
        className="toast"
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          right: 22,
          bottom: 22,
          ...(variantStyles[toast?.variant] || variantStyles.info),
          color: '#fff',
          padding: '13px 16px',
          borderRadius: 11,
          boxShadow: 'var(--shadow)',
          fontSize: 13,
          fontWeight: 600,
          transform: toast ? 'none' : 'translateY(120px)',
          opacity: toast ? 1 : 0,
          transition: '0.3s var(--ease)',
          zIndex: 20,
          pointerEvents: 'none',
        }}
      >
        {toast?.message}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  const store = useToastStore();
  if (ctx) return ctx;
  return store;
}
