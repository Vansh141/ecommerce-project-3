import { forwardRef, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, X, AlertCircle, Inbox, ChevronRight } from 'lucide-react';

/* ══════════════════════════════ Button ═══════════════════════════════════ */

const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  quiet: 'btn-quiet',
  danger: 'btn-danger',
};
const SIZES = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' };

/**
 * One button implementation for the whole site.
 * `loading` keeps the element mounted and disabled rather than swapping it for
 * a spinner, so layout never shifts and focus is never lost mid-interaction.
 */
export const Button = forwardRef(function Button(
  { as, to, href, variant = 'primary', size = 'md', loading = false, fullWidth = false,
    className = '', children, disabled, ...rest },
  ref
) {
  const cls = [
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || SIZES.md,
    fullWidth ? 'w-full' : '',
    className,
  ].join(' ');

  const content = (
    <>
      {loading && <Loader2 size={15} className="animate-spin" aria-hidden="true" />}
      {children}
    </>
  );

  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{content}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} {...rest}>{content}</a>;

  const Tag = as || 'button';
  return (
    <Tag
      ref={ref}
      className={cls}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {content}
    </Tag>
  );
});

/* ══════════════════════════════ Inputs ═══════════════════════════════════ */

let fieldSeq = 0;

export const Input = forwardRef(function Input(
  { label, error, hint, id, className = '', required, ...rest },
  ref
) {
  fieldSeq += 1;
  const inputId = id || `field-${fieldSeq}`;
  const errorId = `${inputId}-error`;
  const hintId = `${inputId}-hint`;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {required && <span aria-hidden="true" className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={[error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined}
        className={`field ${error ? 'field-error' : ''}`}
        {...rest}
      />
      {hint && !error && <p id={hintId} className="field-hint">{hint}</p>}
      {error && (
        <p id={errorId} className="field-msg-error">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { label, error, hint, id, className = '', required, rows = 4, ...rest },
  ref
) {
  fieldSeq += 1;
  const inputId = id || `ta-${fieldSeq}`;
  const errorId = `${inputId}-error`;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="field-label">
          {label}
          {required && <span aria-hidden="true" className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        id={inputId}
        rows={rows}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`field resize-y ${error ? 'field-error' : ''}`}
        {...rest}
      />
      {hint && !error && <p className="field-hint">{hint}</p>}
      {error && (
        <p id={errorId} className="field-msg-error">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

export const Select = forwardRef(function Select(
  { label, error, id, className = '', children, required, ...rest },
  ref
) {
  fieldSeq += 1;
  const inputId = id || `sel-${fieldSeq}`;

  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="field-label">{label}</label>}
      <select
        ref={ref}
        id={inputId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        className={`field cursor-pointer pr-9 ${error ? 'field-error' : ''}`}
        {...rest}
      >
        {children}
      </select>
      {error && (
        <p className="field-msg-error">
          <AlertCircle size={13} className="mt-px shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
});

export const Checkbox = forwardRef(function Checkbox({ label, id, className = '', ...rest }, ref) {
  fieldSeq += 1;
  const inputId = id || `cb-${fieldSeq}`;

  return (
    <label htmlFor={inputId} className={`flex cursor-pointer items-start gap-2.5 ${className}`}>
      <input
        ref={ref}
        id={inputId}
        type="checkbox"
        className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded-none border-line-strong
                   text-ink accent-ink focus:ring-1 focus:ring-clay"
        {...rest}
      />
      <span className="text-sm leading-snug text-ink-soft">{label}</span>
    </label>
  );
});

/* ══════════════════════════════ Feedback ═════════════════════════════════ */

const ALERT_TONES = {
  error: 'border-danger/25 bg-danger-faint text-danger',
  success: 'border-success/25 bg-success-faint text-success',
  warning: 'border-warning/25 bg-warning-faint text-warning',
  info: 'border-info/25 bg-info-faint text-info',
};

export function Alert({ tone = 'info', title, children, onDismiss, className = '' }) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-card border px-4 py-3 text-sm ${ALERT_TONES[tone]} ${className}`}
    >
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex-1 leading-relaxed">
        {title && <p className="font-medium">{title}</p>}
        {children}
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="-m-1 p-1 opacity-60 hover:opacity-100">
          <X size={14} />
        </button>
      )}
    </div>
  );
}

export function Spinner({ size = 20, className = '', label = 'Loading' }) {
  return (
    <span role="status" aria-label={label} className={`inline-flex ${className}`}>
      <Loader2 size={size} className="animate-spin text-ink-faint" aria-hidden="true" />
    </span>
  );
}

export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner size={26} label={label} />
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

export function EmptyState({ icon: Icon = Inbox, title, description, action, className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center px-6 py-20 text-center ${className}`}>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-paper-sunken">
        <Icon size={22} className="text-ink-faint" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-xl">{title}</h2>
      {description && <p className="mb-7 max-w-sm text-sm leading-relaxed text-ink-muted">{description}</p>}
      {action}
    </div>
  );
}

/* ══════════════════════════════ Modal ════════════════════════════════════ */

/**
 * Accessible dialog: Escape closes it, focus moves inside on open and returns
 * to the trigger on close, background scroll is locked, and Tab is trapped so
 * keyboard users cannot wander behind the overlay.
 */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  const panelRef = useRef(null);
  const previouslyFocused = useRef(null);

  const widths = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const focusables = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return undefined;

    previouslyFocused.current = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    const timer = setTimeout(() => {
      const target = panelRef.current?.querySelector(
        'input:not([type="hidden"]), textarea, select, button'
      );
      (target || panelRef.current)?.focus();
    }, 30);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = overflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 animate-fade-in bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={`relative flex max-h-[92vh] w-full ${widths[size]} animate-fade-up flex-col
                    rounded-t-card border border-line bg-paper-raised shadow-pop sm:rounded-card`}
      >
        {title && (
          <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
            <div>
              <h2 className="text-lg">{title}</h2>
              {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close dialog"
              className="-m-2 shrink-0 p-2 text-ink-faint transition-colors hover:text-ink"
            >
              <X size={18} />
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

        {footer && <div className="border-t border-line px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open, onClose, onConfirm, title, message, confirmLabel = 'Confirm',
  cancelLabel = 'Cancel', tone = 'danger', loading = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} fullWidth onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-ink-soft">{message}</p>
    </Modal>
  );
}

/* ══════════════════════════════ Misc ═════════════════════════════════════ */

export function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={`badge-${tone} ${className}`}>{children}</span>;
}

export function SectionHeading({ eyebrow, title, action, className = '' }) {
  return (
    <div className={`mb-8 flex items-end justify-between gap-6 ${className}`}>
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className="text-2xl sm:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs text-ink-muted">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={12} className="text-ink-faint" aria-hidden="true" />}
            {item.to && i < items.length - 1 ? (
              <Link to={item.to} className="transition-colors hover:text-ink">{item.label}</Link>
            ) : (
              <span className="text-ink" aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Pagination that stays usable on a 375px screen. */
export function Pagination({ page, totalPages, onChange, className = '' }) {
  if (!totalPages || totalPages <= 1) return null;

  const pages = [];
  const push = (p) => { if (!pages.includes(p) && p >= 1 && p <= totalPages) pages.push(p); };
  push(1);
  for (let p = page - 1; p <= page + 1; p += 1) push(p);
  push(totalPages);
  pages.sort((a, b) => a - b);

  return (
    <nav aria-label="Pagination" className={`flex items-center justify-center gap-1.5 ${className}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        Prev
      </Button>

      {pages.map((p, i) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && pages[i - 1] !== p - 1 && <span className="px-1 text-ink-faint">…</span>}
          <button
            type="button"
            onClick={() => onChange(p)}
            aria-current={p === page ? 'page' : undefined}
            aria-label={`Page ${p}`}
            className={`h-9 min-w-9 rounded-control px-2.5 text-xs font-medium transition-colors ${
              p === page ? 'bg-ink text-paper' : 'border border-line text-ink-soft hover:border-ink hover:text-ink'
            }`}
          >
            {p}
          </button>
        </span>
      ))}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="Next page"
      >
        Next
      </Button>
    </nav>
  );
}
