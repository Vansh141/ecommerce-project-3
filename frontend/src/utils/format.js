/** Shared formatting. One implementation so prices never render inconsistently. */

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const inrPrecise = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export const formatPrice = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  // Whole rupees for browsing, paise for anything the customer is charged.
  return Number.isInteger(n) ? inr.format(n) : inrPrecise.format(n);
};

export const formatPriceExact = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? inrPrecise.format(n) : '—';
};

export const formatDate = (value, opts = {}) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...opts });
};

export const formatDateTime = (value) =>
  formatDate(value, { hour: '2-digit', minute: '2-digit' });

export const discountPercent = (mrp, price) => {
  const m = Number(mrp);
  const p = Number(price);
  if (!Number.isFinite(m) || !Number.isFinite(p) || m <= 0 || p >= m) return 0;
  return Math.round(((m - p) / m) * 100);
};

export const initialsOf = (name = '') =>
  name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U';

/** Human labels for the order lifecycle. */
export const ORDER_STATUS_LABEL = {
  pending: 'Awaiting payment',
  confirmed: 'Confirmed',
  packed: 'Packed',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const ORDER_STATUS_TONE = {
  pending: 'badge-warning',
  confirmed: 'badge-info',
  packed: 'badge-info',
  shipped: 'badge-info',
  delivered: 'badge-success',
  cancelled: 'badge-danger',
  refunded: 'badge-neutral',
};

export const PAYMENT_STATUS_LABEL = {
  pending: 'Payment pending',
  paid: 'Paid',
  failed: 'Payment failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

export const PAYMENT_STATUS_TONE = {
  pending: 'badge-warning',
  paid: 'badge-success',
  failed: 'badge-danger',
  refunded: 'badge-neutral',
  partially_refunded: 'badge-neutral',
};

/** Ordered so a size row never renders XL before M. */
export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'ONE SIZE'];

export const sortSizes = (sizes = []) =>
  [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(String(a).toUpperCase());
    const ib = SIZE_ORDER.indexOf(String(b).toUpperCase());
    if (ia === -1 && ib === -1) return String(a).localeCompare(String(b));
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
