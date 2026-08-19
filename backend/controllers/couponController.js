const Coupon = require('../models/Coupon');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, paginationMeta } = require('../utils/apiResponse');
const couponService = require('../services/couponService');
const orderService = require('../services/orderService');
const { round2 } = require('../utils/money');

// ── POST /api/coupons/validate ───────────────────────────────────────────────
/**
 * Validates a code against the customer's actual basket.
 *
 * The subtotal is recomputed from the database rather than taken from the
 * request, so a client cannot inflate its basket value to clear a coupon's
 * minimum-order threshold.
 */
const validateCoupon = asyncHandler(async (req, res) => {
  const preview = await orderService.previewCart({
    items: req.body.items,
    couponCode: null,
    userId: req.user._id,
  });

  const subtotal = preview.pricing.itemsTotal;

  const { coupon, discountAmount } = await couponService.validateCoupon({
    code: req.body.code,
    subtotal,
    userId: req.user._id,
  });

  // Re-price the whole basket so the client sees exactly what it will pay.
  const withCoupon = await orderService.previewCart({
    items: req.body.items,
    couponCode: coupon.code,
    userId: req.user._id,
  });

  return sendSuccess(res, {
    coupon: {
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount: round2(discountAmount),
    },
    pricing: withCoupon.pricing,
    message: `Coupon ${coupon.code} applied.`,
  });
});

// ── Admin: list ──────────────────────────────────────────────────────────────
const listCoupons = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 60);

  const filter = {};
  if (req.query.active === 'true') filter.isActive = true;
  if (req.query.active === 'false') filter.isActive = false;

  const [coupons, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean({ virtuals: true }),
    Coupon.countDocuments(filter),
  ]);

  return sendSuccess(res, { coupons }, { meta: paginationMeta({ page, limit, total }) });
});

const getCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id).lean({ virtuals: true });
  if (!coupon) throw ApiError.notFound('Coupon not found.');
  return sendSuccess(res, { coupon });
});

const createCoupon = asyncHandler(async (req, res) => {
  const code = String(req.body.code).trim().toUpperCase();

  const existing = await Coupon.findOne({ code });
  if (existing) throw ApiError.conflict('A coupon with that code already exists.');

  const coupon = await Coupon.create({
    code,
    description: req.body.description || '',
    discountType: req.body.discountType,
    discountValue: req.body.discountValue,
    maxDiscountAmount: req.body.maxDiscountAmount || 0,
    minOrderValue: req.body.minOrderValue || 0,
    startsAt: req.body.startsAt || new Date(),
    expiresAt: req.body.expiresAt,
    isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive),
    totalUsageLimit: req.body.totalUsageLimit || 0,
    perUserLimit: req.body.perUserLimit === undefined ? 1 : req.body.perUserLimit,
  });

  return sendCreated(res, { coupon });
});

const updateCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found.');

  // `usedCount` and `redemptions` are intentionally not assignable — editing
  // them would let an admin accidentally reset per-user limits.
  const assignable = [
    'description', 'discountType', 'discountValue', 'maxDiscountAmount',
    'minOrderValue', 'startsAt', 'expiresAt', 'totalUsageLimit', 'perUserLimit',
  ];
  for (const field of assignable) {
    if (req.body[field] !== undefined) coupon[field] = req.body[field];
  }
  if (req.body.isActive !== undefined) coupon.isActive = Boolean(req.body.isActive);

  await coupon.save();
  return sendSuccess(res, { coupon });
});

const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findById(req.params.id);
  if (!coupon) throw ApiError.notFound('Coupon not found.');

  // Deleting a redeemed coupon would orphan the reference on historical
  // orders, so it is deactivated instead.
  if (coupon.usedCount > 0) {
    coupon.isActive = false;
    await coupon.save();
    return sendSuccess(res, {
      coupon,
      message: 'This coupon has been used on orders, so it was deactivated rather than deleted.',
    });
  }

  await coupon.deleteOne();
  return sendSuccess(res, { message: 'Coupon deleted.' });
});

module.exports = { validateCoupon, listCoupons, getCoupon, createCoupon, updateCoupon, deleteCoupon };
