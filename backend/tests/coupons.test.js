const {
  createUser, createAdmin, createProduct, asUser, itemFor, VALID_ADDRESS,
} = require('./helpers');
const Coupon = require('../models/Coupon');
const Order = require('../models/Order');

const future = (days = 30) => new Date(Date.now() + days * 86_400_000);
const past = (days = 1) => new Date(Date.now() - days * 86_400_000);

async function makeCoupon(overrides = {}) {
  return Coupon.create({
    code: overrides.code || 'SAVE10',
    discountType: 'percentage',
    discountValue: 10,
    expiresAt: future(),
    isActive: true,
    ...overrides,
  });
}

describe('Coupon validation', () => {
  it('applies a percentage discount computed server-side', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 1000, stock: 10 });
    await makeCoupon({ code: 'SAVE10', discountType: 'percentage', discountValue: 10 });

    const res = await asUser(token)
      .post('/api/coupons/validate')
      .send({ code: 'SAVE10', items: [itemFor(product, { size: 'M', qty: 2 })] });

    expect(res.status).toBe(200);
    expect(res.body.data.coupon.discountAmount).toBe(200); // 10% of 2000
    expect(res.body.data.pricing.grandTotal).toBe(1800);
  });

  it('caps a percentage discount at maxDiscountAmount', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 5000, stock: 10 });
    await makeCoupon({ code: 'BIG50', discountValue: 50, maxDiscountAmount: 500 });

    const res = await asUser(token)
      .post('/api/coupons/validate')
      .send({ code: 'BIG50', items: [itemFor(product, { size: 'M', qty: 1 })] });

    // 50% of 5000 is 2500, but the cap is 500.
    expect(res.body.data.coupon.discountAmount).toBe(500);
  });

  it('never discounts more than the basket is worth', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 200, stock: 10 });
    await makeCoupon({ code: 'FLAT9999', discountType: 'fixed', discountValue: 9999 });

    const res = await asUser(token)
      .post('/api/coupons/validate')
      .send({ code: 'FLAT9999', items: [itemFor(product, { size: 'M', qty: 1 })] });

    expect(res.body.data.coupon.discountAmount).toBe(200);
    expect(res.body.data.pricing.grandTotal).toBeGreaterThanOrEqual(0);
  });

  it('rejects an expired coupon', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 1000, stock: 10 });
    await Coupon.create({
      code: 'EXPIRED',
      discountType: 'percentage',
      discountValue: 10,
      startsAt: past(10),
      expiresAt: past(1),
      isActive: true,
    });

    const res = await asUser(token)
      .post('/api/coupons/validate')
      .send({ code: 'EXPIRED', items: [itemFor(product)] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('COUPON_EXPIRED');
  });

  it('rejects an inactive coupon without revealing that it exists', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 1000, stock: 10 });
    await makeCoupon({ code: 'DISABLED', isActive: false });

    const disabled = await asUser(token)
      .post('/api/coupons/validate')
      .send({ code: 'DISABLED', items: [itemFor(product)] });
    const nonexistent = await asUser(token)
      .post('/api/coupons/validate')
      .send({ code: 'NOSUCHCODE', items: [itemFor(product)] });

    // Same message either way — the coupon namespace is not probeable.
    expect(disabled.status).toBe(400);
    expect(nonexistent.status).toBe(400);
    expect(disabled.body.error.message).toBe(nonexistent.body.error.message);
  });

  it('enforces the minimum order value', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 500, stock: 10 });
    await makeCoupon({ code: 'MIN2000', minOrderValue: 2000 });

    const res = await asUser(token)
      .post('/api/coupons/validate')
      .send({ code: 'MIN2000', items: [itemFor(product, { size: 'M', qty: 1 })] });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('COUPON_MIN_ORDER');
  });

  it('computes the minimum against the DB subtotal, not a client-claimed one', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 100, stock: 10 });
    await makeCoupon({ code: 'MIN5000', minOrderValue: 5000 });

    const res = await asUser(token).post('/api/coupons/validate').send({
      code: 'MIN5000',
      items: [{ ...itemFor(product, { size: 'M', qty: 1 }), price: 99999 }],
      subtotal: 99999,
    });

    // The inflated price is ignored; the real subtotal is 100.
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('COUPON_MIN_ORDER');
  });
});

