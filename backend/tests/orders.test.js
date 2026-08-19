const {
  app, request, createUser, createAdmin, createProduct, asUser, itemFor, VALID_ADDRESS,
} = require('./helpers');
const Product = require('../models/Product');
const Order = require('../models/Order');

/** Reads live stock for one variant straight from the database. */
async function stockOf(productId, size) {
  const p = await Product.findById(productId).lean();
  return p.variants.find((v) => v.size === size).stock;
}

describe('Order creation — price and quantity integrity', () => {
  it('creates an order and computes totals server-side', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 1000, mrp: 1500, stock: 10 });

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product, { size: 'M', qty: 2 })],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.pricing.itemsTotal).toBe(2000);
    // 2000 >= free-shipping threshold of 1499
    expect(res.body.data.order.pricing.shippingTotal).toBe(0);
    expect(res.body.data.order.pricing.grandTotal).toBe(2000);
  });

  it('IGNORES client-supplied prices and totals', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 5000, stock: 5 });

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [{ ...itemFor(product, { size: 'M', qty: 1 }), price: 1, lineTotal: 1, mrp: 1 }],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
        itemsPrice: 1,
        taxPrice: 0,
        shippingPrice: 0,
        totalPrice: 1,
        pricing: { grandTotal: 1 },
      });

    expect(res.status).toBe(201);
    // The DB price wins, not the "1" the client claimed.
    expect(res.body.data.order.pricing.itemsTotal).toBe(5000);
    expect(res.body.data.order.pricing.grandTotal).toBe(5000);
  });

  it('REJECTS a negative quantity', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 1000, stock: 10 });
    const before = await stockOf(product._id, 'M');

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product, { size: 'M', qty: -5 })],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    expect(res.status).toBe(400);
    // Stock must be untouched — the old code *credited* stock for negative qty.
    expect(await stockOf(product._id, 'M')).toBe(before);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('REJECTS a zero and a fractional quantity', async () => {
    const { token } = await createUser();
    const product = await createProduct({ stock: 10 });

    for (const qty of [0, 1.5, Number.NaN, '2; DROP', null]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await asUser(token)
        .post('/api/orders')
        .send({
          items: [itemFor(product, { size: 'M', qty })],
          shippingAddress: VALID_ADDRESS,
          paymentMethod: 'COD',
        });
      expect(res.status).toBe(400);
    }
    expect(await Order.countDocuments()).toBe(0);
  });

  it('MERGES duplicate lines for the same variant instead of checking each separately', async () => {
    const { token } = await createUser();
    // Only 5 in stock. Two lines of 4 each = 8 requested.
    const product = await createProduct({ price: 500, stock: 5 });
    const item = itemFor(product, { size: 'M', qty: 4 });

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [item, { ...item }],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    // Merged to 8, which exceeds stock — must be refused outright.
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(await stockOf(product._id, 'M')).toBe(5);
    expect(await Order.countDocuments()).toBe(0);
  });

  it('merges duplicate lines that together stay within stock', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 500, stock: 10 });
    const item = itemFor(product, { size: 'M', qty: 2 });

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [item, { ...item }],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    expect(res.status).toBe(201);
    const order = await Order.findOne();
    expect(order.items).toHaveLength(1);
    expect(order.items[0].qty).toBe(4);
    expect(await stockOf(product._id, 'M')).toBe(6);
  });

  it('enforces the per-item quantity cap', async () => {
    const { token } = await createUser();
    const product = await createProduct({ stock: 100 });

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product, { size: 'M', qty: 50 })],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('QUANTITY_LIMIT');
  });

  it('refuses to order more than the stock on hand', async () => {
    const { token } = await createUser();
    const product = await createProduct({ stock: 2 });

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product, { size: 'M', qty: 3 })],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('INSUFFICIENT_STOCK');
  });

  it('rejects an unknown payment method', async () => {
    const { token } = await createUser();
    const product = await createProduct();

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product)],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'FREE_MONEY',
      });

    expect(res.status).toBe(400);
  });

  it('rejects RAZORPAY when the provider is not configured', async () => {
    const { token } = await createUser();
    const product = await createProduct();

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product)],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'RAZORPAY',
      });

    // No fake success path: without keys, online payment is simply unavailable.
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('PAYMENT_PROVIDER_UNAVAILABLE');
  });

  it('refuses to order a draft or archived product', async () => {
    const { token } = await createUser();
    const draft = await createProduct({ status: 'draft' });

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(draft)],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('PRODUCT_UNAVAILABLE');
  });

  it('applies the shipping fee below the free-shipping threshold', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 500, stock: 10 });

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product, { size: 'M', qty: 1 })],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    expect(res.body.data.order.pricing.shippingTotal).toBe(79);
    expect(res.body.data.order.pricing.grandTotal).toBe(579);
  });

  it('reports tax as a component of a tax-inclusive price, not an addition', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 2100, stock: 5 });

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product, { size: 'M', qty: 1 })],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    const { pricing } = res.body.data.order;
    expect(pricing.grandTotal).toBe(2100); // tax NOT added on top
    expect(pricing.taxTotal).toBeCloseTo(100, 0); // 2100 - 2100/1.05
  });
});

