const { app, request, createUser, createAdmin, createProduct, asUser, itemFor, VALID_ADDRESS } = require('./helpers');
const Order = require('../models/Order');

/**
 * Refund integrity.
 *
 * A refund is a movement of money. Recording one against an order that was
 * never paid for both credits stock the store still holds and books a negative
 * against revenue that was never collected — the accounts stop matching
 * reality, and nothing downstream can tell the difference.
 */
describe('POST /api/orders/:id/refund', () => {
  async function placeCodOrder() {
    const product = await createProduct({ stock: 5, price: 1000 });
    const { user, token } = await createUser();

    const res = await asUser(token)
      .post('/api/orders')
      .send({ items: [itemFor(product)], shippingAddress: VALID_ADDRESS, paymentMethod: 'COD' })
      .expect(201);

    return { product, user, token, orderId: res.body.data.order._id };
  }

  it('refuses to refund a COD order that has not been paid', async () => {
    const { orderId } = await placeCodOrder();
    const { token: adminToken } = await createAdmin();

    const res = await asUser(adminToken)
      .post(`/api/orders/${orderId}/refund`)
      .send({ reason: 'changed their mind' })
      .expect(400);

    expect(res.body.error.code).toBe('ORDER_NOT_PAID');

    const order = await Order.findById(orderId);
    expect(order.status).not.toBe('refunded');
    expect(order.payment.status).toBe('pending');
    expect(order.refund.status).toBe('none');
    expect(order.stockRestored).toBe(false);
  });

  it('records a refund once the COD order has actually been paid', async () => {
    const { orderId } = await placeCodOrder();
    const { token: adminToken } = await createAdmin();

    await asUser(adminToken).patch(`/api/payments/${orderId}/cod-paid`).send().expect(200);

    const res = await asUser(adminToken)
      .post(`/api/orders/${orderId}/refund`)
      .send({ reason: 'returned unworn' })
      .expect(200);

    expect(res.body.data.order.status).toBe('refunded');
    expect(res.body.data.order.payment.status).toBe('refunded');
    expect(res.body.data.order.refund.status).toBe('processed');
  });

  it('rejects a refund larger than the order total', async () => {
    const { orderId } = await placeCodOrder();
    const { token: adminToken } = await createAdmin();

    await asUser(adminToken).patch(`/api/payments/${orderId}/cod-paid`).send().expect(200);

    const order = await Order.findById(orderId);

    await asUser(adminToken)
      .post(`/api/orders/${orderId}/refund`)
      .send({ amount: order.pricing.grandTotal + 1000 })
      .expect(400);
  });

  it('rejects a zero or negative refund amount', async () => {
    const { orderId } = await placeCodOrder();
    const { token: adminToken } = await createAdmin();

    await asUser(adminToken).patch(`/api/payments/${orderId}/cod-paid`).send().expect(200);

    await asUser(adminToken).post(`/api/orders/${orderId}/refund`).send({ amount: 0 }).expect(400);
  });

  it('is admin-only', async () => {
    const { orderId, token } = await placeCodOrder();

    await asUser(token).post(`/api/orders/${orderId}/refund`).send({}).expect(403);
    await request(app).post(`/api/orders/${orderId}/refund`).send({}).expect(401);
  });
});
