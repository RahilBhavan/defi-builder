import { type ReactNode, createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  description?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (toast: {
    type: ToastType;
    title?: string;
    message: string;
    description?: string;
    duration?: number;
  }) => void;
  dismissToast: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const dismissToast = useCallback((id: string) => {
    // Clear timeout if it exists
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  // Cleanup all timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });
      timeoutRefs.current.clear();
    };
  }, []);

  const showToast = useCallback(
    (toast: {
      type: ToastType;
      title?: string;
      message: string;
      description?: string;
      duration?: number;
    }) => {
      const id = `toast-${Date.now()}-${Math.random()}`;
      const defaultDuration = toast.type === 'error' ? 5000 : 3000;
      const newToast: Toast = {
        id,
        type: toast.type,
        title: toast.title,
        message: toast.message,
        description: toast.description,
        duration: toast.duration ?? defaultDuration,
      };

      setToasts((prev) => [...prev, newToast]);

      // Auto-dismiss
      const duration = newToast.duration ?? defaultDuration;
      if (duration > 0) {
        const timeoutId = setTimeout(() => {
          dismissToast(id);
        }, duration);
        
        // Store timeout ID for cleanup
        timeoutRefs.current.set(id, timeoutId);
      }
    },
    [dismissToast]
  );

  const success = useCallback(
    (message: string, duration?: number) => showToast({ type: 'success', message, duration }),
    [showToast]
  );

  const error = useCallback(
    (message: string, duration?: number) => showToast({ type: 'error', message, duration }),
    [showToast]
  );

  const warning = useCallback(
    (message: string, duration?: number) => showToast({ type: 'warning', message, duration }),
    [showToast]
  );

  const info = useCallback(
    (message: string, duration?: number) => showToast({ type: 'info', message, duration }),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        dismissToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