describe('Stock reservation', () => {
  it('decrements stock atomically on order', async () => {
    const { token } = await createUser();
    const product = await createProduct({ stock: 10 });

    await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product, { size: 'M', qty: 3 })],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    expect(await stockOf(product._id, 'M')).toBe(7);
    // Other sizes must be untouched.
    expect(await stockOf(product._id, 'S')).toBe(10);
  });

  it('keeps totalStock consistent with the variant array', async () => {
    const { token } = await createUser();
    const product = await createProduct({ stock: 10 }); // 3 variants × 10 = 30

    await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product, { size: 'M', qty: 4 })],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    const updated = await Product.findById(product._id).lean();
    const sum = updated.variants.reduce((a, v) => a + v.stock, 0);
    expect(updated.totalStock).toBe(sum);
    expect(updated.totalStock).toBe(26);
  });

  it('does not oversell under concurrent checkout', async () => {
    // The real test of atomicity: 6 shoppers race for 5 units.
    const product = await createProduct({ stock: 5, price: 100 });
    const buyers = await Promise.all(Array.from({ length: 6 }, () => createUser()));

    const results = await Promise.all(
      buyers.map(({ token }) =>
        asUser(token)
          .post('/api/orders')
          .send({
            items: [itemFor(product, { size: 'M', qty: 1 })],
            shippingAddress: VALID_ADDRESS,
            paymentMethod: 'COD',
          })
      )
    );

    const succeeded = results.filter((r) => r.status === 201).length;
    const remaining = await stockOf(product._id, 'M');

    expect(succeeded).toBeLessThanOrEqual(5);
    expect(remaining).toBeGreaterThanOrEqual(0);
    expect(succeeded + remaining).toBe(5); // nothing created, nothing lost
  });

  it('rolls back every reservation when one line in the basket fails', async () => {
    const { token } = await createUser();
    const plentiful = await createProduct({ stock: 10 });
    const scarce = await createProduct({ stock: 1 });

    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [
          itemFor(plentiful, { size: 'M', qty: 2 }),
          itemFor(scarce, { size: 'M', qty: 5 }),
        ],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    expect(res.status).toBeGreaterThanOrEqual(400);
    // The first product must not be left short.
    expect(await stockOf(plentiful._id, 'M')).toBe(10);
    expect(await stockOf(scarce._id, 'M')).toBe(1);
  });
});