describe('Coupon redemption', () => {
  it('records a redemption and blocks reuse beyond perUserLimit', async () => {
    const { token, user } = await createUser();
    const product = await createProduct({ price: 1000, stock: 20 });
    await makeCoupon({ code: 'ONCE', perUserLimit: 1 });

    const first = await asUser(token).post('/api/orders').send({
      items: [itemFor(product, { size: 'M', qty: 1 })],
      shippingAddress: VALID_ADDRESS,
      paymentMethod: 'COD',
      couponCode: 'ONCE',
    });
    expect(first.status).toBe(201);
    expect(first.body.data.order.pricing.discountTotal).toBe(100);

    const coupon = await Coupon.findOne({ code: 'ONCE' }).select('+redemptions');
    expect(coupon.usedCount).toBe(1);
    expect(coupon.redemptions[0].user.toString()).toBe(user._id.toString());

    const second = await asUser(token).post('/api/orders').send({
      items: [itemFor(product, { size: 'M', qty: 1 })],
      shippingAddress: VALID_ADDRESS,
      paymentMethod: 'COD',
      couponCode: 'ONCE',
    });
    expect(second.status).toBe(400);
    expect(second.body.error.code).toBe('COUPON_ALREADY_USED');
  });

  it('respects the total usage limit', async () => {
    const product = await createProduct({ price: 1000, stock: 50 });
    await makeCoupon({ code: 'FIRST2', totalUsageLimit: 2, perUserLimit: 5 });

    const buyers = await Promise.all([createUser(), createUser(), createUser()]);
    const results = [];

    for (const { token } of buyers) {
      // eslint-disable-next-line no-await-in-loop
      results.push(
        await asUser(token).post('/api/orders').send({
          items: [itemFor(product, { size: 'M', qty: 1 })],
          shippingAddress: VALID_ADDRESS,
          paymentMethod: 'COD',
          couponCode: 'FIRST2',
        })
      );
    }

    const withDiscount = results.filter((r) => r.status === 201).length;
    expect(withDiscount).toBe(2);
    expect(results[2].status).toBe(400);
    expect(results[2].body.error.code).toBe('COUPON_EXHAUSTED');
  });

  it('releases the redemption when the order is cancelled', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 1000, stock: 20 });
    await makeCoupon({ code: 'REFUNDABLE', perUserLimit: 1 });

    const created = await asUser(token).post('/api/orders').send({
      items: [itemFor(product, { size: 'M', qty: 1 })],
      shippingAddress: VALID_ADDRESS,
      paymentMethod: 'COD',
      couponCode: 'REFUNDABLE',
    });

    expect((await Coupon.findOne({ code: 'REFUNDABLE' })).usedCount).toBe(1);

    await asUser(token).post(`/api/orders/${created.body.data.order._id}/cancel`).send({});

    // Cancelling frees the code so the customer can use it again.
    expect((await Coupon.findOne({ code: 'REFUNDABLE' })).usedCount).toBe(0);
  });

  it('IGNORES a client-supplied discount amount', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 1000, stock: 10 });
    await makeCoupon({ code: 'SAVE10', discountValue: 10 });

    const res = await asUser(token).post('/api/orders').send({
      items: [itemFor(product, { size: 'M', qty: 1 })],
      shippingAddress: VALID_ADDRESS,
      paymentMethod: 'COD',
      couponCode: 'SAVE10',
      discountTotal: 999,
      coupon: { discountAmount: 999 },
      pricing: { discountTotal: 999, grandTotal: 1 },
    });

    expect(res.status).toBe(201);
    const order = await Order.findById(res.body.data.order._id);
    expect(order.pricing.discountTotal).toBe(100); // 10%, not 999
    // 1000 − 100 discount = 900, which falls below the ₹1499 free-shipping
    // threshold, so ₹79 shipping applies.
    expect(order.pricing.shippingTotal).toBe(79);
    expect(order.pricing.grandTotal).toBe(979);
  });

  it('fails the whole order when the coupon is invalid at checkout', async () => {
    const { token } = await createUser();
    const product = await createProduct({ price: 1000, stock: 10 });

    const res = await asUser(token).post('/api/orders').send({
      items: [itemFor(product, { size: 'M', qty: 1 })],
      shippingAddress: VALID_ADDRESS,
      paymentMethod: 'COD',
      couponCode: 'MADEUPCODE',
    });

    // Silently dropping the coupon would charge a total the customer never saw.
    expect(res.status).toBe(400);
    expect(await Order.countDocuments()).toBe(0);
    // Stock must not be consumed by the failed attempt.
    const Product = require('../models/Product');
    const reloaded = await Product.findById(product._id);
    expect(reloaded.variants.find((v) => v.size === 'M').stock).toBe(10);
  });
});

describe('Coupon administration', () => {
  it('rejects a percentage above 100', async () => {
    const { token } = await createAdmin();

    const res = await asUser(token).post('/api/coupons').send({
      code: 'TOOMUCH',
      discountType: 'percentage',
      discountValue: 150,
      expiresAt: future().toISOString(),
    });

    expect(res.status).toBe(400);
  });

  it('deactivates rather than deletes a coupon that has been used', async () => {
    const admin = await createAdmin();
    const { token } = await createUser();
    const product = await createProduct({ price: 1000, stock: 10 });
    const coupon = await makeCoupon({ code: 'USED10' });

    await asUser(token).post('/api/orders').send({
      items: [itemFor(product, { size: 'M', qty: 1 })],
      shippingAddress: VALID_ADDRESS,
      paymentMethod: 'COD',
      couponCode: 'USED10',
    });

    const res = await asUser(admin.token).delete(`/api/coupons/${coupon._id}`);
    expect(res.status).toBe(200);

    const reloaded = await Coupon.findById(coupon._id);
    expect(reloaded).not.toBeNull(); // preserved for order history
    expect(reloaded.isActive).toBe(false);
  });
});
