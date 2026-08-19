const mongoose = require('mongoose');
const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, paginationMeta } = require('../utils/apiResponse');

/**
 * Recalculates a product's rating from its approved reviews.
 *
 * The aggregate is the only writer of `ratingAverage`/`ratingCount` — the
 * product API cannot set them, so displayed ratings always reflect real
 * reviews rather than a number an admin typed in.
 */
async function recalculateProductRating(productId) {
  const [stats] = await Review.aggregate([
    { $match: { product: new mongoose.Types.ObjectId(String(productId)), isApproved: true } },
    { $group: { _id: '$product', average: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  await Product.updateOne(
    { _id: productId },
    {
      $set: {
        ratingAverage: stats ? Math.round(stats.average * 10) / 10 : 0,
        ratingCount: stats ? stats.count : 0,
      },
    }
  );
}

// ── GET /api/products/:productId/reviews ─────────────────────────────────────
const listProductReviews = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const filter = { product: req.params.productId, isApproved: true };

  const [reviews, total, distribution] = await Promise.all([
    Review.find(filter)
      .select('rating title comment userName isVerifiedPurchase createdAt')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
    Review.aggregate([
      { $match: { product: new mongoose.Types.ObjectId(String(req.params.productId)), isApproved: true } },
      { $group: { _id: '$rating', count: { $sum: 1 } } },
    ]),
  ]);

  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  distribution.forEach((d) => { breakdown[d._id] = d.count; });

  return sendSuccess(res, { reviews, breakdown }, { meta: paginationMeta({ page, limit, total }) });
});

// ── GET /api/products/:productId/reviews/eligibility ─────────────────────────
/** Tells the UI whether to show a "write a review" form, and why not if not. */
const getReviewEligibility = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const existing = await Review.findOne({ product: productId, user: req.user._id }).lean();
  if (existing) {
    return sendSuccess(res, { eligible: false, reason: 'ALREADY_REVIEWED', review: existing });
  }

  const deliveredOrder = await Order.findOne({
    user: req.user._id,
    status: 'delivered',
    'items.product': productId,
  })
    .select('_id orderNumber')
    .lean();

  if (!deliveredOrder) {
    return sendSuccess(res, { eligible: false, reason: 'NOT_PURCHASED' });
  }

  return sendSuccess(res, { eligible: true, orderId: deliveredOrder._id });
});

// ── POST /api/products/:productId/reviews ────────────────────────────────────
/**
 * Only verified purchasers may review, and only once per product.
 *
 * Ownership of a *delivered* order containing the product is proven
 * server-side; the client cannot nominate an arbitrary order id.
 */
const createReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, title = '', comment } = req.body;

  const product = await Product.findById(productId).select('_id status');
  if (!product) throw ApiError.notFound('Product not found.');

  const deliveredOrder = await Order.findOne({
    user: req.user._id,
    status: 'delivered',
    'items.product': productId,
  })
    .select('_id')
    .lean();

  if (!deliveredOrder) {
    throw ApiError.forbidden(
      'Only customers who have received this item can review it.',
      { code: 'NOT_VERIFIED_PURCHASER' }
    );
  }

  try {
    const review = await Review.create({
      product: productId,
      user: req.user._id,
      order: deliveredOrder._id,
      rating,
      title: String(title).trim(),
      comment: String(comment).trim(),
      userName: req.user.name,
      isVerifiedPurchase: true,
    });

    await recalculateProductRating(productId);
    return sendCreated(res, { review });
  } catch (err) {
    // The unique (product, user) index is the real guard against duplicates
    // under concurrent submissions.
    if (err.code === 11000) {
      throw ApiError.conflict('You have already reviewed this product.', {
        code: 'ALREADY_REVIEWED',
      });
    }
    throw err;
  }
});

// ── PUT /api/reviews/:id ─────────────────────────────────────────────────────
const updateReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found.');

  if (review.user.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You can only edit your own review.');
  }

  if (req.body.rating !== undefined) review.rating = req.body.rating;
  if (req.body.title !== undefined) review.title = String(req.body.title).trim();
  if (req.body.comment !== undefined) review.comment = String(req.body.comment).trim();

  await review.save();
  await recalculateProductRating(review.product);

  return sendSuccess(res, { review });
});

// ── DELETE /api/reviews/:id ──────────────────────────────────────────────────
const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found.');

  const isOwner = review.user.toString() === req.user._id.toString();
  if (!isOwner && req.user.role !== 'admin') {
    throw ApiError.forbidden('You can only delete your own review.');
  }

  const { product } = review;
  await review.deleteOne();
  await recalculateProductRating(product);

  return sendSuccess(res, { message: 'Review removed.' });
});

// ── Admin ────────────────────────────────────────────────────────────────────
const listAllReviews = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 60);

  const filter = {};
  if (req.query.approved === 'false') filter.isApproved = false;
  if (req.query.approved === 'true') filter.isApproved = true;
  if (req.query.rating) {
    const r = Number(req.query.rating);
    if (r >= 1 && r <= 5) filter.rating = r;
  }

  const [reviews, total] = await Promise.all([
    Review.find(filter)
      .populate('product', 'name slug images')
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Review.countDocuments(filter),
  ]);

  return sendSuccess(res, { reviews }, { meta: paginationMeta({ page, limit, total }) });
});

/** Hides abusive content without destroying the record or the audit trail. */
const setReviewApproval = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) throw ApiError.notFound('Review not found.');

  review.isApproved = Boolean(req.body.isApproved);
  await review.save();
  await recalculateProductRating(review.product);

  return sendSuccess(res, { review });
});

module.exports = {
  listProductReviews,
  getReviewEligibility,
  createReview,
  updateReview,
  deleteReview,
  listAllReviews,
  setReviewApproval,
  recalculateProductRating,
};
