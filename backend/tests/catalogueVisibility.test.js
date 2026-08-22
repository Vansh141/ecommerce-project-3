const { app, request, createUser, createAdmin, createProduct, asUser } = require('./helpers');

/**
 * Catalogue visibility.
 *
 * Two requirements pull in opposite directions and both must hold:
 *   • A shopper must never see a draft or archived product, and must not be
 *     able to reveal one by passing ?status= themselves.
 *   • The store owner must see drafts and archives in the admin product list —
 *     a new product is created as a draft, so a list that hides drafts makes
 *     the product vanish the moment it is saved.
 */
describe('GET /api/products visibility', () => {
  async function seedCatalogue() {
    const active = await createProduct({ name: 'Active Piece', status: 'active' });
    const draft = await createProduct({ name: 'Draft Piece', status: 'draft' });
    const archived = await createProduct({ name: 'Archived Piece', status: 'archived' });
    return { active, draft, archived };
  }

  const names = (res) => res.body.data.products.map((p) => p.name).sort();
  const statuses = (res) => [...new Set(res.body.data.products.map((p) => p.status))].sort();

  it('shows only active products to an anonymous visitor', async () => {
    await seedCatalogue();

    const res = await request(app).get('/api/products?limit=60').expect(200);

    expect(names(res)).toEqual(['Active Piece']);
    expect(statuses(res)).toEqual(['active']);
    expect(res.body.meta.total).toBe(1);
  });

  it('ignores a client-supplied ?status for an anonymous visitor', async () => {
    await seedCatalogue();

    for (const status of ['draft', 'archived']) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).get(`/api/products?status=${status}&limit=60`).expect(200);
      expect(statuses(res)).toEqual(['active']);
    }
  });

  it('ignores ?status for a signed-in customer too', async () => {
    await seedCatalogue();
    const { token } = await createUser();

    const res = await asUser(token).get('/api/products?status=draft&limit=60').expect(200);

    expect(statuses(res)).toEqual(['active']);
  });

  it('shows drafts and archives to an admin', async () => {
    await seedCatalogue();
    const { token } = await createAdmin();

    const res = await asUser(token).get('/api/products?limit=60').expect(200);

    expect(names(res)).toEqual(['Active Piece', 'Archived Piece', 'Draft Piece']);
    expect(res.body.meta.total).toBe(3);
  });

  it('lets an admin filter by status', async () => {
    await seedCatalogue();
    const { token } = await createAdmin();

    const drafts = await asUser(token).get('/api/products?status=draft&limit=60').expect(200);
    expect(names(drafts)).toEqual(['Draft Piece']);

    const archived = await asUser(token).get('/api/products?status=archived&limit=60').expect(200);
    expect(names(archived)).toEqual(['Archived Piece']);
  });

  it('still hides a draft product detail page from a shopper', async () => {
    const { draft } = await seedCatalogue();

    await request(app).get(`/api/products/${draft.slug}`).expect(404);

    const { token } = await createAdmin();
    await asUser(token).get(`/api/products/${draft.slug}`).expect(200);
  });
});
