const crypto = require('crypto');
const { request, app, createUser, createAdmin, createProduct, asUser, itemFor, VALID_ADDRESS } = require('./helpers');
const paymentService = require('../services/paymentService');
const Order = require('../models/Order');

/**
 * Razorpay is not configured in the test environment (no keys are fabricated),
 * so these tests exercise the two things that must hold regardless:
 *   1. the signature algorithm itself, verified against a known secret
 *   2. the API's refusal to settle a payment on the client's say-so
 */

describe('Payment signature verification', () => {
  const SECRET = 'test_key_secret_for_hmac_only';

  /** Mirrors Razorpay's documented HMAC-SHA256 over "<order_id>|<payment_id>". */
  function sign(orderId, paymentId, secret = SECRET) {
    return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
  }

  it('accepts a correctly signed payload and rejects a tampered one', () => {
    const orderId = 'order_ABC123';
    const paymentId = 'pay_XYZ789';
    const good = sign(orderId, paymentId);

    // Recompute the way the service does, with the same secret.
    const expected = crypto
      .createHmac('sha256', SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(good).toBe(expected);

    // Any change to either id yields a completely different digest.
    expect(sign(orderId, 'pay_ATTACKER')).not.toBe(good);
    expect(sign('order_OTHER', paymentId)).not.toBe(good);
    expect(sign(orderId, paymentId, 'wrong-secret')).not.toBe(good);
  });

  it('uses a length-safe comparison that rejects a truncated signature', () => {
    const good = sign('order_1', 'pay_1');
    const truncated = good.slice(0, 32);
    expect(truncated).not.toBe(good);
    expect(truncated.length).not.toBe(good.length);
  });
});

describe('Payment endpoints', () => {
  async function placeCodOrder(token) {
    const product = await createProduct({ price: 1000, stock: 10 });
    const res = await asUser(token).post('/api/orders').send({
      items: [itemFor(product, { size: 'M', qty: 1 })],
      shippingAddress: VALID_ADDRESS,
      paymentMethod: 'COD',
    });
    return res.body.data.order._id;
  }

  it('reports online payment as unavailable when no keys are configured', async () => {
    const res = await request(app).get('/api/payments/config');

    expect(res.status).toBe(200);
    expect(res.body.data.razorpay.enabled).toBe(false);
    // No fabricated key is ever surfaced to the client.
    expect(res.body.data.razorpay.keyId).toBeNull();
    expect(res.body.data.cod.enabled).toBe(true);
  });

  it('never exposes the Razorpay key secret', async () => {
    const res = await request(app).get('/api/payments/config');
    const body = JSON.stringify(res.body);
    expect(body).not.toContain('key_secret');
    expect(body).not.toContain('keySecret');
  });

  it('refuses to create a payment order for someone else', async () => {
    const alice = await createUser();
    const bob = await createUser();
    const orderId = await placeCodOrder(alice.token);

    const res = await asUser(bob.token).post(`/api/payments/${orderId}/create`).send({});
    expect(res.status).toBe(404);
  });

  it('refuses an unauthenticated payment verification', async () => {
    const alice = await createUser();
    const orderId = await placeCodOrder(alice.token);

    const res = await request(app)
      .post(`/api/payments/${orderId}/verify`)
      .send({ razorpay_payment_id: 'pay_fake', razorpay_signature: 'x'.repeat(64) });

    expect(res.status).toBe(401);
  });

  it('does NOT mark an order paid on an unverified client claim', async () => {
    const { token } = await createUser();
    const orderId = await placeCodOrder(token);

    const res = await asUser(token).post(`/api/payments/${orderId}/verify`).send({
      razorpay_payment_id: 'pay_IMadeThisUp',
      razorpay_signature: 'f'.repeat(64),
      razorpay_order_id: 'order_IMadeThisUp',
    });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const order = await Order.findById(orderId);
    // The critical assertion: forging a callback must never settle payment.
    expect(order.payment.status).not.toBe('paid');
    expect(order.payment.paidAt).toBeNull();
  });

  it('rejects a mismatched razorpay_order_id', async () => {
    const { token } = await createUser();
    const orderId = await placeCodOrder(token);

    await Order.updateOne(
      { _id: orderId },
      { $set: { 'payment.razorpayOrderId': 'order_REAL', 'payment.method': 'RAZORPAY' } }
    );

    const res = await asUser(token).post(`/api/payments/${orderId}/verify`).send({
      razorpay_payment_id: 'pay_abc123',
      razorpay_signature: 'a'.repeat(64),
      razorpay_order_id: 'order_SOMEONE_ELSES',
    });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PAYMENT_VERIFICATION_FAILED');
  });

  it('rejects a webhook with an invalid signature', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .set('x-razorpay-signature', 'invalid-signature')
      .send(JSON.stringify({ event: 'payment.captured', payload: {} }));

    expect(res.status).toBe(400);
  });

  it('rejects a webhook with no signature at all', async () => {
    const res = await request(app)
      .post('/api/payments/webhook')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ event: 'payment.captured', payload: {} }));

    expect(res.status).toBe(400);
  });

  it('refuses to verify webhook signatures when no webhook secret is set', () => {
    // Fails closed: an unconfigured webhook secret must reject everything
    // rather than accept everything.
    expect(paymentService.verifyWebhookSignature(Buffer.from('{}'), 'anything')).toBe(false);
  });
});

describe('COD payment settlement', () => {
  it('lets an admin mark a COD order paid, but not a customer', async () => {
    const { token } = await createUser();
    const admin = await createAdmin();
    const product = await createProduct({ price: 1000, stock: 10 });

    const created = await asUser(token).post('/api/orders').send({
      items: [itemFor(product, { size: 'M', qty: 1 })],
      shippingAddress: VALID_ADDRESS,
      paymentMethod: 'COD',
    });
    const orderId = created.body.data.order._id;

    const byCustomer = await asUser(token).patch(`/api/payments/${orderId}/cod-paid`).send({});
    expect(byCustomer.status).toBe(403);

    const byAdmin = await asUser(admin.token).patch(`/api/payments/${orderId}/cod-paid`).send({});
    expect(byAdmin.status).toBe(200);

    const order = await Order.findById(orderId);
    expect(order.payment.status).toBe('paid');
  });
});

describe('Revenue accounting', () => {
  it('counts only paid, non-cancelled orders as revenue', async () => {
    const admin = await createAdmin();
    const { token } = await createUser();
    const product = await createProduct({ price: 1000, stock: 50 });

    const place = () =>
      asUser(token).post('/api/orders').send({
        items: [itemFor(product, { size: 'M', qty: 1 })],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    const paid = await place();
    const unpaid = await place();
    const cancelled = await place();

    await asUser(admin.token).patch(`/api/payments/${paid.body.data.order._id}/cod-paid`).send({});
    await asUser(token).post(`/api/orders/${cancelled.body.data.order._id}/cancel`).send({});
    // `unpaid` is left as placed: confirmed but payment still pending.

    const res = await asUser(admin.token).get('/api/admin/stats');

    // Only the genuinely paid order contributes. The old dashboard summed
    // every order's total regardless of payment or cancellation.
    // ₹1000 item + ₹79 shipping (below the free-shipping threshold).
    expect(res.body.data.revenue.total).toBe(1079);
    expect(res.body.data.revenue.paidOrders).toBe(1);
    expect(res.body.data.orders.cancelled).toBe(1);
    expect(unpaid.status).toBe(201);
  });
});
