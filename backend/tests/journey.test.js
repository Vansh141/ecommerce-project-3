const {
  app, request, createUser, createAdmin, createCategory, asUser, TEST_PASSWORD,
} = require('./helpers');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Category = require('../models/Category');
const { slugify } = require('../utils/slugify');

/**
 * End-to-end journeys.
 *
 * These exercise the real customer path, the real admin path, and the attack
 * paths — through the actual Express app and real database writes. They are the
 * regression net for "does the shop still work", not unit tests.
 */

const ADDRESS = {
  fullName: 'Priya Sharma',
  phone: '9876543210',
  line1: '12 Linking Road, Bandra West',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400050',
  country: 'India',
};

/** Builds a small but realistic catalogue via the admin API. */
async function seedCatalogueAsAdmin(adminToken) {
  const dresses = await createCategory({ name: 'Dresses', slug: 'dresses' });
  const tops = await createCategory({ name: 'Tops', slug: 'tops' });

  const make = (name, category, price, mrp, variants, extra = {}) =>
    asUser(adminToken).post('/api/products').send({
      name,
      description: 'A considered piece cut from natural fabric, made in small runs.',
      shortDescription: 'Considered, natural, made in small runs.',
      brand: 'TOUCH',
      category: category._id.toString(),
      price,
      mrp,
      status: 'active',
      images: [{ url: 'https://example.com/a.webp', alt: name }],
      variants,
      ...extra,
    });

  const a = await make('Amara Linen Midi Dress', dresses, 2890, 3600, [
    { size: 'S', stock: 5 }, { size: 'M', stock: 8 }, { size: 'L', stock: 0 },
  ], { isNewArrival: true, isFeatured: true, tags: ['linen', 'midi'] });

  const b = await make('Leila Linen Shirt', tops, 1890, 1890, [
    { size: 'M', stock: 4 }, { size: 'L', stock: 6 },
  ]);

  return { dresses, tops, productA: a.body.data.product, productB: b.body.data.product };
}

describe('Customer journey', () => {
  it('completes browse → filter → product → cart → checkout → order → cancel', async () => {
    const admin = await createAdmin();
    const { productA } = await seedCatalogueAsAdmin(admin.token);
    const customer = await createUser();

    // ── 1. Homepage collections ──
    const home = await request(app).get('/api/products/collections/home');
    expect(home.status).toBe(200);
    expect(home.body.data.newArrivals.length).toBeGreaterThan(0);

    // ── 2. Browse a category ──
    const byCategory = await request(app).get('/api/products').query({ category: 'dresses' });
    expect(byCategory.status).toBe(200);
    expect(byCategory.body.data.products.length).toBe(1);

    // ── 3. Search ──
    const search = await request(app).get('/api/products').query({ search: 'linen' });
    expect(search.body.data.products.length).toBe(2);

    // ── 4. Filter by size — size L of product A is sold out, so only the
    //       shirt should match. This is the check the old build could not do. ──
    const bySize = await request(app).get('/api/products').query({ sizes: 'L' });
    expect(bySize.body.data.products.map((p) => p.name)).toEqual(['Leila Linen Shirt']);

    // ── 5. Open the product ──
    const pdp = await request(app).get(`/api/products/${productA.slug}`);
    expect(pdp.status).toBe(200);
    const product = pdp.body.data.product;

    const sizeM = product.variants.find((v) => v.size === 'M');
    const sizeL = product.variants.find((v) => v.size === 'L');
    expect(sizeL.stock).toBe(0); // must be visibly unavailable

    // ── 6. Price the bag before ordering ──
    const preview = await asUser(customer.token)
      .post('/api/orders/preview')
      .send({ items: [{ product: product._id, variantId: sizeM._id, qty: 2 }] });

    expect(preview.status).toBe(200);
    expect(preview.body.data.pricing.itemsTotal).toBe(5780);

    // ── 7. Save an address ──
    const addr = await asUser(customer.token).post('/api/users/addresses').send(ADDRESS);
    expect(addr.status).toBe(201);
    const addressId = addr.body.data.address._id;

    // ── 8. Place the order ──
    const placed = await asUser(customer.token).post('/api/orders').send({
      items: [{ product: product._id, variantId: sizeM._id, qty: 2 }],
      addressId,
      paymentMethod: 'COD',
    });

    expect(placed.status).toBe(201);
    const orderId = placed.body.data.order._id;

    // ── 9. The charged total matches the previewed total exactly ──
    expect(placed.body.data.order.pricing.grandTotal)
      .toBe(preview.body.data.pricing.grandTotal);

    // ── 10. Stock was decremented ──
    const afterOrder = await Product.findById(product._id);
    expect(afterOrder.variants.find((v) => v.size === 'M').stock).toBe(6);

    // ── 11. Order history ──
    const history = await asUser(customer.token).get('/api/orders/mine');
    expect(history.body.data.orders).toHaveLength(1);
    expect(history.body.data.orders[0].orderNumber).toMatch(/^TCH\d{8}$/);

    // ── 12. Order detail ──
    const detail = await asUser(customer.token).get(`/api/orders/${orderId}`);
    expect(detail.status).toBe(200);
    expect(detail.body.data.order.items[0].size).toBe('M');
    expect(detail.body.data.order.status).toBe('confirmed');

    // ── 13. Cancel and confirm stock returns ──
    const cancelled = await asUser(customer.token)
      .post(`/api/orders/${orderId}/cancel`)
      .send({ reason: 'Ordered the wrong size' });

    expect(cancelled.status).toBe(200);
    expect(cancelled.body.data.order.status).toBe('cancelled');

    const afterCancel = await Product.findById(product._id);
    expect(afterCancel.variants.find((v) => v.size === 'M').stock).toBe(8);
  });

  it('refuses to sell a size that is out of stock', async () => {
    const admin = await createAdmin();
    const { productA } = await seedCatalogueAsAdmin(admin.token);
    const customer = await createUser();

    const product = await Product.findById(productA._id);
    const soldOut = product.variants.find((v) => v.size === 'L');

    const res = await asUser(customer.token).post('/api/orders').send({
      items: [{ product: product._id.toString(), variantId: soldOut._id.toString(), qty: 1 }],
      shippingAddress: ADDRESS,
      paymentMethod: 'COD',
    });

    expect(res.status).toBe(409);
    expect(await Order.countDocuments()).toBe(0);
  });
});

