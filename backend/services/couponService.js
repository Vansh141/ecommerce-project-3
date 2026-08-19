const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { round2 } = require('../utils/money');

/**
 * Coupon validation and redemption.
 *
 * The client sends only a code — never a discount amount. The rupee value is
 * always derived here from the stored coupon definition and the server-side
 * basket total, so a tampered request cannot manufacture a discount.
 */

/**
 * Validates a code against a basket subtotal for a specific user.
 * Throws ApiError with a customer-safe message on any failure.
 *
 * @returns {{coupon: Document, discountAmount: number}}
 */
async function validateCoupon({ code, subtotal, userId }) {
  if (typeof code !== 'string' || !code.trim()) {
    throw ApiError.badRequest('Please enter a coupon code.', { code: 'COUPON_REQUIRED' });
  }

  const normalised = code.trim().toUpperCase().slice(0, 32);

  // `redemptions` is select:false by default; we need it for the per-user check.
  const coupon = await Coupon.findOne({ code: normalised }).select('+redemptions');

  // A single generic message for "doesn't exist", "inactive" and "expired"
  // prevents probing the coupon namespace for valid-but-not-yet-live codes.
  const invalid = ApiError.badRequest('This coupon code is not valid.', {
    code: 'COUPON_INVALID',
  });

  if (!coupon || !coupon.isActive) throw invalid;

  const now = Date.now();
  if (coupon.startsAt && coupon.startsAt.getTime() > now) throw invalid;
  if (coupon.expiresAt && coupon.expiresAt.getTime() < now) {
    throw ApiError.badRequest('This coupon has expired.', { code: 'COUPON_EXPIRED' });
  }

  if (coupon.totalUsageLimit > 0 && coupon.usedCount >= coupon.totalUsageLimit) {
    throw ApiError.badRequest('This coupon has reached its usage limit.', {
      code: 'COUPON_EXHAUSTED',
    });
  }

  if (subtotal < coupon.minOrderValue) {
    throw ApiError.badRequest(
      `Add ₹${round2(coupon.minOrderValue - subtotal).toFixed(2)} more to use this coupon (minimum order ₹${coupon.minOrderValue.toFixed(2)}).`,
      { code: 'COUPON_MIN_ORDER' }
    );
  }

  if (userId && coupon.perUserLimit > 0) {
    const used = (coupon.redemptions || []).filter(
      (r) => r.user?.toString() === userId.toString()
    ).length;
    if (used >= coupon.perUserLimit) {
      throw ApiError.badRequest('You have already used this coupon.', {
        code: 'COUPON_ALREADY_USED',
      });
    }
  }

  const discountAmount = computeDiscount(coupon, subtotal);

  if (discountAmount <= 0) {
    throw ApiError.badRequest('This coupon does not apply to your bag.', {
      code: 'COUPON_NO_EFFECT',
    });
  }

  return { coupon, discountAmount };
}

/** Derives the rupee discount, honouring the percentage cap and basket ceiling. */
function computeDiscount(coupon, subtotal) {
  let amount = 0;

  if (coupon.discountType === 'percentage') {
    amount = round2((subtotal * coupon.discountValue) / 100);
    if (coupon.maxDiscountAmount > 0) amount = Math.min(amount, coupon.maxDiscountAmount);
  } else {
    amount = round2(coupon.discountValue);
  }

  // Never discount more than the basket is worth.
  return round2(Math.min(amount, subtotal));
}

/**
 * Records a redemption. Called only after the order is successfully persisted.
 *
 * The `$expr` guard makes the increment atomic against the usage limit, so a
 * burst of concurrent checkouts cannot push `usedCount` past `totalUsageLimit`.
 */
async function redeemCoupon({ couponId, userId, orderId, amount }) {
  const result = await Coupon.updateOne(
    {
      _id: couponId,
      isActive: true,
      $or: [
        { totalUsageLimit: 0 },
        { $expr: { $lt: ['$usedCount', '$totalUsageLimit'] } },
      ],
    },
    {
      $inc: { usedCount: 1 },
      $push: { redemptions: { user: userId, order: orderId, amount, at: new Date() } },
    }
  );

  if (result.modifiedCount !== 1) {
    logger.warn('Coupon redemption did not apply', { couponId: String(couponId) });
    return false;
  }
  return true;
}

/** Reverses a redemption when an order is cancelled, freeing the code for reuse. */
async function releaseCoupon({ couponId, orderId }) {
  if (!couponId || !orderId) return;
  try {
    await Coupon.updateOne(
      { _id: couponId, usedCount: { $gt: 0 } },
      { $inc: { usedCount: -1 }, $pull: { redemptions: { order: orderId } } }
    );
  } catch (err) {
    logger.error('Failed to release coupon redemption', {
      couponId: String(couponId),
      message: err.message,
    });
  }
}

module.exports = { validateCoupon, computeDiscount, redeemCoupon, releaseCoupon };
