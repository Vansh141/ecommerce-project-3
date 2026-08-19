const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const config = require('../config/env');
const { sendSuccess, sendCreated, paginationMeta } = require('../utils/apiResponse');
const orderService = require('../services/orderService');
const emailService = require('../services/emailService');
const paymentService = require('../services/paymentService');

/**
 * Loads an order and enforces ownership.
 *
 * Every single-order endpoint routes through here, which is what prevents an
 * IDOR: guessing another customer's order id yields 404, not their data.
 * A 404 (rather than 403) also avoids confirming that the id exists at all.
 */
async function loadOwnedOrder(orderId, user) {
  const order = await Order.findById(orderId).populate('user', 'name email');
  if (!order) throw ApiError.notFound('Order not found.');

  const ownerId = order.user?._id ? order.user._id.toString() : order.user.toString();
  if (user.role !== 'admin' && ownerId !== user._id.toString()) {
    throw ApiError.notFound('Order not found.');
  }
  return order;
}

// ── POST /api/orders/preview ─────────────────────────────────────────────────
/**
 * Prices a basket without creating anything, using the exact same code path as
 * order creation — so the cart total and the charged total cannot diverge.
 */
const previewOrder = asyncHandler(async (req, res) => {
  const preview = await orderService.previewCart({
    items: req.body.items,
    couponCode: req.body.couponCode || null,
    userId: req.user?._id || null,
  });
  return sendSuccess(res, preview);
});

// ── POST /api/orders ─────────────────────────────────────────────────────────
const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder({
    user: req.user,
    items: req.body.items,
    addressId: req.body.addressId || null,
    shippingAddress: req.body.shippingAddress || null,
    paymentMethod: req.body.paymentMethod,
    couponCode: req.body.couponCode || null,
    customerNote: req.body.customerNote || '',
  });

  // COD is confirmed at once, so the receipt goes out immediately. Online
  // orders wait for payment verification before we promise anything.
  if (order.payment.method === 'COD') {
    emailService
      .sendOrderConfirmation({
        to: req.user.email,
        name: req.user.name,
        order,
        orderUrl: `${config.clientUrl}/orders/${order._id}`,
      })
      .catch(() => {});
  }

  return sendCreated(res, {
    order: {
      _id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
      payment: { method: order.payment.method, status: order.payment.status },
      pricing: order.pricing,
      createdAt: order.createdAt,
    },
    requiresPayment: order.payment.method === 'RAZORPAY',
  });
});

// ── GET /api/orders/mine ─────────────────────────────────────────────────────
const listMyOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 10, 50);

  const filter = { user: req.user._id };
  if (req.query.status && Order.STATUSES.includes(req.query.status)) {
    filter.status = req.query.status;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean({ virtuals: true }),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, { orders }, { meta: paginationMeta({ page, limit, total }) });
});

// ── GET /api/orders/:id ──────────────────────────────────────────────────────
const getOrder = asyncHandler(async (req, res) => {
  const order = await loadOwnedOrder(req.params.id, req.user);
  return sendSuccess(res, { order: order.toJSON({ virtuals: true }) });
});

// ── POST /api/orders/:id/cancel ──────────────────────────────────────────────
const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await loadOwnedOrder(req.params.id, req.user);

  const updated = await orderService.cancelOrder({
    order,
    actor: req.user,
    reason: req.body.reason || '',
    isAdmin: false,
  });

  emailService
    .sendOrderCancelled({
      to: req.user.email,
      name: req.user.name,
      order: updated,
      reason: updated.cancellation.reason,
    })
    .catch(() => {});

  return sendSuccess(res, {
    order: updated.toJSON({ virtuals: true }),
    message: 'Your order has been cancelled.',
  });
});

