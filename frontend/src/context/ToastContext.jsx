/* eslint-disable react/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2300);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
      <div
        className="toast"
        style={{
          position: 'fixed',
          right: 22,
          bottom: 22,
          background: 'var(--teal)',
          color: 'var(--surface)',
          padding: '13px 16px',
          borderRadius: 11,
          boxShadow: 'var(--shadow)',
          fontSize: 13,
          transform: toast ? 'none' : 'translateY(120px)',
          opacity: toast ? 1 : 0,
          transition: '0.3s var(--ease)',
          zIndex: 20,
        }}
      >
        {toast}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
