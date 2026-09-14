const { app, request, createProduct, itemFor } = require('./helpers');
const config = require('../config/env');
const logger = require('../utils/logger');
const couponService = require('../services/couponService');

describe('Test isolation', () => {
  it('never enables an outbound integration, whatever the developer .env holds', () => {
    expect(config.resend.enabled).toBe(false);
    expect(config.razorpay.enabled).toBe(false);
    expect(config.cloudinary.enabled).toBe(false);
  });

  it('signs tokens with generated test secrets, never configured ones', () => {
    expect(config.jwt.accessSecret.startsWith('test-only-')).toBe(true);
    expect(config.jwt.refreshSecret.startsWith('test-only-')).toBe(true);
  });
});

describe('Log redaction', () => {
  const raw = 'a1b2c3d4'.repeat(8);

  it('removes single-use tokens from logged paths and messages', () => {
    const out = logger.redact({
      path: `/api/auth/reset-password/${raw}`,
      message: `Route not found: GET /api/auth/verify-email/${raw}?utm=mail`,
      nested: { urls: [`/api/contact/unsubscribe/${raw}`] },
    });

    expect(JSON.stringify(out)).not.toContain(raw);
    expect(out.path).toBe('/api/auth/reset-password/[REDACTED]');
    expect(out.message).toBe('Route not found: GET /api/auth/verify-email/[REDACTED]?utm=mail');
  });

  it('leaves ordinary paths alone and still redacts credential-named keys', () => {
    const out = logger.redact({ path: '/api/products/amara-linen-midi-dress', accessToken: 'abc' });

    expect(out.path).toBe('/api/products/amara-linen-midi-dress');
    expect(out.accessToken).toBe('[REDACTED]');
  });

  it('scrubs the log line itself before it is written', () => {
    const written = [];
    const spy = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => {
      written.push(String(chunk));
      return true;
    });

    try {
      logger.error(`Failed on /api/auth/reset-password/${raw}`, { path: `/api/auth/reset-password/${raw}` });
    } finally {
      spy.mockRestore();
    }

    const output = written.join('');
    expect(output).toContain('/api/auth/reset-password/[REDACTED]');
    expect(output).not.toContain(raw);
  });
});

describe('Cart preview error handling', () => {
  it('never echoes an unexpected coupon failure to the shopper', async () => {
    const product = await createProduct({ price: 999, stock: 10 });
    const spy = vi
      .spyOn(couponService, 'validateCoupon')
      .mockRejectedValue(new Error('MongoServerSelectionError: connect ECONNREFUSED 10.0.0.5:27017'));

    let res;
    try {
      res = await request(app)
        .post('/api/orders/preview')
        .send({ items: [itemFor(product, { size: 'M', qty: 1 })], couponCode: 'ANYCODE' });
    } finally {
      spy.mockRestore();
    }

    expect(res.status).toBe(200);
    expect(res.body.data.couponError).toBe('We could not check that coupon right now. Please try again.');
    expect(JSON.stringify(res.body)).not.toContain('10.0.0.5');
  });
});
