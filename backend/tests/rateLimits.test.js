const {
  app, request, createUser, createProduct, asUser, itemFor, TEST_PASSWORD,
} = require('./helpers');
const config = require('../config/env');
const Coupon = require('../models/Coupon');

/**
 * Route-specific rate limits, exercised through the real routes.
 *
 * Every limiter is off in the rest of the suite; this file opts in. Each
 * limiter keeps its own in-memory store and each test drives a different one,
 * so the tests do not depend on the order they run in. The whole file stays
 * well below the global backstop of 300 requests a minute.
 */
beforeAll(() => {
  process.env.RATE_LIMIT_IN_TESTS = 'true';
});

afterAll(() => {
  delete process.env.RATE_LIMIT_IN_TESTS;
});

const WITH_CSRF = ['X-Requested-With', 'XMLHttpRequest'];

describe('Password reset limits', () => {
  it('caps reset-link requests without blocking use of a link already sent', async () => {
    const { user } = await createUser({ email: 'limited@example.com' });

    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/api/auth/forgot-password').send({ email: 'limited@example.com' });
      expect(res.status).toBe(200);
    }

    const blocked = await request(app).post('/api/auth/forgot-password').send({ email: 'limited@example.com' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');

    // Asking for the link too often must not stop someone using the one they have.
    const raw = user.createPasswordResetToken();
    await user.save();
    const reset = await request(app)
      .post(`/api/auth/reset-password/${raw}`)
      .send({ password: 'Mumbai9Monsoon' });
    expect(reset.status).toBe(200);
  });

  it('counts only failed attempts to use a reset link', async () => {
    const bogus = 'f'.repeat(64);

    for (let i = 0; i < 10; i += 1) {
      const res = await request(app)
        .post(`/api/auth/reset-password/${bogus}`)
        .send({ password: 'Mumbai9Monsoon' });
      expect(res.status).toBe(400);
    }

    const blocked = await request(app)
      .post(`/api/auth/reset-password/${bogus}`)
      .send({ password: 'Mumbai9Monsoon' });
    expect(blocked.status).toBe(429);
  });
});

describe('Session refresh limit', () => {
  it('never throttles successful or cookie-less refreshes, but stops token replay', async () => {
    const registered = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Refresher', email: 'refresher@example.com', password: TEST_PASSWORD });
    let cookie = registered.headers['set-cookie'];

    // More successful refreshes than the limit allows failures.
    for (let i = 0; i < 32; i += 1) {
      const res = await request(app).post('/api/auth/refresh').set('Cookie', cookie).set(...WITH_CSRF);
      expect(res.status).toBe(200);
      cookie = res.headers['set-cookie'] || cookie;
    }

    // An anonymous visitor's boot check carries no cookie and is never counted.
    for (let i = 0; i < 32; i += 1) {
      const res = await request(app).post('/api/auth/refresh').set(...WITH_CSRF);
      expect(res.status).toBe(401);
    }

    const forged = `${config.cookie.name}=not-a-real-refresh-token`;
    for (let i = 0; i < 30; i += 1) {
      const res = await request(app).post('/api/auth/refresh').set('Cookie', forged).set(...WITH_CSRF);
      expect(res.status).toBe(401);
    }

    const blocked = await request(app).post('/api/auth/refresh').set('Cookie', forged).set(...WITH_CSRF);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
  });
});

describe('Cart preview limits', () => {
  it('stops coupon guessing without penalising a real coupon or a plain bag', async () => {
    const product = await createProduct({ price: 999, stock: 10 });
    const items = [itemFor(product, { size: 'M', qty: 1 })];

    // A genuine coupon this bag does not yet qualify for. A shopper editing
    // their bag re-prices with it again and again; none of that is guessing.
    await Coupon.create({
      code: 'BIGBAG',
      discountType: 'fixed',
      discountValue: 100,
      minOrderValue: 5000,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    for (let i = 0; i < 30; i += 1) {
      const res = await request(app).post('/api/orders/preview').send({ items, couponCode: 'BIGBAG' });
      expect(res.status).toBe(200);
      expect(res.body.data.couponError).toMatch(/more to use this coupon/);
    }

    for (let i = 0; i < 25; i += 1) {
      const res = await request(app).post('/api/orders/preview').send({ items, couponCode: `GUESS${i}` });
      expect(res.status).toBe(200);
      expect(res.body.data.couponError).toBe('This coupon code is not valid.');
      // The classification the limiter uses stays on the server.
      expect(res.body.data).not.toHaveProperty('couponErrorCode');
    }

    const blocked = await request(app).post('/api/orders/preview').send({ items, couponCode: 'GUESS99' });
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');

    // Pricing the bag without a code is unaffected.
    const plain = await request(app).post('/api/orders/preview').send({ items });
    expect(plain.status).toBe(200);
    expect(plain.body.data.pricing.itemsTotal).toBe(999);
  });

  it('applies its own limit to the preview route', async () => {
    const product = await createProduct({ price: 999, stock: 10 });

    const res = await request(app)
      .post('/api/orders/preview')
      .send({ items: [itemFor(product, { size: 'M', qty: 1 })] });

    expect(res.status).toBe(200);
    // 200 requests per 600-second window, not the global 300 per 60 seconds.
    expect(res.headers['ratelimit-policy']).toMatch(/^200;w=600/);
  });
});

describe('Account security limit', () => {
  it('throttles current-password guesses per account, not per network', async () => {
    const guesser = await createUser();
    const neighbour = await createUser();
    const attempt = { currentPassword: 'Wrong1234x', newPassword: 'Mumbai9Monsoon' };

    for (let i = 0; i < 10; i += 1) {
      const res = await asUser(guesser.token).put('/api/users/password').send(attempt);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('CURRENT_PASSWORD_INVALID');
    }

    const blocked = await asUser(guesser.token).put('/api/users/password').send(attempt);
    expect(blocked.status).toBe(429);

    // Another account on the same IP is not affected.
    const elsewhere = await asUser(neighbour.token).put('/api/users/password').send(attempt);
    expect(elsewhere.status).toBe(401);
  });
});
