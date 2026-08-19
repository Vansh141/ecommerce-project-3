const {
  app, request, createUser, createAdmin, createProduct, createCategory, asUser,
} = require('./helpers');
const User = require('../models/User');

/**
 * Every admin surface must be unreachable without an admin token.
 *
 * The frontend AdminRoute is cosmetic; this is the control that actually
 * matters, so it is enumerated exhaustively rather than spot-checked.
 */
const ADMIN_ROUTES = [
  ['get', '/api/admin/stats'],
  ['get', '/api/admin/customers'],
  ['get', '/api/admin/inventory'],
  ['get', '/api/orders'],
  ['get', '/api/coupons'],
  ['get', '/api/reviews'],
  ['get', '/api/contact/messages'],
  ['get', '/api/contact/subscribers'],
  ['post', '/api/products'],
  ['post', '/api/categories'],
  ['post', '/api/coupons'],
  ['post', '/api/upload'],
];

describe('Authorization', () => {
  describe('admin endpoints', () => {
    it('rejects anonymous callers with 401', async () => {
      for (const [method, url] of ADMIN_ROUTES) {
        // eslint-disable-next-line no-await-in-loop
        const res = await request(app)[method](url).send({});
        expect(res.status, `${method.toUpperCase()} ${url}`).toBe(401);
      }
    });

    it('rejects signed-in customers with 403', async () => {
      const { token } = await createUser();

      for (const [method, url] of ADMIN_ROUTES) {
        // eslint-disable-next-line no-await-in-loop
        const res = await asUser(token)[method](url).send({});
        // 403, never 401 — the caller IS authenticated, they just lack rights.
        // Returning 401 here would make the client log a valid customer out.
        expect(res.status, `${method.toUpperCase()} ${url}`).toBe(403);
        expect(res.body.error.code).toBe('ADMIN_ONLY');
      }
    });

    it('admits an administrator', async () => {
      const { token } = await createAdmin();

      const res = await asUser(token).get('/api/admin/stats');
      expect(res.status).toBe(200);
      expect(res.body.data.revenue).toBeDefined();
    });
  });

  describe('privilege escalation', () => {
    it('refuses to let a customer promote themselves via the profile endpoint', async () => {
      const { user, token } = await createUser();

      await asUser(token)
        .put('/api/users/profile')
        .send({ name: 'Still Normal', role: 'admin', isAdmin: true, tokenVersion: 50 });

      const reloaded = await User.findById(user._id);
      expect(reloaded.role).toBe('customer');
      expect(reloaded.tokenVersion).toBe(0);
    });

    it('refuses to let a customer change roles through the admin endpoint', async () => {
      const { token } = await createUser();
      const victim = await createUser();

      const res = await asUser(token)
        .patch(`/api/admin/customers/${victim.user._id}/role`)
        .send({ role: 'admin' });

      expect(res.status).toBe(403);
    });

    it('revokes existing tokens when an admin is demoted', async () => {
      const admin = await createAdmin();
      const target = await createAdmin();

      const before = await asUser(target.token).get('/api/admin/stats');
      expect(before.status).toBe(200);

      const demote = await asUser(admin.token)
        .patch(`/api/admin/customers/${target.user._id}/role`)
        .send({ role: 'customer' });
      expect(demote.status).toBe(200);

      // The demoted admin's still-unexpired token must stop working at once.
      const after = await asUser(target.token).get('/api/admin/stats');
      expect(after.status).toBe(401);
      expect(after.body.error.code).toBe('TOKEN_REVOKED');
    });

    it('prevents an admin from changing their own role', async () => {
      const admin = await createAdmin();

      const res = await asUser(admin.token)
        .patch(`/api/admin/customers/${admin.user._id}/role`)
        .send({ role: 'customer' });

      expect(res.status).toBe(400);
    });

    it('prevents an admin from deactivating their own account', async () => {
      const admin = await createAdmin();

      const res = await asUser(admin.token)
        .patch(`/api/admin/customers/${admin.user._id}/status`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
    });

    it('always leaves at least one active administrator', async () => {
      const admin = await createAdmin();
      const second = await createAdmin();

      // Demoting another admin is fine while two exist.
      const demoteOther = await asUser(admin.token)
        .patch(`/api/admin/customers/${second.user._id}/role`)
        .send({ role: 'customer' });
      expect(demoteOther.status).toBe(200);

      // The remaining admin cannot remove their own privileges, so the store
      // can never be locked out of its own admin panel.
      const demoteSelf = await asUser(admin.token)
        .patch(`/api/admin/customers/${admin.user._id}/role`)
        .send({ role: 'customer' });
      expect(demoteSelf.status).toBe(400);

      const User = require('../models/User');
      expect(await User.countDocuments({ role: 'admin', isActive: true })).toBe(1);
    });
  });

  describe('product write protection', () => {
    it('refuses product creation by a customer', async () => {
      const { token } = await createUser();
      const category = await createCategory();

      const res = await asUser(token).post('/api/products').send({
        name: 'Hacked Product',
        description: 'Should never be created by a customer.',
        brand: 'X',
        category: category._id.toString(),
        price: 1,
        mrp: 1,
      });

      expect(res.status).toBe(403);
    });

    it('refuses stock manipulation by a customer', async () => {
      const { token } = await createUser();
      const product = await createProduct({ stock: 2 });
      const variantId = product.variants[0]._id.toString();

      const res = await asUser(token)
        .patch(`/api/products/${product._id}/variants/${variantId}/stock`)
        .send({ stock: 99999 });

      expect(res.status).toBe(403);
    });

    it('ignores derived rating fields sent by an admin', async () => {
      const admin = await createAdmin();
      const product = await createProduct();

      await asUser(admin.token)
        .put(`/api/products/${product._id}`)
        .send({ ratingAverage: 5, ratingCount: 9999, soldCount: 9999, totalStock: 9999 });

      const Product = require('../models/Product');
      const reloaded = await Product.findById(product._id);
      // Ratings come only from real Review documents.
      expect(reloaded.ratingAverage).toBe(0);
      expect(reloaded.ratingCount).toBe(0);
      expect(reloaded.soldCount).toBe(0);
      expect(reloaded.totalStock).toBe(30); // recomputed from variants
    });
  });

  describe('hidden products', () => {
    it('hides draft products from shoppers but shows them to an admin', async () => {
      const draft = await createProduct({ status: 'draft' });
      const admin = await createAdmin();

      const anon = await request(app).get(`/api/products/${draft.slug}`);
      expect(anon.status).toBe(404);

      const asAdmin = await asUser(admin.token).get(`/api/products/${draft.slug}`);
      expect(asAdmin.status).toBe(200);
    });

    it('excludes non-active products from listings', async () => {
      await createProduct({ status: 'active', name: 'Visible Item' });
      await createProduct({ status: 'draft', name: 'Hidden Item' });
      await createProduct({ status: 'archived', name: 'Gone Item' });

      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body.data.products).toHaveLength(1);
      expect(res.body.data.products[0].name).toBe('Visible Item');
    });
  });
});