// ── Admin: GET /api/orders ───────────────────────────────────────────────────
const listAllOrders = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 20, 60);

  const filter = {};
  if (req.query.status && Order.STATUSES.includes(req.query.status)) filter.status = req.query.status;
  if (req.query.paymentStatus && Order.PAYMENT_STATUSES.includes(req.query.paymentStatus)) {
    filter['payment.status'] = req.query.paymentStatus;
  }
  if (req.query.paymentMethod && Order.PAYMENT_METHODS.includes(req.query.paymentMethod)) {
    filter['payment.method'] = req.query.paymentMethod;
  }

  // Order number is an exact, indexed lookup — no regex scan over the collection.
  if (req.query.search) {
    const term = String(req.query.search).trim().toUpperCase().slice(0, 40);
    if (term) filter.orderNumber = term;
  }

  if (req.query.from || req.query.to) {
    filter.createdAt = {};
    const from = new Date(req.query.from);
    const to = new Date(req.query.to);
    if (!Number.isNaN(from.getTime())) filter.createdAt.$gte = from;
    if (!Number.isNaN(to.getTime())) filter.createdAt.$lte = to;
    if (Object.keys(filter.createdAt).length === 0) delete filter.createdAt;
  }

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean({ virtuals: true }),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, { orders }, { meta: paginationMeta({ page, limit, total }) });
});

// ── Admin: PATCH /api/orders/:id/status ──────────────────────────────────────
const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw ApiError.notFound('Order not found.');

  const updated = await orderService.updateOrderStatus({
    order,
    nextStatus: req.body.status,
    actor: req.user,
    note: req.body.note || '',
    trackingNumber: req.body.trackingNumber,
  });

  const customer = updated.user;
  const orderUrl = `${config.clientUrl}/orders/${updated._id}`;

  if (customer?.email) {
    if (updated.status === 'shipped') {
      emailService.sendOrderShipped({ to: customer.email, name: customer.name, order: updated, orderUrl }).catch(() => {});
    } else if (updated.status === 'delivered') {
      emailService.sendOrderDelivered({ to: customer.email, name: customer.name, order: updated, orderUrl }).catch(() => {});
    } else if (updated.status === 'cancelled') {
      emailService.sendOrderCancelled({ to: customer.email, name: customer.name, order: updated, reason: updated.cancellation?.reason }).catch(() => {});
    }
  }

  return sendSuccess(res, { order: updated.toJSON({ virtuals: true }) });
});

// ── Admin: POST /api/orders/:id/refund ───────────────────────────────────────
const refundOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) throw ApiError.notFound('Order not found.');

  if (order.payment.method === 'COD') {
    // Nothing was ever charged online, so record the refund without calling
    // the gateway — the money moves outside the system.
    order.payment.status = 'refunded';
    order.status = 'refunded';
    order.refund = {
      amount: req.body.amount ?? order.pricing.grandTotal,
      refundId: null,
      status: 'processed',
      at: new Date(),
      reason: req.body.reason || 'Manual refund',
    };
    order.statusHistory.push({
      status: 'refunded',
      at: new Date(),
      by: req.user._id,
      note: 'Manual (COD) refund recorded',
    });
    await orderService.restoreStockOnce(order);
    await order.save();
    return sendSuccess(res, { order: order.toJSON({ virtuals: true }) });
  }

  const updated = await paymentService.refundPayment({
    order,
    amount: req.body.amount,
    reason: req.body.reason || 'Refund issued by store',
  });

  updated.status = 'refunded';
  updated.statusHistory.push({
    status: 'refunded',
    at: new Date(),
    by: req.user._id,
    note: req.body.reason || 'Refund issued',
  });
  await orderService.restoreStockOnce(updated);
  await updated.save();

  return sendSuccess(res, { order: updated.toJSON({ virtuals: true }) });
});

module.exports = {
  previewOrder,
  createOrder,
  listMyOrders,
  getOrder,
  cancelMyOrder,
  listAllOrders,
  updateOrderStatus,
  refundOrder,
  loadOwnedOrder,
};
