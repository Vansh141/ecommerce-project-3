const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const config = require('../config/env');
const { round2 } = require('../utils/money');
const pricingService = require('./pricingService');
const couponService = require('./couponService');
const inventoryService = require('./inventoryService');

const MAX_QTY_PER_ITEM = config.store.maxQtyPerItem;
const MAX_DISTINCT_ITEMS = 40;

/**
 * Normalises a client basket into canonical lines.
 *
 * Two hard rules are enforced here, both of which were exploitable before:
 *   1. Quantities must be positive integers. A negative qty previously passed
 *      the `stock < qty` check, produced a negative order total, and *credited*
 *      stock back to the product.
 *   2. Lines are merged by (product, variant). Sending the same variant on two
 *      lines previously let each line pass the stock check independently,
 *      allowing an order for twice the available stock.
 */
function normaliseRequestedItems(rawItems) {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    throw ApiError.badRequest('Your bag is empty.', { code: 'EMPTY_CART' });
  }
  if (rawItems.length > MAX_DISTINCT_ITEMS) {
    throw ApiError.badRequest(`An order may contain at most ${MAX_DISTINCT_ITEMS} distinct items.`);
  }

  const merged = new Map();

  for (const raw of rawItems) {
    if (!raw || typeof raw !== 'object') {
      throw ApiError.badRequest('One of the items in your bag is malformed.');
    }

    const productId = raw.product ?? raw.productId;
    const variantId = raw.variantId ?? raw.variant;

    if (!mongoose.isValidObjectId(productId)) {
      throw ApiError.badRequest('One of the items in your bag references an invalid product.');
    }
    if (!mongoose.isValidObjectId(variantId)) {
      throw ApiError.badRequest('Please select a size for every item in your bag.', {
        code: 'VARIANT_REQUIRED',
      });
    }

    const qty = Number(raw.qty);
    if (!Number.isInteger(qty) || qty < 1) {
      throw ApiError.badRequest('Quantity must be a whole number of at least 1.', {
        code: 'INVALID_QUANTITY',
      });
    }
    if (qty > MAX_QTY_PER_ITEM) {
      throw ApiError.badRequest(`You can order at most ${MAX_QTY_PER_ITEM} of any single item.`, {
        code: 'QUANTITY_LIMIT',
      });
    }

    const key = `${productId}:${variantId}`;
    const existing = merged.get(key);
    const total = (existing?.qty ?? 0) + qty;

    if (total > MAX_QTY_PER_ITEM) {
      throw ApiError.badRequest(`You can order at most ${MAX_QTY_PER_ITEM} of any single item.`, {
        code: 'QUANTITY_LIMIT',
      });
    }

    merged.set(key, { productId: String(productId), variantId: String(variantId), qty: total });
  }

  return [...merged.values()];
}

/**
 * Resolves normalised lines against the database.
 *
 * Every price, name and image on the resulting line comes from the Product
 * document — nothing the client sent about money or identity is trusted.
 */
async function buildOrderLines(requested) {
  const productIds = [...new Set(requested.map((r) => r.productId))];
  const products = await Product.find({ _id: { $in: productIds } })
    .select('name slug brand price mrp images variants status')
    .lean();

  const byId = new Map(products.map((p) => [p._id.toString(), p]));
  const lines = [];

  for (const item of requested) {
    const product = byId.get(item.productId);

    if (!product) {
      throw ApiError.badRequest('An item in your bag is no longer available.', {
        code: 'PRODUCT_UNAVAILABLE',
      });
    }
    if (product.status !== 'active') {
      throw ApiError.badRequest(`"${product.name}" is no longer available.`, {
        code: 'PRODUCT_UNAVAILABLE',
      });
    }

    const variant = (product.variants || []).find((v) => v._id.toString() === item.variantId);
    if (!variant) {
      throw ApiError.badRequest(`The selected size for "${product.name}" is no longer available.`, {
        code: 'VARIANT_UNAVAILABLE',
      });
    }
    if (!variant.isActive) {
      throw ApiError.badRequest(`Size ${variant.size} of "${product.name}" is no longer available.`, {
        code: 'VARIANT_UNAVAILABLE',
      });
    }
    if (variant.stock < item.qty) {
      throw ApiError.conflict(
        variant.stock === 0
          ? `"${product.name}" (size ${variant.size}) is out of stock.`
          : `Only ${variant.stock} left of "${product.name}" in size ${variant.size}.`,
        { code: 'INSUFFICIENT_STOCK' }
      );
    }

    const price = round2(product.price);

    lines.push({
      productId: product._id,
      variantId: variant._id,
      product: product._id,
      name: product.name,
      slug: product.slug,
      brand: product.brand,
      image: product.images?.[0]?.url || '',
      sku: variant.sku,
      size: variant.size,
      color: variant.color || '',
      price,
      mrp: round2(product.mrp),
      qty: item.qty,
      lineTotal: round2(price * item.qty),
      availableStock: variant.stock,
    });
  }

  return lines;
}

