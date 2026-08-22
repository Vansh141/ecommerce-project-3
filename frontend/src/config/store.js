/**
 * Storefront-facing copies of the commerce settings the API enforces.
 *
 * The server is always the authority — `pricingService` decides what a
 * customer is actually charged. These values exist only so that the parts of
 * the UI that render *before* a cart exists (the announcement strip, the
 * product page service facts) state the same numbers, from one place, rather
 * than repeating literals across files where they can drift apart.
 *
 * They mirror the backend defaults in `config/env.js` and can be overridden
 * at build time to match a deployment that changed them.
 */

const num = (raw, fallback) => {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export const FREE_SHIPPING_THRESHOLD = num(
  import.meta.env.VITE_FREE_SHIPPING_THRESHOLD,
  1499
);

export const SHIPPING_FLAT_RATE = num(import.meta.env.VITE_SHIPPING_FLAT_RATE, 79);

export const RETURN_WINDOW_DAYS = num(import.meta.env.VITE_RETURN_WINDOW_DAYS, 7);

/** Mirrors ORDER_CANCEL_WINDOW_HOURS on the API, which enforces it. */
export const ORDER_CANCEL_WINDOW_HOURS = num(
  import.meta.env.VITE_ORDER_CANCEL_WINDOW_HOURS,
  24
);