describe('Admin journey', () => {
  it('creates, edits, restocks and fulfils', async () => {
    const admin = await createAdmin();
    const category = await createCategory({ name: 'Dresses', slug: 'dresses' });

    // ── 1. Create a product with per-product sizes ──
    const created = await asUser(admin.token).post('/api/products').send({
      name: 'Studio Wrap Dress',
      description: 'A wrap dress in washed linen, cut for everyday wear.',
      brand: 'TOUCH',
      category: category._id.toString(),
      price: 3200,
      mrp: 3900,
      status: 'active',
      images: [{ url: 'https://example.com/wrap.webp', alt: 'Studio Wrap Dress' }],
      // Deliberately only three sizes — sizes are per product, not global.
      variants: [{ size: 'S', stock: 3 }, { size: 'M', stock: 5 }, { size: 'L', stock: 2 }],
    });

    expect(created.status).toBe(201);
    const productId = created.body.data.product._id;
    expect(created.body.data.product.slug).toBe(slugify('Studio Wrap Dress'));
    expect(created.body.data.product.totalStock).toBe(10);
    expect(created.body.data.product.variants).toHaveLength(3);

    // ── 2. Edit price ──
    const edited = await asUser(admin.token)
      .put(`/api/products/${productId}`)
      .send({ price: 2800, isFeatured: true });

    expect(edited.status).toBe(200);
    expect(edited.body.data.product.price).toBe(2800);

    // ── 3. Restock one size ──
    const product = await Product.findById(productId);
    const sizeL = product.variants.find((v) => v.size === 'L');

    const restocked = await asUser(admin.token)
      .patch(`/api/products/${productId}/variants/${sizeL._id}/stock`)
      .send({ stock: 12 });

    expect(restocked.status).toBe(200);
    expect(restocked.body.data.product.totalStock).toBe(20);

    // ── 4. A customer orders ──
    const customer = await createUser();
    const refreshed = await Product.findById(productId);
    const sizeM = refreshed.variants.find((v) => v.size === 'M');

    const placed = await asUser(customer.token).post('/api/orders').send({
      items: [{ product: productId, variantId: sizeM._id.toString(), qty: 1 }],
      shippingAddress: ADDRESS,
      paymentMethod: 'COD',
    });
    const orderId = placed.body.data.order._id;

    // ── 5. Admin sees it ──
    const list = await asUser(admin.token).get('/api/orders');
    expect(list.status).toBe(200);
    expect(list.body.data.orders).toHaveLength(1);

    // ── 6. Walk the fulfilment path ──
    for (const status of ['packed', 'shipped', 'delivered']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await asUser(admin.token)
        .patch(`/api/orders/${orderId}/status`)
        .send({ status, ...(status === 'shipped' ? { trackingNumber: 'BLUEDART123' } : {}) });
      expect(res.status).toBe(200);
    }

    const finalOrder = await Order.findById(orderId);
    expect(finalOrder.status).toBe('delivered');
    expect(finalOrder.trackingNumber).toBe('BLUEDART123');
    expect(finalOrder.payment.status).toBe('paid'); // COD collected on delivery

    // ── 7. Revenue reflects exactly one paid order ──
    const stats = await asUser(admin.token).get('/api/admin/stats');
    expect(stats.body.data.revenue.paidOrders).toBe(1);
    expect(stats.body.data.orders.delivered).toBe(1);

    // ── 8. Customer list shows lifetime value ──
    const customers = await asUser(admin.token).get('/api/admin/customers');
    const record = customers.body.data.customers.find(
      (c) => c._id === customer.user._id.toString()
    );
    expect(record.orderCount).toBe(1);
    expect(record.totalSpent).toBeGreaterThan(0);
  });

  it('manages categories without shell access', async () => {
    const admin = await createAdmin();

    const created = await asUser(admin.token)
      .post('/api/categories')
      .send({ name: 'Co-ord Sets', description: 'Two pieces, one decision.' });
    expect(created.status).toBe(201);
    expect(created.body.data.category.slug).toBe('co-ord-sets');

    const id = created.body.data.category._id;

    const deactivated = await asUser(admin.token)
      .put(`/api/categories/${id}`)
      .send({ isActive: false });
    expect(deactivated.body.data.category.isActive).toBe(false);

    // A category holding products must not be deletable.
    await asUser(admin.token).put(`/api/categories/${id}`).send({ isActive: true });
    await asUser(admin.token).post('/api/products').send({
      name: 'Linen Co-ord',
      description: 'A matching set in textured cotton for easy dressing.',
      brand: 'TOUCH',
      category: id,
      price: 3190,
      mrp: 3990,
      status: 'active',
      images: [{ url: 'https://example.com/c.webp' }],
      variants: [{ size: 'M', stock: 4 }],
    });

    const blocked = await asUser(admin.token).delete(`/api/categories/${id}`);
    expect(blocked.status).toBe(409);
    expect(blocked.body.error.code).toBe('CATEGORY_IN_USE');
  });
});

