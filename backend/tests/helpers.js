const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { signAccessToken } = require('../services/tokenService');

let seq = 0;
const uniq = () => {
  seq += 1;
  return seq;
};

/** Creates a user directly and returns the doc plus a ready-to-use bearer token. */
// Deliberately not "Password123" — that is on the common-password blocklist,
// so it would be rejected by the real registration endpoint.
const TEST_PASSWORD = 'Kolkata7Rain';

async function createUser({ role = 'customer', password = TEST_PASSWORD, ...overrides } = {}) {
  const n = uniq();
  const user = await User.create({
    name: overrides.name || `Test User ${n}`,
    email: overrides.email || `user${n}@example.com`,
    password,
    role,
    emailVerified: true,
    ...overrides,
  });

  return { user, token: signAccessToken(user), password };
}

async function createAdmin(overrides = {}) {
  return createUser({ role: 'admin', ...overrides });
}

async function createCategory(overrides = {}) {
  const n = uniq();
  return Category.create({
    name: overrides.name || `Category ${n}`,
    slug: overrides.slug || `category-${n}`,
    isActive: true,
    ...overrides,
  });
}

/**
 * Creates an active product with S/M/L variants.
 * `stock` sets every variant's stock unless `variants` is supplied explicitly.
 */
async function createProduct({ stock = 10, price = 1000, mrp = 1500, ...overrides } = {}) {
  const n = uniq();
  const category = overrides.category || (await createCategory())._id;

  return Product.create({
    name: overrides.name || `Product ${n}`,
    slug: overrides.slug || `product-${n}`,
    description: overrides.description || 'A well made test garment for the suite.',
    brand: 'TOUCH',
    category,
    price,
    mrp,
    images: [{ url: 'https://example.com/image.webp', alt: 'test' }],
    variants: overrides.variants || [
      { size: 'S', sku: `SKU${n}-S`, stock, isActive: true },
      { size: 'M', sku: `SKU${n}-M`, stock, isActive: true },
      { size: 'L', sku: `SKU${n}-L`, stock, isActive: true },
    ],
    status: overrides.status || 'active',
    ...overrides,
  });
}

const VALID_ADDRESS = {
  fullName: 'Priya Sharma',
  phone: '9876543210',
  line1: '12 Linking Road, Bandra West',
  city: 'Mumbai',
  state: 'Maharashtra',
  postalCode: '400050',
  country: 'India',
};

/** Authenticated request helper. */
const asUser = (token) => ({
  get: (url) => request(app).get(url).set('Authorization', `Bearer ${token}`),
  post: (url) => request(app).post(url).set('Authorization', `Bearer ${token}`),
  put: (url) => request(app).put(url).set('Authorization', `Bearer ${token}`),
  patch: (url) => request(app).patch(url).set('Authorization', `Bearer ${token}`),
  delete: (url) => request(app).delete(url).set('Authorization', `Bearer ${token}`),
});

/** Builds an order item payload from a product and variant index. */
function itemFor(product, { size = 'M', qty = 1 } = {}) {
  const variant = product.variants.find((v) => v.size === size);
  return { product: product._id.toString(), variantId: variant._id.toString(), qty };
}

module.exports = {
  app,
  request,
  TEST_PASSWORD,
  createUser,
  createAdmin,
  createCategory,
  createProduct,
  asUser,
  itemFor,
  VALID_ADDRESS,
};
