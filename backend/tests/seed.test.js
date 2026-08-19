const { request, app, createAdmin, asUser } = require('./helpers');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { slugify } = require('../utils/slugify');
const { categories, products, APPAREL_SIZES } = require('../seed/catalogue');

/**
 * The seed catalogue is the first thing a new store sees. If it does not
 * validate against the schema, the owner's first experience is a crash — so it
 * is exercised here rather than trusted.
 */
async function seedInMemory() {
  const idByKey = new Map();

  for (const cat of categories) {
    // eslint-disable-next-line no-await-in-loop
    const doc = await Category.create({
      name: cat.name,
      slug: slugify(cat.name),
      description: cat.description,
      displayOrder: cat.displayOrder,
      image: { url: cat.image, publicId: '', alt: `${cat.name} collection` },
      metaTitle: cat.metaTitle,
      metaDescription: cat.metaDescription,
    });
    idByKey.set(cat.key, doc._id);
  }

  for (const item of products) {
    const sizes = item.sizes || APPAREL_SIZES;
    // eslint-disable-next-line no-await-in-loop
    await Product.create({
      name: item.name,
      slug: slugify(item.name),
      description: item.description,
      shortDescription: item.shortDescription,
      brand: 'TOUCH',
      category: idByKey.get(item.category),
      price: item.price,
      mrp: item.mrp,
      images: item.images.map((url, i) => ({ url, alt: `${item.name} ${i + 1}` })),
      variants: sizes.map((size) => ({
        size: String(size).toUpperCase(),
        sku: `${slugify(item.name).toUpperCase().replace(/-/g, '').slice(0, 8)}-${String(size).replace(/\s/g, '')}`,
        stock: item.stock?.[size] ?? 0,
      })),
      status: 'active',
      isFeatured: Boolean(item.isFeatured),
      isNewArrival: Boolean(item.isNewArrival),
      tags: item.tags,
      material: item.material,
      careInstructions: item.careInstructions,
    });
  }
}

describe('Seed catalogue', () => {
  it('every category is schema-valid and uniquely slugged', async () => {
    await seedInMemory();

    const stored = await Category.find().lean();
    expect(stored).toHaveLength(categories.length);
    expect(new Set(stored.map((c) => c.slug)).size).toBe(categories.length);
  });

  it('every product is schema-valid with correct derived stock', async () => {
    await seedInMemory();

    const stored = await Product.find().lean();
    expect(stored).toHaveLength(products.length);

    for (const p of stored) {
      expect(p.slug).toBeTruthy();
      expect(p.images.length).toBeGreaterThan(0);
      expect(p.variants.length).toBeGreaterThan(0);
      expect(p.mrp).toBeGreaterThanOrEqual(p.price);

      const sum = p.variants.reduce((a, v) => a + v.stock, 0);
      expect(p.totalStock).toBe(sum);

      // SKUs must be unique within a product.
      expect(new Set(p.variants.map((v) => v.sku)).size).toBe(p.variants.length);
    }
  });

  it('contains no electronics or furniture left over from the old demo data', async () => {
    await seedInMemory();
    const stored = await Product.find().lean();
    const text = JSON.stringify(stored).toLowerCase();

    for (const term of ['headphone', 'smart tv', 'dslr', 'laptop', 'blender', 'espresso', 'office chair']) {
      expect(text).not.toContain(term);
    }
  });

  it('includes out-of-stock variants so that UI state is exercised', async () => {
    await seedInMemory();
    const anyZero = await Product.findOne({ 'variants.stock': 0 });
    expect(anyZero).not.toBeNull();
  });

  it('serves the seeded catalogue through the public API', async () => {
    await seedInMemory();

    const list = await request(app).get('/api/products').query({ limit: 60 });
    expect(list.status).toBe(200);
    expect(list.body.data.products.length).toBe(products.length);
    expect(list.body.meta.total).toBe(products.length);

    const home = await request(app).get('/api/products/collections/home');
    expect(home.status).toBe(200);
    expect(home.body.data.newArrivals.length).toBeGreaterThan(0);
    expect(home.body.data.featured.length).toBeGreaterThan(0);
    expect(home.body.data.onSale.length).toBeGreaterThan(0);

    const cats = await request(app).get('/api/categories');
    expect(cats.status).toBe(200);
    expect(cats.body.data.categories.length).toBe(categories.length);
    // Product counts must be real, not placeholders.
    expect(cats.body.data.categories.some((c) => c.productCount > 0)).toBe(true);
  });

  it('supports filtering, sorting and pagination on the seeded data', async () => {
    await seedInMemory();

    const page1 = await request(app).get('/api/products').query({ limit: 5, page: 1 });
    expect(page1.body.data.products).toHaveLength(5);
    expect(page1.body.meta.hasNextPage).toBe(true);

    const cheap = await request(app).get('/api/products').query({ maxPrice: 1500 });
    expect(cheap.body.data.products.every((p) => p.price <= 1500)).toBe(true);

    const sorted = await request(app).get('/api/products').query({ sort: 'price-asc', limit: 60 });
    const prices = sorted.body.data.products.map((p) => p.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);

    const searched = await request(app).get('/api/products').query({ search: 'linen' });
    expect(searched.body.data.products.length).toBeGreaterThan(0);

    const facets = await request(app).get('/api/products/facets');
    expect(facets.body.data.sizes.length).toBeGreaterThan(0);
    expect(facets.body.data.priceRange.max).toBeGreaterThan(facets.body.data.priceRange.min);
  });

  it('exposes an in-stock filter that excludes sold-out sizes', async () => {
    await seedInMemory();

    const res = await request(app).get('/api/products').query({ sizes: 'XS', limit: 60 });
    expect(res.status).toBe(200);
    // Every returned product must actually have XS available.
    for (const p of res.body.data.products) {
      const xs = p.variants.find((v) => v.size === 'XS');
      expect(xs?.stock).toBeGreaterThan(0);
    }
  });

  it('lets an admin see draft products that shoppers cannot', async () => {
    await seedInMemory();
    const admin = await createAdmin();

    const first = await Product.findOne();
    await Product.updateOne({ _id: first._id }, { $set: { status: 'draft' } });

    const shopper = await request(app).get('/api/products').query({ limit: 60 });
    expect(shopper.body.data.products.length).toBe(products.length - 1);

    const adminView = await asUser(admin.token).get(`/api/products/${first.slug}`);
    expect(adminView.status).toBe(200);
  });
});
