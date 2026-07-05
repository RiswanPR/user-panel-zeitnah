import { useState, useCallback, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertTriangle, Info, X, XCircle } from 'lucide-react';

const ToastContext = createContext(null);

const icons = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const toastStyles = {
  success: 'border-success/20 bg-success/8',
  error: 'border-danger/20 bg-danger/8',
  warning: 'border-warning/20 bg-warning/8',
  info: 'border-info/20 bg-info/8',
};

const iconColors = {
  success: 'text-success',
  error: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
};

let toastId = 0;

/**
 * Toast notification system replacing alert() calls.
 * Wrap your app with <ToastProvider> and use useToast() to trigger toasts.
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback({
    success: (title, message) => addToast({ type: 'success', title, message }),
    error: (title, message) => addToast({ type: 'error', title, message }),
    warning: (title, message) => addToast({ type: 'warning', title, message }),
    info: (title, message) => addToast({ type: 'info', title, message }),
  }, [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Toast container */}
      <div className="toast-container">
        <AnimatePresence mode="popLayout">
          {toasts.map((t) => {
            const Icon = icons[t.type] || Info;
            return (
              <motion.div
                key={t.id}
                layout
                initial={{ opacity: 0, x: 40, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className={`rounded-xl border backdrop-blur-lg p-4 shadow-xl flex items-start gap-3 ${toastStyles[t.type]}`}
              >
                <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColors[t.type]}`} />
                <div className="flex-1 min-w-0">
                  {t.title && (
                    <p className="text-sm font-semibold text-white">{t.title}</p>
                  )}
                  {t.message && (
                    <p className="text-xs font-medium text-text-secondary mt-0.5 leading-relaxed">{t.message}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="shrink-0 text-text-muted hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

/**
 * Hook to trigger toast notifications.
 * Returns { success, error, warning, info } functions.
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if used outside provider
    return {
      success: (title, msg) => console.log(`[Toast] ${title}`, msg),
      error: (title, msg) => console.error(`[Toast] ${title}`, msg),
      warning: (title, msg) => console.warn(`[Toast] ${title}`, msg),
      info: (title, msg) => console.info(`[Toast] ${title}`, msg),
    };
  }
  return context;
}

export default ToastProvider;