/**
 * Prices a basket without creating anything.
 * Used by the cart and checkout screens so displayed totals are always the
 * same numbers the order will be charged at.
 */
async function previewCart({ items, couponCode = null, userId = null }) {
  const requested = normaliseRequestedItems(items);
  const lines = await buildOrderLines(requested);

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

  let discountTotal = 0;
  let appliedCoupon = null;
  let couponError = null;

  if (couponCode) {
    try {
      const { coupon, discountAmount } = await couponService.validateCoupon({
        code: couponCode,
        subtotal,
        userId,
      });
      discountTotal = discountAmount;
      appliedCoupon = {
        code: coupon.code,
        couponId: coupon._id,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        discountAmount,
        description: coupon.description,
      };
    } catch (err) {
      // A stale coupon must not block viewing the bag — surface it as a notice.
      couponError = err.message;
    }
  }

  const totals = pricingService.calculateTotals(lines, discountTotal);

  return {
    items: lines.map(({ productId, variantId, availableStock, ...rest }) => ({
      ...rest,
      product: productId,
      variantId,
      availableStock,
    })),
    coupon: appliedCoupon,
    couponError,
    pricing: totals,
  };
}

/** Resolves the shipping address from either a saved address id or a literal. */
function resolveShippingAddress(user, { addressId, shippingAddress }) {
  if (addressId) {
    const saved = user.addresses.id(addressId);
    if (!saved) throw ApiError.badRequest('The selected delivery address was not found.');
    return {
      fullName: saved.fullName,
      phone: saved.phone,
      line1: saved.line1,
      line2: saved.line2 || '',
      city: saved.city,
      state: saved.state,
      postalCode: saved.postalCode,
      country: saved.country || 'India',
    };
  }

  if (!shippingAddress || typeof shippingAddress !== 'object') {
    throw ApiError.badRequest('A delivery address is required.');
  }

  const required = ['fullName', 'phone', 'line1', 'city', 'state', 'postalCode'];
  for (const field of required) {
    if (typeof shippingAddress[field] !== 'string' || !shippingAddress[field].trim()) {
      throw ApiError.badRequest('Your delivery address is incomplete.');
    }
  }

  return {
    fullName: shippingAddress.fullName.trim(),
    phone: shippingAddress.phone.trim(),
    line1: shippingAddress.line1.trim(),
    line2: (shippingAddress.line2 || '').trim(),
    city: shippingAddress.city.trim(),
    state: shippingAddress.state.trim(),
    postalCode: shippingAddress.postalCode.trim(),
    country: (shippingAddress.country || 'India').trim(),
  };
}

/**
 * Creates an order.
 *
 * Sequence matters: totals are computed, stock is atomically reserved, and only
 * then is the order persisted. If persistence fails, the reservation is rolled
 * back so stock is never silently consumed by a failed checkout.
 */
