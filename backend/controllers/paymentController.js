const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const config = require('../config/env');
const { sendSuccess } = require('../utils/apiResponse');
const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');
const { loadOwnedOrder } = require('./orderController');

// ── GET /api/payments/config ─────────────────────────────────────────────────
/**
 * Tells the client which payment methods are actually live.
 *
 * Only the publishable key id is exposed; the key secret never leaves the
 * server. When Razorpay is unconfigured the UI hides online payment rather
 * than offering a button that cannot work.
 */
const getPaymentConfig = asyncHandler(async (_req, res) =>
  sendSuccess(res, {
    razorpay: { enabled: paymentService.isEnabled(), keyId: paymentService.publicKeyId() },
    cod: { enabled: config.store.codEnabled, maxOrderValue: config.store.codMaxOrderValue },
    currency: config.store.currency,
  })
);

// ── POST /api/payments/:orderId/create ───────────────────────────────────────
const createPaymentOrder = asyncHandler(async (req, res) => {
  const order = await loadOwnedOrder(req.params.orderId, req.user);

  // Only the owner may initiate payment; admins have no reason to pay for
  // someone else's order, so the admin bypass in loadOwnedOrder is closed here.
  if (order.user._id.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You cannot pay for this order.');
  }

  const paymentOrder = await paymentService.createPaymentOrder(order);
  return sendSuccess(res, paymentOrder);
});

// ── POST /api/payments/:orderId/verify ───────────────────────────────────────
/**
 * Verifies the browser callback.
 *
 * The client sends the ids and signature it received from Razorpay's widget;
 * we recompute the HMAC with our own key secret and only mark the order paid
 * if it matches. A forged "payment succeeded" call fails here.
 */
const verifyPayment = asyncHandler(async (req, res) => {
  const order = await loadOwnedOrder(req.params.orderId, req.user);

  if (order.user._id.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden('You cannot pay for this order.');
  }

  const { razorpay_payment_id: paymentId, razorpay_signature: signature, razorpay_order_id: rzpOrderId } = req.body;

  // The order id must match the one we created; accepting a client-supplied
  // one would let an attacker present a signature from a different (cheaper)
  // order they legitimately paid for.
  if (rzpOrderId && rzpOrderId !== order.payment.razorpayOrderId) {
    logger.error('Razorpay order id mismatch during verification', {
      orderId: order._id.toString(),
      expected: order.payment.razorpayOrderId,
      received: rzpOrderId,
    });
    throw ApiError.badRequest('Payment could not be verified.', {
      code: 'PAYMENT_VERIFICATION_FAILED',
    });
  }

  const updated = await paymentService.confirmPayment({
    order,
    razorpayPaymentId: paymentId,
    razorpaySignature: signature,
    actorId: req.user._id,
  });

  const orderUrl = `${config.clientUrl}/orders/${updated._id}`;
  emailService.sendOrderConfirmation({ to: req.user.email, name: req.user.name, order: updated, orderUrl }).catch(() => {});
  emailService.sendPaymentConfirmation({ to: req.user.email, name: req.user.name, order: updated, orderUrl }).catch(() => {});

  return sendSuccess(res, {
    order: {
      _id: updated._id,
      orderNumber: updated.orderNumber,
      status: updated.status,
      payment: { method: updated.payment.method, status: updated.payment.status },
    },
    message: 'Payment verified.',
  });
});

// ── POST /api/payments/webhook ───────────────────────────────────────────────
/**
 * Razorpay webhook receiver.
 *
 * `req.body` here is a raw Buffer (the route is mounted with express.raw before
 * the JSON parser) because the signature is computed over the exact bytes
 * Razorpay sent — re-serialising parsed JSON would change them and break
 * verification.
 *
 * Always responds 200 once the signature is valid: a non-2xx makes Razorpay
 * retry, and a handler bug should not cause an infinite retry storm.
 */
const handleWebhook = asyncHandler(async (req, res) => {
  const signature = req.get('x-razorpay-signature');

  if (!paymentService.verifyWebhookSignature(req.body, signature)) {
    logger.warn('Rejected webhook with invalid signature', { ip: req.ip });
    return res.status(400).json({ success: false, error: { message: 'Invalid signature' } });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ success: false, error: { message: 'Invalid payload' } });
  }

  try {
    const result = await paymentService.handleWebhookEvent(event);
    logger.info('Webhook processed', { event: event.event, ...result });
  } catch (err) {
    logger.error('Webhook handler failed', { event: event?.event, message: err.message });
  }

  return res.status(200).json({ success: true });
});

// ── Admin: mark a COD order as paid ──────────────────────────────────────────
const markCodPaid = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.orderId);
  if (!order) throw ApiError.notFound('Order not found.');

  if (order.payment.method !== 'COD') {
    throw ApiError.badRequest('This is not a Cash on Delivery order.');
  }
  if (order.payment.status === 'paid') {
    throw ApiError.badRequest('This order is already marked as paid.');
  }

  order.payment.status = 'paid';
  order.payment.paidAt = new Date();
  await order.save();

  return sendSuccess(res, { order: order.toJSON({ virtuals: true }) });
});

module.exports = {
  getPaymentConfig,
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  markCodPaid,
};
