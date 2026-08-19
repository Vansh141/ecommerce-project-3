/**
 * Money helpers.
 *
 * All monetary values are handled as rupees with exactly two decimal places.
 * Every arithmetic result is routed through `round2` so repeated float
 * operations cannot drift (e.g. 0.1 + 0.2 = 0.30000000000000004).
 */

/** Rounds to 2 decimals using half-away-from-zero, avoiding float drift. */
function round2(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Converts rupees to integer paise — the unit Razorpay expects. */
function toPaise(rupees) {
  return Math.round(round2(rupees) * 100);
}

/** Converts integer paise back to rupees. */
function fromPaise(paise) {
  return round2(Number(paise) / 100);
}

/** Percentage discount off an MRP, floored at zero. */
function discountPercent(mrp, price) {
  const m = Number(mrp);
  const p = Number(price);
  if (!Number.isFinite(m) || !Number.isFinite(p) || m <= 0 || p >= m) return 0;
  return Math.round(((m - p) / m) * 100);
}

/**
 * Extracts the tax component from a tax-inclusive gross amount.
 * For Indian apparel the listed price already contains GST, so tax is shown
 * as a component of the total rather than added on top.
 */
function taxFromInclusive(grossAmount, rate) {
  const gross = round2(grossAmount);
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return round2(gross - gross / (1 + r));
}

/** Adds tax on top of a net amount (used when TAX_INCLUSIVE=false). */
function taxFromExclusive(netAmount, rate) {
  const net = round2(netAmount);
  const r = Number(rate);
  if (!Number.isFinite(r) || r <= 0) return 0;
  return round2(net * r);
}

module.exports = { round2, toPaise, fromPaise, discountPercent, taxFromInclusive, taxFromExclusive };
