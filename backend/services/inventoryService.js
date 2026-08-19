const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');

/**
 * Inventory movements.
 *
 * Every stock change is a single atomic, conditional update. The condition
 * (`variants.stock >= qty`) and the decrement happen inside one MongoDB
 * operation, so two concurrent checkouts for the last item cannot both
 * succeed. A read-then-write sequence — however short the gap — oversells.
 */

/**
 * Attempts to deduct `qty` from one variant.
 * Returns true on success, false when there was not enough stock.
 * Never throws for the "insufficient stock" case; that is a business outcome.
 */
async function reserveVariant({ productId, variantId, qty }) {
  const result = await Product.updateOne(
    {
      _id: productId,
      variants: { $elemMatch: { _id: variantId, isActive: true, stock: { $gte: qty } } },
    },
    { $inc: { 'variants.$.stock': -qty, totalStock: -qty } }
  );
  return result.modifiedCount === 1;
}

/** Returns `qty` to a variant. Used for rollback, cancellation and refunds. */
async function releaseVariant({ productId, variantId, qty }) {
  const result = await Product.updateOne(
    { _id: productId, 'variants._id': variantId },
    { $inc: { 'variants.$.stock': qty, totalStock: qty } }
  );
  return result.modifiedCount === 1;
}

/**
 * Reserves stock for a whole basket.
 *
 * If any line fails, every line already reserved in this call is released
 * before throwing, so a partial deduction can never be left behind.
 */
async function reserveMany(lines) {
  const reserved = [];

  for (const line of lines) {
    // Sequential by design: each iteration must observe the effect of the
    // previous one (the same variant may legitimately appear twice).
    // eslint-disable-next-line no-await-in-loop
    const ok = await reserveVariant(line);

    if (!ok) {
      // eslint-disable-next-line no-await-in-loop
      await releaseMany(reserved);
      logger.warn('Stock reservation failed; rolled back', {
        productId: String(line.productId),
        variantId: String(line.variantId),
        qty: line.qty,
        rolledBack: reserved.length,
      });
      throw ApiError.conflict(
        `"${line.name || 'An item'}"${line.size ? ` (size ${line.size})` : ''} is no longer available in the quantity requested. Please review your bag.`,
        { code: 'INSUFFICIENT_STOCK' }
      );
    }
    reserved.push(line);
  }

  return reserved;
}

/** Best-effort release of many lines. Individual failures are logged, not thrown. */
async function releaseMany(lines) {
  for (const line of lines) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await releaseVariant(line);
    } catch (err) {
      logger.error('Failed to release reserved stock', {
        productId: String(line.productId),
        variantId: String(line.variantId),
        qty: line.qty,
        message: err.message,
      });
    }
  }
}

/** Increments lifetime sold counters once an order is confirmed. */
async function recordSales(lines) {
  for (const line of lines) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await Product.updateOne({ _id: line.productId }, { $inc: { soldCount: line.qty } });
    } catch {
      // Analytics only — never allowed to affect the order outcome.
    }
  }
}

/** Products at or below the low-stock threshold, for the admin dashboard. */
async function findLowStock(threshold, limit = 20) {
  return Product.find({ status: 'active', totalStock: { $lte: threshold } })
    .select('name slug images totalStock variants price')
    .sort({ totalStock: 1 })
    .limit(limit)
    .lean();
}

module.exports = {
  reserveVariant,
  releaseVariant,
  reserveMany,
  releaseMany,
  recordSales,
  findLowStock,
};
