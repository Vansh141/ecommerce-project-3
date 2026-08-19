const crypto = require('crypto');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const logger = require('../utils/logger');
const { toPaise } = require('../utils/money');
const Order = require('../models/Order');
const inventoryService = require('./inventoryService');

/**
 * Razorpay integration.
 *
 * The governing rule: the browser's word that a payment succeeded is worth
 * nothing. An order is only ever marked paid after either
 *   (a) an HMAC signature computed here from our own key secret matches, or
 *   (b) a webhook whose signature over the *raw* request body matches.
 * The client-supplied `razorpay_payment_id` alone never settles anything.
 */

let razorpayClient = null;

if (config.razorpay.enabled) {
  // eslint-disable-next-line global-require
  const Razorpay = require('razorpay');
  razorpayClient = new Razorpay({
    key_id: config.razorpay.keyId,
    key_secret: config.razorpay.keySecret,
  });
  logger.info('Razorpay payments enabled');
} else {
  logger.warn('Razorpay is not configured — online payment is disabled (COD only)');
}

function assertEnabled() {
  if (!razorpayClient) {
    throw ApiError.serviceUnavailable(
      'Online payment is not available at the moment. Please choose Cash on Delivery.',
      { code: 'PAYMENT_PROVIDER_UNAVAILABLE' }
    );
  }
}

/**
 * Constant-time comparison. A plain `===` on a signature leaks, through timing,
 * how many leading bytes were correct — enough to forge one byte at a time.
 */
function safeCompare(a, b) {
  const bufA = Buffer.from(String(a), 'utf8');
  const bufB = Buffer.from(String(b), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Creates the provider-side order and records its id against ours. */
async function createPaymentOrder(order) {
  assertEnabled();

  if (order.payment.status === 'paid') {
    throw ApiError.badRequest('This order has already been paid for.');
  }
  if (order.payment.method !== 'RAZORPAY') {
    throw ApiError.badRequest('This order is not set up for online payment.');
  }
  if (['cancelled', 'refunded'].includes(order.status)) {
    throw ApiError.badRequest('This order is no longer payable.');
  }

  // The amount comes from the persisted order, never from the request body.
  const amountInPaise = toPaise(order.pricing.grandTotal);

  const rzpOrder = await razorpayClient.orders.create({
    amount: amountInPaise,
    currency: order.pricing.currency || 'INR',
    receipt: order.orderNumber,
    notes: { orderId: order._id.toString(), orderNumber: order.orderNumber },
  });

  order.payment.razorpayOrderId = rzpOrder.id;
  order.payment.amount = order.pricing.grandTotal;
  await order.save();

  return {
    razorpayOrderId: rzpOrder.id,
    amount: amountInPaise,
    currency: rzpOrder.currency,
    keyId: config.razorpay.keyId, // publishable key — safe to expose
    orderNumber: order.orderNumber,
  };
}

/**
 * Verifies the checkout callback signature.
 * HMAC-SHA256 over "<razorpay_order_id>|<razorpay_payment_id>" keyed with our
 * secret — a value only Razorpay and this server can produce.
 */
function verifyCheckoutSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  assertEnabled();

  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    throw ApiError.badRequest('Incomplete payment confirmation.', { code: 'PAYMENT_INCOMPLETE' });
  }

  const expected = crypto
    .createHmac('sha256', config.razorpay.keySecret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  return safeCompare(expected, razorpaySignature);
}

/**
 * Confirms payment for an order after signature verification.
 * Idempotent: replaying a valid callback does not double-confirm.
 */
async function confirmPayment({ order, razorpayPaymentId, razorpaySignature, actorId = null }) {
  if (order.payment.status === 'paid') return order; // already settled

  const valid = verifyCheckoutSignature({
    razorpayOrderId: order.payment.razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
  });

  if (!valid) {
    order.payment.status = 'failed';
    order.payment.failureReason = 'Signature verification failed';
    await order.save();

    logger.error('Payment signature verification FAILED', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
      razorpayPaymentId,
    });

    throw ApiError.badRequest('Payment could not be verified. You have not been charged.', {
      code: 'PAYMENT_VERIFICATION_FAILED',
    });
  }

  order.payment.status = 'paid';
  order.payment.razorpayPaymentId = razorpayPaymentId;
  order.payment.razorpaySignature = razorpaySignature;
  order.payment.paidAt = new Date();
  order.payment.failureReason = null;

  if (order.status === 'pending') {
    order.status = 'confirmed';
    order.statusHistory.push({
      status: 'confirmed',
      at: new Date(),
      by: actorId,
      note: 'Payment verified',
    });
  }

  await order.save();

  inventoryService
    .recordSales(order.items.map((i) => ({ productId: i.product, qty: i.qty })))
    .catch(() => {});

  logger.info('Payment confirmed', {
    orderId: order._id.toString(),
    orderNumber: order.orderNumber,
    amount: order.pricing.grandTotal,
  });

  return order;
}

