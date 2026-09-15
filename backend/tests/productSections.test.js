const { app, request, createCategory, createProduct } = require('./helpers');

const URL = '/api/products/sections';

const names = (res, id) => res.body.data.sections[id].products.map((p) => p.name);

describe('Homepage product sections', () => {
  it('resolves every source in one public request', async () => {
    const dresses = await createCategory({ name: 'Dresses', slug: 'dresses' });
    await createProduct({ name: 'Plain Kurta', price: 1000, mrp: 1000 });
    await createProduct({ name: 'New Saree', isNewArrival: true, price: 1000, mrp: 1000 });
    await createProduct({ name: 'Sale Dupatta', price: 800, mrp: 1200 });
    await createProduct({ name: 'Featured Lehenga', isFeatured: true, price: 1000, mrp: 1000 });
    await createProduct({ name: 'Best Seller', soldCount: 40, price: 1000, mrp: 1000 });
    await createProduct({ name: 'Maxi Dress', category: dresses._id, price: 1000, mrp: 1000 });

    const res = await request(app).post(URL).send({
      sections: [
        { id: 'new', source: 'newArrivals', limit: 8 },
        { id: 'sale', source: 'onSale' },
        { id: 'featured', source: 'featured' },
        { id: 'popular', source: 'popular' },
        { id: 'category', source: 'category', category: String(dresses._id) },
        { id: 'newest', source: 'newest', limit: 2 },
      ],
    });

    expect(res.status).toBe(200);
    expect(names(res, 'new')).toEqual(['New Saree']);
    expect(names(res, 'sale')).toEqual(['Sale Dupatta']);
    expect(names(res, 'featured')).toEqual(['Featured Lehenga']);
    expect(names(res, 'popular')).toEqual(['Best Seller']);
    expect(names(res, 'category')).toEqual(['Maxi Dress']);
    expect(res.body.data.sections.category.categorySlug).toBe('dresses');
    expect(res.body.data.sections.newest.products).toHaveLength(2);
    expect(res.body.data.sections.newest.total).toBe(6);
  });

  it('keeps hand-picked order and silently drops products that are not active', async () => {
    const first = await createProduct({ name: 'First Pick' });
    const second = await createProduct({ name: 'Second Pick' });
    const draft = await createProduct({ name: 'Draft Pick', status: 'draft' });
    const archived = await createProduct({ name: 'Archived Pick', status: 'archived' });

    const res = await request(app).post(URL).send({
      sections: [{
        id: 'picks',
        source: 'manual',
        products: [String(second._id), String(draft._id), String(first._id), String(archived._id)],
      }],
    });

    expect(res.status).toBe(200);
    expect(names(res, 'picks')).toEqual(['Second Pick', 'First Pick']);
  });

  it('returns nothing for a hidden category and never leaks draft products', async () => {
    const hidden = await createCategory({ name: 'Hidden', slug: 'hidden', isActive: false });
    await createProduct({ name: 'In Hidden Category', category: hidden._id });
    await createProduct({ name: 'Unreleased', isNewArrival: true, status: 'draft' });

    const res = await request(app).post(URL).send({
      sections: [
        { id: 'hidden', source: 'category', category: String(hidden._id) },
        { id: 'new', source: 'newArrivals' },
      ],
    });

    expect(res.body.data.sections.hidden.products).toEqual([]);
    expect(JSON.stringify(res.body)).not.toContain('Unreleased');
  });

  it('falls back to the newest stock only when a section asks for it', async () => {
    await createProduct({ name: 'Only Product' });

    const res = await request(app).post(URL).send({
      sections: [
        { id: 'strict', source: 'newArrivals' },
        { id: 'lenient', source: 'newArrivals', fallbackToNewest: true },
      ],
    });

    expect(res.body.data.sections.strict.products).toEqual([]);
    expect(names(res, 'lenient')).toEqual(['Only Product']);
    expect(res.body.data.sections.lenient.source).toBe('newest');
  });

  it('rejects malformed requests', async () => {
    const cases = [
      { sections: [] },
      { sections: Array.from({ length: 13 }, (_, i) => ({ id: `s${i}`, source: 'newest' })) },
      { sections: [{ id: 'a', source: 'everything' }] },
      { sections: [{ id: 'a', source: 'newest', limit: 100 }] },
      { sections: [{ id: 'a', source: 'category', category: 'dresses' }] },
      { sections: [{ id: 'a', source: 'manual', products: ['not-an-id'] }] },
      { sections: [{ id: 'a', source: 'newest' }, { id: 'a', source: 'onSale' }] },
      { sections: [{ id: 'a', source: 'newest', $where: 'sleep(1000)' }] },
    ];

    for (const body of cases) {
      // eslint-disable-next-line no-await-in-loop
      const res = await request(app).post(URL).send(body);
      if (body.sections?.[0]?.$where) {
        // Operator keys are stripped before validation; the request stays harmless.
        expect(res.status).toBe(200);
      } else {
        expect(res.status, JSON.stringify(body).slice(0, 80)).toBe(400);
      }
    }
  });
});