describe('Order access control', () => {
  it('prevents one customer from reading another customer order (IDOR)', async () => {
    const alice = await createUser();
    const bob = await createUser();
    const product = await createProduct();

    const created = await asUser(alice.token)
      .post('/api/orders')
      .send({
        items: [itemFor(product)],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    const orderId = created.body.data.order._id;

    const own = await asUser(alice.token).get(`/api/orders/${orderId}`);
    expect(own.status).toBe(200);

    const other = await asUser(bob.token).get(`/api/orders/${orderId}`);
    // 404 rather than 403 — it does not even confirm the order exists.
    expect(other.status).toBe(404);
  });

  it('lets an admin read any order', async () => {
    const customer = await createUser();
    const admin = await createAdmin();
    const product = await createProduct();

    const created = await asUser(customer.token)
      .post('/api/orders')
      .send({
        items: [itemFor(product)],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });

    const res = await asUser(admin.token).get(`/api/orders/${created.body.data.order._id}`);
    expect(res.status).toBe(200);
  });

  it('only lists the caller own orders', async () => {
    const alice = await createUser();
    const bob = await createUser();
    const product = await createProduct({ stock: 20 });

    await asUser(alice.token).post('/api/orders').send({
      items: [itemFor(product)], shippingAddress: VALID_ADDRESS, paymentMethod: 'COD',
    });
    await asUser(bob.token).post('/api/orders').send({
      items: [itemFor(product)], shippingAddress: VALID_ADDRESS, paymentMethod: 'COD',
    });

    const res = await asUser(alice.token).get('/api/orders/mine');
    expect(res.status).toBe(200);
    expect(res.body.data.orders).toHaveLength(1);
  });
});

describe('Order cancellation', () => {
  async function placeOrder(token, product, qty = 2) {
    const res = await asUser(token)
      .post('/api/orders')
      .send({
        items: [itemFor(product, { size: 'M', qty })],
        shippingAddress: VALID_ADDRESS,
        paymentMethod: 'COD',
      });
    return res.body.data.order._id;
  }

  it('restores stock on cancellation', async () => {
    const { token } = await createUser();
    const product = await createProduct({ stock: 10 });
    const orderId = await placeOrder(token, product, 3);

    expect(await stockOf(product._id, 'M')).toBe(7);

    const res = await asUser(token).post(`/api/orders/${orderId}/cancel`).send({ reason: 'Changed my mind' });
    expect(res.status).toBe(200);
    expect(await stockOf(product._id, 'M')).toBe(10);
  });

  it('does not restore stock twice on a repeated cancellation', async () => {
    const { token } = await createUser();
    const product = await createProduct({ stock: 10 });
    const orderId = await placeOrder(token, product, 3);

    await asUser(token).post(`/api/orders/${orderId}/cancel`).send({});
    const second = await asUser(token).post(`/api/orders/${orderId}/cancel`).send({});

    expect(second.status).toBe(400);
    expect(await stockOf(product._id, 'M')).toBe(10); // not 13
  });

  it('refuses to cancel another customer order', async () => {
    const alice = await createUser();
    const bob = await createUser();
    const product = await createProduct({ stock: 10 });
    const orderId = await placeOrder(alice.token, product);

    const res = await asUser(bob.token).post(`/api/orders/${orderId}/cancel`).send({});
    expect(res.status).toBe(404);
  });

  it('refuses to cancel a shipped order', async () => {
    const { token } = await createUser();
    const admin = await createAdmin();
    const product = await createProduct({ stock: 10 });
    const orderId = await placeOrder(token, product);

    await asUser(admin.token).patch(`/api/orders/${orderId}/status`).send({ status: 'packed' });
    await asUser(admin.token).patch(`/api/orders/${orderId}/status`).send({ status: 'shipped' });

    const res = await asUser(token).post(`/api/orders/${orderId}/cancel`).send({});
    expect(res.status).toBe(400);
  });
});

describe('Order status transitions', () => {
  it('rejects an illegal status jump', async () => {
    const { token } = await createUser();
    const admin = await createAdmin();
    const product = await createProduct();

    const created = await asUser(token).post('/api/orders').send({
      items: [itemFor(product)], shippingAddress: VALID_ADDRESS, paymentMethod: 'COD',
    });
    const orderId = created.body.data.order._id;

    // confirmed → delivered skips packed and shipped.
    const res = await asUser(admin.token)
      .patch(`/api/orders/${orderId}/status`)
      .send({ status: 'delivered' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_STATUS_TRANSITION');
  });

  it('walks the full fulfilment path and settles a COD payment on delivery', async () => {
    const { token } = await createUser();
    const admin = await createAdmin();
    const product = await createProduct();

    const created = await asUser(token).post('/api/orders').send({
      items: [itemFor(product)], shippingAddress: VALID_ADDRESS, paymentMethod: 'COD',
    });
    const orderId = created.body.data.order._id;

    for (const status of ['packed', 'shipped', 'delivered']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await asUser(admin.token).patch(`/api/orders/${orderId}/status`).send({ status });
      expect(res.status).toBe(200);
    }

    const order = await Order.findById(orderId);
    expect(order.status).toBe('delivered');
    expect(order.payment.status).toBe('paid'); // cash collected at the door
    expect(order.statusHistory.length).toBeGreaterThanOrEqual(4);
  });

  it('refuses a customer attempt to change order status', async () => {
    const { token } = await createUser();
    const product = await createProduct();

    const created = await asUser(token).post('/api/orders').send({
      items: [itemFor(product)], shippingAddress: VALID_ADDRESS, paymentMethod: 'COD',
    });

    const res = await asUser(token)
      .patch(`/api/orders/${created.body.data.order._id}/status`)
      .send({ status: 'delivered' });

    expect(res.status).toBe(403);
  });
});

describe('Cart preview', () => {
  it('prices a bag for a signed-out shopper', async () => {
    // Priced below the ₹1499 free-shipping threshold so the shipping line is
    // actually exercised.
    const product = await createProduct({ price: 999, stock: 10 });

    // A guest must see their totals before being asked to sign in.
    const res = await request(app)
      .post('/api/orders/preview')
      .send({ items: [itemFor(product, { size: 'M', qty: 1 })] });

    expect(res.status).toBe(200);
    expect(res.body.data.pricing.itemsTotal).toBe(999);
    expect(res.body.data.pricing.shippingTotal).toBe(79);
    expect(res.body.data.pricing.grandTotal).toBe(1078);
  });

  it('matches the totals the order is created with', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 899, stock: 10 });
    const items = [itemFor(product, { size: 'M', qty: 1 })];

    const preview = await asUser(token).post('/api/orders/preview').send({ items });
    const created = await asUser(token)
      .post('/api/orders')
      .send({ items, shippingAddress: VALID_ADDRESS, paymentMethod: 'COD' });

    // The cart and the charge must never disagree.
    expect(preview.body.data.pricing.grandTotal).toBe(created.body.data.order.pricing.grandTotal);
    expect(preview.body.data.pricing.shippingTotal).toBe(created.body.data.order.pricing.shippingTotal);
  });
});
