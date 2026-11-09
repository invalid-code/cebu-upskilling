/* eslint-disable react/only-export-components */
import { createContext, useContext, useEffect } from 'react';
import { useToastStore } from '../stores/toastStore';
import ToastViewport from '../components/ui/Toast';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const { toast, showToast } = useToastStore();

  useEffect(() => () => useToastStore.getState().clearToast(), []);

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  const store = useToastStore();
  if (ctx) return ctx;
  return store;
}