describe('Security probes', () => {
  let admin;
  let customer;
  let attacker;
  let product;
  let variantId;

  beforeEach(async () => {
    admin = await createAdmin();
    customer = await createUser();
    attacker = await createUser();

    const category = await createCategory();
    product = await Product.create({
      name: 'Probe Piece',
      slug: 'probe-piece',
      description: 'A product used to exercise the security tests.',
      brand: 'TOUCH',
      category: category._id,
      price: 2000,
      mrp: 2500,
      images: [{ url: 'https://example.com/p.webp' }],
      variants: [{ size: 'M', sku: 'PROBE-M', stock: 10 }],
      status: 'active',
    });
    variantId = product.variants[0]._id.toString();
  });

  const order = (token, body) =>
    asUser(token).post('/api/orders').send({
      items: [{ product: product._id.toString(), variantId, qty: 1 }],
      shippingAddress: ADDRESS,
      paymentMethod: 'COD',
      ...body,
    });

  it('1. blocks unauthenticated access to protected endpoints', async () => {
    for (const [method, url] of [
      ['get', '/api/orders/mine'], ['get', '/api/users/profile'],
      ['post', '/api/orders'], ['get', '/api/admin/stats'],
    ]) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app)[method](url).send({});
      expect(res.status, `${method} ${url}`).toBe(401);
    }
  });

  it('2. blocks a customer from admin APIs', async () => {
    const res = await asUser(customer.token).get('/api/admin/stats');
    expect(res.status).toBe(403);
  });

  it("3. blocks reading another customer's order", async () => {
    const placed = await order(customer.token);
    const res = await asUser(attacker.token).get(`/api/orders/${placed.body.data.order._id}`);
    expect(res.status).toBe(404);
  });

  it('4. rejects a negative quantity', async () => {
    const res = await asUser(customer.token).post('/api/orders').send({
      items: [{ product: product._id.toString(), variantId, qty: -3 }],
      shippingAddress: ADDRESS,
      paymentMethod: 'COD',
    });
    expect(res.status).toBe(400);
    const after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(10); // never credited
  });

  it('5. merges duplicate order lines instead of double-spending stock', async () => {
    const line = { product: product._id.toString(), variantId, qty: 6 };
    const res = await asUser(customer.token).post('/api/orders').send({
      items: [line, { ...line }],
      shippingAddress: ADDRESS,
      paymentMethod: 'COD',
    });
    expect(res.status).toBeGreaterThanOrEqual(400); // 12 > 10 in stock
    const after = await Product.findById(product._id);
    expect(after.variants[0].stock).toBe(10);
  });

  it('6. ignores a fake price', async () => {
    const res = await order(customer.token, {
      items: [{ product: product._id.toString(), variantId, qty: 1, price: 1, mrp: 1 }],
      pricing: { grandTotal: 1 },
      totalPrice: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.data.order.pricing.itemsTotal).toBe(2000);
  });

  it('7. ignores a fake discount', async () => {
    const res = await order(customer.token, {
      discountTotal: 1999,
      coupon: { code: 'FAKE', discountAmount: 1999 },
    });
    expect(res.status).toBe(201);
    expect(res.body.data.order.pricing.discountTotal).toBe(0);
  });

  it('8. refuses to mark payment successful on the client word alone', async () => {
    const placed = await order(customer.token);
    const orderId = placed.body.data.order._id;

    const res = await asUser(customer.token).post(`/api/payments/${orderId}/verify`).send({
      razorpay_payment_id: 'pay_forged',
      razorpay_signature: 'f'.repeat(64),
      razorpay_order_id: 'order_forged',
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    const stored = await Order.findById(orderId);
    expect(stored.payment.status).not.toBe('paid');
  });

  it('9. rejects an invalid token', async () => {
    const res = await request(app).get('/api/users/profile').set('Authorization', 'Bearer not.a.token');
    expect(res.status).toBe(401);
  });

  it('10. rejects an expired token', async () => {
    const jwt = require('jsonwebtoken');
    const config = require('../config/env');
    const expired = jwt.sign(
      { sub: customer.user._id.toString(), role: 'customer', tv: 0 },
      config.jwt.accessSecret,
      { expiresIn: '-1s', issuer: config.jwt.issuer, audience: 'touch:access' }
    );

    const res = await request(app).get('/api/users/profile').set('Authorization', `Bearer ${expired}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  it('11. handles malformed input without a 500', async () => {
    const probes = [
      { items: 'not-an-array' },
      { items: [{ product: 'xyz', variantId: 'xyz', qty: 1 }] },
      { items: [{ product: { $ne: null }, variantId, qty: 1 }] },
      {},
    ];

    for (const body of probes) {
      // eslint-disable-next-line no-await-in-loop
      const res = await asUser(customer.token)
        .post('/api/orders')
        .send({ shippingAddress: ADDRESS, paymentMethod: 'COD', ...body });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    }
  });

  it('12. rejects an unsafe upload', async () => {
    // A PHP web shell renamed to .jpg with an image Content-Type. Extension and
    // MIME both look fine; only the magic-byte check catches it.
    const shell = Buffer.from('<?php system($_GET["c"]); ?>'.padEnd(64, ' '));

    const res = await asUser(admin.token)
      .post('/api/upload')
      .attach('image', shell, { filename: 'payload.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_IMAGE');
  });

  it('12b. rejects an SVG carrying script', async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

    const res = await asUser(admin.token)
      .post('/api/upload')
      .attach('image', svg, { filename: 'x.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
  });

  it('13. never exposes secrets through the API', async () => {
    const responses = await Promise.all([
      request(app).get('/api/payments/config'),
      request(app).get('/api/products'),
      request(app).get('/health'),
      asUser(customer.token).get('/api/users/profile'),
    ]);

    const body = JSON.stringify(responses.map((r) => r.body));
    for (const secret of ['JWT_ACCESS_SECRET', 'keySecret', 'key_secret', 'SMTP_PASS', 'mongodb://', '$2b$', '$2a$']) {
      expect(body).not.toContain(secret);
    }
  });
});
