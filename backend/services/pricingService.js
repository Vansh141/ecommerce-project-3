const config = require('../config/env');
const { round2, taxFromInclusive, taxFromExclusive } = require('../utils/money');

/**
 * The single source of truth for order totals.
 *
 * Both the cart preview endpoint and order creation call this, which is what
 * guarantees the price shown in the bag matches the price charged at
 * checkout. Client-supplied totals are never an input here.
 */

const SHIPPING_FREE_THRESHOLD = config.store.freeShippingThreshold;
const SHIPPING_FLAT_RATE = config.store.shippingFlatRate;
const TAX_RATE = config.store.taxRate;
const TAX_INCLUSIVE = config.store.taxInclusive;

/**
 * @param {Array<{price:number, qty:number}>} lines  Prices read from the DB.
 * @param {number} discountTotal                     Coupon discount in rupees.
 */
function calculateTotals(lines, discountTotal = 0) {
  const itemsTotal = round2(
    lines.reduce((sum, line) => sum + round2(line.price) * line.qty, 0)
  );

  // A coupon can never exceed the basket value, so a total can never go negative.
  const discount = round2(Math.min(Math.max(discountTotal, 0), itemsTotal));
  const netAfterDiscount = round2(itemsTotal - discount);

  // Free-shipping eligibility is judged on what the customer actually pays.
  const shippingTotal =
    netAfterDiscount >= SHIPPING_FREE_THRESHOLD || netAfterDiscount === 0
      ? 0
      : round2(SHIPPING_FLAT_RATE);

  let taxTotal;
  let grandTotal;

  if (TAX_INCLUSIVE) {
    // Indian apparel MRPs already include GST: show the component, don't add it.
    grandTotal = round2(netAfterDiscount + shippingTotal);
    taxTotal = taxFromInclusive(netAfterDiscount, TAX_RATE);
  } else {
    taxTotal = taxFromExclusive(netAfterDiscount, TAX_RATE);
    grandTotal = round2(netAfterDiscount + shippingTotal + taxTotal);
  }

  return {
    itemsTotal,
    discountTotal: discount,
    shippingTotal,
    taxTotal,
    grandTotal,
    currency: config.store.currency,
    taxInclusive: TAX_INCLUSIVE,
    freeShippingThreshold: SHIPPING_FREE_THRESHOLD,
    amountToFreeShipping:
      shippingTotal > 0 ? round2(Math.max(SHIPPING_FREE_THRESHOLD - netAfterDiscount, 0)) : 0,
  };
}

module.exports = {
  calculateTotals,
  SHIPPING_FREE_THRESHOLD,
  SHIPPING_FLAT_RATE,
  TAX_RATE,
  TAX_INCLUSIVE,
};