async function createOrder({
  user,
  items,
  addressId = null,
  shippingAddress = null,
  paymentMethod,
  couponCode = null,
  customerNote = '',
}) {
  if (!Order.PAYMENT_METHODS.includes(paymentMethod)) {
    throw ApiError.badRequest('Unsupported payment method.', { code: 'INVALID_PAYMENT_METHOD' });
  }
  if (paymentMethod === 'RAZORPAY' && !config.razorpay.enabled) {
    throw ApiError.serviceUnavailable(
      'Online payment is temporarily unavailable. Please choose Cash on Delivery.',
      { code: 'PAYMENT_PROVIDER_UNAVAILABLE' }
    );
  }
  if (paymentMethod === 'COD' && !config.store.codEnabled) {
    throw ApiError.badRequest('Cash on Delivery is not available.', { code: 'COD_DISABLED' });
  }

  const address = resolveShippingAddress(user, { addressId, shippingAddress });

  const requested = normaliseRequestedItems(items);
  const lines = await buildOrderLines(requested);
  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

  // Coupon failures at checkout are hard errors — the customer has seen a
  // total and must not be charged a different one silently.
  let couponData = { code: null, couponId: null, discountType: null, discountValue: 0, discountAmount: 0 };
  let discountTotal = 0;
  let couponDoc = null;

  if (couponCode) {
    const { coupon, discountAmount } = await couponService.validateCoupon({
      code: couponCode,
      subtotal,
      userId: user._id,
    });
    couponDoc = coupon;
    discountTotal = discountAmount;
    couponData = {
      code: coupon.code,
      couponId: coupon._id,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount,
    };
  }

  const pricing = pricingService.calculateTotals(lines, discountTotal);

  if (paymentMethod === 'COD' && pricing.grandTotal > config.store.codMaxOrderValue) {
    throw ApiError.badRequest(
      `Cash on Delivery is available for orders up to ₹${config.store.codMaxOrderValue.toFixed(0)}. Please pay online for this order.`,
      { code: 'COD_LIMIT_EXCEEDED' }
    );
  }

  // ── Atomic stock reservation ───────────────────────────────────────────────
  const reservationLines = lines.map((l) => ({
    productId: l.productId,
    variantId: l.variantId,
    qty: l.qty,
    name: l.name,
    size: l.size,
  }));
  await inventoryService.reserveMany(reservationLines);

  // COD is treated as confirmed immediately; an online order stays `pending`
  // until the payment signature is verified.
  const initialStatus = paymentMethod === 'COD' ? 'confirmed' : 'pending';

  try {
    const order = await Order.create({
      user: user._id,
      items: lines.map((l) => ({
        product: l.productId,
        variantId: l.variantId,
        name: l.name,
        slug: l.slug,
        image: l.image,
        brand: l.brand,
        sku: l.sku,
        size: l.size,
        color: l.color,
        price: l.price,
        mrp: l.mrp,
        qty: l.qty,
        lineTotal: l.lineTotal,
      })),
      shippingAddress: address,
      pricing: {
        itemsTotal: pricing.itemsTotal,
        discountTotal: pricing.discountTotal,
        shippingTotal: pricing.shippingTotal,
        taxTotal: pricing.taxTotal,
        grandTotal: pricing.grandTotal,
        currency: pricing.currency,
        taxInclusive: pricing.taxInclusive,
      },
      coupon: couponData,
      payment: {
        method: paymentMethod,
        status: 'pending',
        amount: pricing.grandTotal,
      },
      status: initialStatus,
      statusHistory: [
        {
          status: initialStatus,
          at: new Date(),
          by: user._id,
          note: paymentMethod === 'COD' ? 'Order placed (Cash on Delivery)' : 'Awaiting payment',
        },
      ],
      stockReserved: true,
      customerNote: String(customerNote || '').slice(0, 500),
    });

    if (couponDoc) {
      await couponService.redeemCoupon({
        couponId: couponDoc._id,
        userId: user._id,
        orderId: order._id,
        amount: couponData.discountAmount,
      });
    }

    if (paymentMethod === 'COD') {
      inventoryService.recordSales(reservationLines).catch(() => {});
    }

    logger.info('Order created', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      userId: user._id.toString(),
      method: paymentMethod,
      total: pricing.grandTotal,
    });

    return order;
  } catch (err) {
    // Persistence failed after stock was taken — give it straight back.
    await inventoryService.releaseMany(reservationLines);
    logger.error('Order persistence failed; stock released', { message: err.message });
    throw err;
  }
}

/** Restores stock exactly once, guarded by the `stockRestored` flag. */
async function restoreStockOnce(order) {
  if (!order.stockReserved || order.stockRestored) return false;

  // Atomically claim the right to restore, so two concurrent cancellations
  // (e.g. customer click + webhook) cannot both credit stock.
  const claim = await Order.updateOne(
    { _id: order._id, stockRestored: false },
    { $set: { stockRestored: true } }
  );
  if (claim.modifiedCount !== 1) return false;

  await inventoryService.releaseMany(
    order.items.map((i) => ({ productId: i.product, variantId: i.variantId, qty: i.qty }))
  );
  order.stockRestored = true;
  return true;
}

/**
 * Cancels an order and returns its stock.
 *
 * Customers may cancel only their own orders, only before dispatch, and only
 * inside the configured window. Admins are exempt from the window.
 */