/**
 * Verifies a webhook signature over the RAW request body.
 *
 * Re-serialising a parsed body changes byte order and whitespace and would
 * make every signature fail, so the webhook route must be mounted with a raw
 * body parser ahead of express.json().
 */
function verifyWebhookSignature(rawBody, signature) {
  if (!config.razorpay.webhookEnabled) return false;
  if (!Buffer.isBuffer(rawBody) || !signature) return false;

  const expected = crypto
    .createHmac('sha256', config.razorpay.webhookSecret)
    .update(rawBody)
    .digest('hex');

  return safeCompare(expected, signature);
}

/**
 * Applies a verified webhook event.
 * Acts as the safety net when a customer closes the tab before the browser
 * callback reaches us.
 */
async function handleWebhookEvent(event) {
  const type = event?.event;
  const entity = event?.payload?.payment?.entity;
  if (!type || !entity) return { handled: false, reason: 'Unrecognised payload' };

  const razorpayOrderId = entity.order_id;
  if (!razorpayOrderId) return { handled: false, reason: 'No order reference' };

  const order = await Order.findOne({ 'payment.razorpayOrderId': razorpayOrderId });
  if (!order) return { handled: false, reason: 'Order not found' };

  if (type === 'payment.captured') {
    if (order.payment.status === 'paid') return { handled: true, idempotent: true };

    order.payment.status = 'paid';
    order.payment.razorpayPaymentId = entity.id;
    order.payment.paidAt = new Date();
    order.payment.failureReason = null;

    if (order.status === 'pending') {
      order.status = 'confirmed';
      order.statusHistory.push({
        status: 'confirmed',
        at: new Date(),
        note: 'Payment captured (webhook)',
      });
    }
    await order.save();

    logger.info('Payment captured via webhook', {
      orderId: order._id.toString(),
      orderNumber: order.orderNumber,
    });
    return { handled: true, orderId: order._id.toString() };
  }

  if (type === 'payment.failed') {
    if (order.payment.status !== 'paid') {
      order.payment.status = 'failed';
      order.payment.failureReason = entity.error_description || 'Payment failed';
      await order.save();
    }
    return { handled: true, orderId: order._id.toString() };
  }

  return { handled: false, reason: `Unhandled event: ${type}` };
}

/** Issues a refund through Razorpay for an online-paid order. */
async function refundPayment({ order, amount, reason = 'Customer refund' }) {
  assertEnabled();

  if (order.payment.method !== 'RAZORPAY' || !order.payment.razorpayPaymentId) {
    throw ApiError.badRequest('This order has no online payment to refund.');
  }
  if (order.payment.status !== 'paid') {
    throw ApiError.badRequest('This order is not in a refundable payment state.');
  }

  const refundAmount = amount ?? order.pricing.grandTotal;
  if (refundAmount <= 0 || refundAmount > order.pricing.grandTotal) {
    throw ApiError.badRequest('Invalid refund amount.');
  }

  const refund = await razorpayClient.payments.refund(order.payment.razorpayPaymentId, {
    amount: toPaise(refundAmount),
    notes: { orderNumber: order.orderNumber, reason },
  });

  const isFull = refundAmount >= order.pricing.grandTotal;
  order.payment.status = isFull ? 'refunded' : 'partially_refunded';
  order.refund = {
    amount: refundAmount,
    refundId: refund.id,
    status: 'processed',
    at: new Date(),
    reason,
  };
  await order.save();

  logger.info('Refund issued', {
    orderId: order._id.toString(),
    refundId: refund.id,
    amount: refundAmount,
  });

  return order;
}

module.exports = {
  createPaymentOrder,
  verifyCheckoutSignature,
  confirmPayment,
  verifyWebhookSignature,
  handleWebhookEvent,
  refundPayment,
  isEnabled: () => Boolean(razorpayClient),
  publicKeyId: () => (razorpayClient ? config.razorpay.keyId : null),
};