describe('Input hardening', () => {
  it('returns 400 (not 500) for a malformed ObjectId', async () => {
    const res = await request(app).get('/api/products/not-a-valid-id');
    // Falls through to the slug lookup and simply finds nothing.
    expect([400, 404]).toContain(res.status);
    expect(res.status).not.toBe(500);
  });

  it('returns 400 for a malformed id on an authenticated route', async () => {
    const { token } = await createUser();
    const res = await asUser(token).get('/api/orders/%20%20notanid');
    expect(res.status).toBe(400);
    expect(res.status).not.toBe(500);
  });

  it('never leaks a stack trace to the client', async () => {
    const res = await request(app).get('/api/does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.stack).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('node_modules');
  });

  it('strips MongoDB operators from a request body', async () => {
    const { token } = await createUser();

    const res = await asUser(token)
      .put('/api/users/profile')
      .send({ name: 'Legit Name', $set: { role: 'admin' }, 'a.b': 1, __proto__: { polluted: true } });

    expect(res.status).toBe(200);
    expect({}.polluted).toBeUndefined();
    expect(res.body.data.user.role).toBe('customer');
  });

  it('survives a ReDoS-shaped search term', async () => {
    await createProduct({ name: 'Linen Dress' });

    const started = Date.now();
    const res = await request(app).get('/api/products').query({ search: '(a+)+$'.repeat(6) });
    const elapsed = Date.now() - started;

    // The term is regex-escaped, so it is matched literally and returns fast.
    expect(res.status).toBe(200);
    expect(elapsed).toBeLessThan(3000);
  });

  it('rejects an oversized JSON body', async () => {
    const { token } = await createUser();
    const res = await asUser(token)
      .put('/api/users/profile')
      .send({ name: 'x'.repeat(200_000) });

    expect([400, 413]).toContain(res.status);
  });

  it('caps the pagination limit', async () => {
    const res = await request(app).get('/api/products').query({ limit: 5000 });
    expect(res.status).toBe(400);
  });
});
