const mongoose = require('mongoose');
const {
  app, request, createUser, createAdmin, createProduct, asUser, itemFor, VALID_ADDRESS,
} = require('./helpers');
const Product = require('../models/Product');
const Order = require('../models/Order');

const IMAGE_URL = 'https://example.com/look.webp';
const imagesWith = (framing) => [{ url: IMAGE_URL, publicId: '', alt: 'look', ...(framing === undefined ? {} : { framing }) }];

async function placeOrder(product) {
  const { token } = await createUser();
  const res = await asUser(token)
    .post('/api/orders')
    .send({ items: [itemFor(product)], shippingAddress: VALID_ADDRESS, paymentMethod: 'COD' });
  expect(res.status).toBe(201);
  return { token, order: res.body.data.order };
}

describe('Product image framing', () => {
  it('saves framing with an image and serves it on the product page and listings', async () => {
    const admin = await createAdmin();
    const product = await createProduct();
    const framing = { x: 40, y: 12.5, zoom: 1.35 };

    const res = await asUser(admin.token).put(`/api/products/${product._id}`).send({ images: imagesWith(framing) });
    expect(res.status).toBe(200);

    const pdp = await request(app).get(`/api/products/${product.slug}`).expect(200);
    expect(pdp.body.data.product.images[0]).toMatchObject({ url: IMAGE_URL, framing });

    const list = await request(app).get('/api/products').expect(200);
    expect(list.body.data.products[0].images[0].framing).toEqual(framing);
  });

  it('keeps the original image URL and clears framing when it is reset', async () => {
    const admin = await createAdmin();
    const product = await createProduct();

    await asUser(admin.token).put(`/api/products/${product._id}`).send({ images: imagesWith({ x: 10, y: 90, zoom: 2 }) }).expect(200);
    await asUser(admin.token).put(`/api/products/${product._id}`).send({ images: imagesWith(undefined) }).expect(200);

    const reloaded = await Product.findById(product._id).lean();
    expect(reloaded.images[0].url).toBe(IMAGE_URL);
    expect(reloaded.images[0].framing).toBeUndefined();
  });

  it.each([
    ['a focus point below 0', { x: -1, y: 50, zoom: 1 }],
    ['a focus point above 100', { x: 50, y: 101, zoom: 1 }],
    ['a zoom above 3', { x: 50, y: 50, zoom: 4 }],
    ['a zoom below 1', { x: 50, y: 50, zoom: 0.5 }],
    ['a number sent as text', { x: '50', y: 50, zoom: 1 }],
    ['a missing value', { x: 50, y: 50 }],
    ['a string', 'center'],
    ['an array', [50, 50, 1]],
  ])('rejects framing with %s', async (_label, framing) => {
    const admin = await createAdmin();
    const product = await createProduct();

    const res = await asUser(admin.token).put(`/api/products/${product._id}`).send({ images: imagesWith(framing) });
    expect(res.status).toBe(400);

    const reloaded = await Product.findById(product._id).lean();
    expect(reloaded.images[0].url).toBe('https://example.com/image.webp');
    expect(reloaded.images[0].framing).toBeUndefined();
  });

  it('refuses framing changes from a customer', async () => {
    const { token } = await createUser();
    const product = await createProduct();

    const res = await asUser(token).put(`/api/products/${product._id}`).send({ images: imagesWith({ x: 0, y: 0, zoom: 3 }) });
    expect(res.status).toBe(403);
  });
});

describe('Deleting a product', () => {
  it('permanently deletes a product that has never been ordered', async () => {
    const admin = await createAdmin();
    const product = await createProduct();

    const res = await asUser(admin.token).delete(`/api/products/${product._id}`);
    expect(res.status).toBe(200);
    expect(await Product.findById(product._id)).toBeNull();
  });

  it('refuses to delete a product that is part of an order and leaves the order history intact', async () => {
    const admin = await createAdmin();
    const product = await createProduct({ stock: 5 });
    const { token, order } = await placeOrder(product);

    const res = await asUser(admin.token).delete(`/api/products/${product._id}`);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PRODUCT_REFERENCED');
    expect(res.body.error.message).toMatch(/remove it from the store/i);

    const kept = await Product.findById(product._id).lean();
    expect(kept).not.toBeNull();
    expect(kept.status).toBe('active');

    const history = await asUser(token).get(`/api/orders/${order._id}`).expect(200);
    expect(history.body.data.order.items[0]).toMatchObject({ name: product.name, product: String(product._id) });

    const archived = await asUser(admin.token).patch(`/api/products/${product._id}/archive`);
    expect(archived.status).toBe(200);
    expect((await Product.findById(product._id).lean()).status).toBe('archived');
    expect(await Order.countDocuments({ 'items.product': product._id })).toBe(1);
  });

  it('keeps the product, restoring its status, when an order lands while it is being deleted', async () => {
    const admin = await createAdmin();
    const product = await createProduct({ status: 'draft' });

    const exists = vi.spyOn(Order, 'exists')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ _id: new mongoose.Types.ObjectId() });
    try {
      const res = await asUser(admin.token).delete(`/api/products/${product._id}`);
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('PRODUCT_REFERENCED');
    } finally {
      exists.mockRestore();
    }

    const kept = await Product.findById(product._id).lean();
    expect(kept).not.toBeNull();
    expect(kept.status).toBe('draft');
  });

  it('refuses deleting or removing a product for customers and signed-out visitors', async () => {
    const { token } = await createUser();
    const product = await createProduct();

    expect((await asUser(token).delete(`/api/products/${product._id}`)).status).toBe(403);
    expect((await asUser(token).patch(`/api/products/${product._id}/archive`)).status).toBe(403);
    expect((await request(app).delete(`/api/products/${product._id}`)).status).toBe(401);
    expect((await request(app).patch(`/api/products/${product._id}/archive`)).status).toBe(401);

    const kept = await Product.findById(product._id).lean();
    expect(kept.status).toBe('active');
  });

  it('returns 404 for a product that does not exist', async () => {
    const admin = await createAdmin();
    const res = await asUser(admin.token).delete(`/api/products/${new mongoose.Types.ObjectId()}`);
    expect(res.status).toBe(404);
  });
});