async function cancelOrder({ order, actor, reason = '', isAdmin = false }) {
  // `order.user` may be a populated document or a raw ObjectId depending on the
  // caller, so normalise before comparing — stringifying a populated document
  // yields the whole object and would make every ownership check fail.
  const ownerId = order.user?._id ? order.user._id.toString() : order.user.toString();

  if (!isAdmin && ownerId !== actor._id.toString()) {
    throw ApiError.forbidden('You cannot cancel this order.');
  }

  if (['cancelled', 'refunded'].includes(order.status)) {
    throw ApiError.badRequest('This order has already been cancelled.');
  }
  if (order.status === 'delivered') {
    throw ApiError.badRequest(
      'Delivered orders cannot be cancelled. Please start a return instead.',
      { code: 'ORDER_DELIVERED' }
    );
  }
  if (!isAdmin && !['pending', 'confirmed'].includes(order.status)) {
    throw ApiError.badRequest(
      'This order has already been packed and can no longer be cancelled online. Please contact us.',
      { code: 'ORDER_IN_FULFILMENT' }
    );
  }

  if (!isAdmin && config.store.orderCancelWindowHours > 0) {
    const ageHours = (Date.now() - new Date(order.createdAt).getTime()) / 36e5;
    if (ageHours > config.store.orderCancelWindowHours) {
      throw ApiError.badRequest(
        `Orders can be cancelled online within ${config.store.orderCancelWindowHours} hours of being placed. Please contact us for help.`,
        { code: 'CANCEL_WINDOW_EXPIRED' }
      );
    }
  }

  await restoreStockOnce(order);
  await couponService.releaseCoupon({ couponId: order.coupon?.couponId, orderId: order._id });

  order.status = 'cancelled';
  order.cancellation = {
    reason: String(reason || '').slice(0, 300) || (isAdmin ? 'Cancelled by store' : 'Cancelled by customer'),
    at: new Date(),
    by: actor._id,
  };
  order.statusHistory.push({
    status: 'cancelled',
    at: new Date(),
    by: actor._id,
    note: order.cancellation.reason,
  });

  // A paid order that is cancelled owes the customer money.
  if (order.payment.status === 'paid') {
    order.refund.status = 'pending';
    order.refund.amount = order.pricing.grandTotal;
    order.refund.reason = 'Order cancelled';
  }

  await order.save();

  logger.info('Order cancelled', {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    byAdmin: isAdmin,
  });

  return order;
}

/** Advances an order through the fulfilment lifecycle, rejecting illegal jumps. */
async function updateOrderStatus({ order, nextStatus, actor, note = '', trackingNumber }) {
  if (!Order.STATUSES.includes(nextStatus)) {
    throw ApiError.badRequest('Unknown order status.');
  }
  if (order.status === nextStatus) {
    throw ApiError.badRequest(`This order is already marked as ${nextStatus}.`);
  }
  if (!Order.canTransition(order.status, nextStatus)) {
    throw ApiError.badRequest(
      `An order cannot move from "${order.status}" to "${nextStatus}".`,
      { code: 'INVALID_STATUS_TRANSITION' }
    );
  }

  if (nextStatus === 'cancelled') {
    return cancelOrder({ order, actor, reason: note, isAdmin: true });
  }

  order.status = nextStatus;

  if (nextStatus === 'shipped') {
    order.shippedAt = new Date();
    if (typeof trackingNumber === 'string') order.trackingNumber = trackingNumber.trim().slice(0, 80);
  }
  if (nextStatus === 'delivered') {
    order.deliveredAt = new Date();
    // Cash collected on the doorstep settles the payment.
    if (order.payment.method === 'COD' && order.payment.status === 'pending') {
      order.payment.status = 'paid';
      order.payment.paidAt = new Date();
    }
  }
  if (nextStatus === 'refunded') {
    await restoreStockOnce(order);
    order.refund.status = 'processed';
    order.refund.at = new Date();
    if (!order.refund.amount) order.refund.amount = order.pricing.grandTotal;
    order.payment.status = 'refunded';
  }

  order.statusHistory.push({
    status: nextStatus,
    at: new Date(),
    by: actor._id,
    note: String(note || '').slice(0, 300),
  });

  await order.save();
  return order;
}

/**
 * Releases stock held by online orders that were never paid for.
 *
 * Without this, an abandoned Razorpay checkout would hold inventory hostage
 * indefinitely. Run periodically by the server.
 */
async function expireStalePendingPayments({ olderThanMinutes = 45 } = {}) {
  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);

  const stale = await Order.find({
    status: 'pending',
    'payment.method': 'RAZORPAY',
    'payment.status': 'pending',
    stockReserved: true,
    stockRestored: false,
    createdAt: { $lt: cutoff },
  }).limit(100);

  let expired = 0;
  for (const order of stale) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await restoreStockOnce(order);
      // eslint-disable-next-line no-await-in-loop
      await couponService.releaseCoupon({ couponId: order.coupon?.couponId, orderId: order._id });

      order.status = 'cancelled';
      order.payment.status = 'failed';
      order.payment.failureReason = 'Payment not completed';
      order.cancellation = { reason: 'Payment not completed in time', at: new Date(), by: null };
      order.statusHistory.push({
        status: 'cancelled',
        at: new Date(),
        note: 'Automatically cancelled — payment not completed',
      });
      // eslint-disable-next-line no-await-in-loop
      await order.save();
      expired += 1;
    } catch (err) {
      logger.error('Failed to expire stale order', {
        orderId: order._id.toString(),
        message: err.message,
      });
    }
  }

  if (expired > 0) logger.info('Expired unpaid orders', { count: expired });
  return expired;
}

module.exports = {
  normaliseRequestedItems,
  buildOrderLines,
  previewCart,
  createOrder,
  cancelOrder,
  updateOrderStatus,
  restoreStockOnce,
  expireStalePendingPayments,
  resolveShippingAddress,
  MAX_QTY_PER_ITEM,
};
