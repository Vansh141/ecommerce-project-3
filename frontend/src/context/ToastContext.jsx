import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
};

let nextId = 0;

const TONES = {
  success: { icon: CheckCircle2, cls: 'text-success' },
  error: { icon: AlertCircle, cls: 'text-danger' },
  info: { icon: Info, cls: 'text-info' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message, tone = 'info', duration = 4000) => {
      nextId += 1;
      const id = nextId;
      setToasts((prev) => [...prev.slice(-3), { id, message, tone }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      toast: push,
      success: (m, d) => push(m, 'success', d),
      error: (m, d) => push(m, 'error', d ?? 6000),
      info: (m, d) => push(m, 'info', d),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Announced politely so screen readers hear confirmations without
          interrupting whatever the user is doing. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2
                   p-4 pb-safe sm:items-end sm:p-6"
      >
        {toasts.map(({ id, message, tone }) => {
          const { icon: Icon, cls } = TONES[tone] || TONES.info;
          return (
            <div
              key={id}
              className="pointer-events-auto flex w-full max-w-sm animate-fade-up items-start gap-3
                         rounded-card border border-line bg-paper-raised px-4 py-3 shadow-pop"
            >
              <Icon size={17} className={`mt-0.5 shrink-0 ${cls}`} aria-hidden="true" />
              <p className="flex-1 text-sm leading-snug text-ink">{message}</p>
              <button
                type="button"
                onClick={() => dismiss(id)}
                aria-label="Dismiss notification"
                className="-m-1.5 shrink-0 p-1.5 text-ink-faint transition-colors hover:text-ink"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
