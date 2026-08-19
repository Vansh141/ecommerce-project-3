const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Review = require('../models/Review');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated, paginationMeta } = require('../utils/apiResponse');
const { safeSearchRegex } = require('../utils/sanitize');
const { uniqueSlug } = require('../utils/slugify');
const storageService = require('../services/storageService');
const config = require('../config/env');

/** Fields safe to expose on a list card. Keeps payloads small on mobile. */
const LIST_FIELDS =
  'name slug brand price mrp images status isFeatured isNewArrival ratingAverage ratingCount totalStock variants.size variants.stock variants.isActive createdAt';

const SORT_MAP = {
  newest: { createdAt: -1 },
  oldest: { createdAt: 1 },
  'price-asc': { price: 1, _id: 1 },
  'price-desc': { price: -1, _id: 1 },
  popular: { soldCount: -1, createdAt: -1 },
  rating: { ratingAverage: -1, ratingCount: -1 },
};

/**
 * Builds the Mongo filter from query params.
 *
 * Everything user-supplied is either coerced to a number, matched against a
 * fixed allowlist, or escaped — never interpolated into a regex directly.
 */
async function buildProductFilter(query, { includeInactive = false } = {}) {
  const filter = {};

  if (!includeInactive) {
    filter.status = 'active';
  } else if (query.status && ['draft', 'active', 'archived'].includes(query.status)) {
    filter.status = query.status;
  }

  // Category may arrive as a slug (pretty URLs) or an id (admin UI).
  if (query.category) {
    let categoryId = null;
    if (mongoose.isValidObjectId(query.category)) {
      categoryId = query.category;
    } else {
      const category = await Category.findOne({ slug: String(query.category).toLowerCase() })
        .select('_id')
        .lean();
      if (!category) return null; // unknown category → deliberately empty result
      categoryId = category._id;
    }
    filter.category = categoryId;
  }

  const minPrice = Number.parseFloat(query.minPrice);
  const maxPrice = Number.parseFloat(query.maxPrice);
  if (Number.isFinite(minPrice) || Number.isFinite(maxPrice)) {
    filter.price = {};
    if (Number.isFinite(minPrice) && minPrice >= 0) filter.price.$gte = minPrice;
    if (Number.isFinite(maxPrice) && maxPrice >= 0) filter.price.$lte = maxPrice;
    if (Object.keys(filter.price).length === 0) delete filter.price;
  }

  // Only sizes that are active AND in stock should make a product match.
  if (query.sizes) {
    const sizes = String(query.sizes)
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s && s.length <= 12)
      .slice(0, 12);
    if (sizes.length > 0) {
      filter.variants = { $elemMatch: { size: { $in: sizes }, isActive: true, stock: { $gt: 0 } } };
    }
  }

  if (query.inStock === 'true') filter.totalStock = { $gt: 0 };
  if (query.featured === 'true') filter.isFeatured = true;
  if (query.newArrival === 'true') filter.isNewArrival = true;
  // "On sale" means a genuine markdown exists, not a decorative badge.
  if (query.onSale === 'true') filter.$expr = { $lt: ['$price', '$mrp'] };

  if (query.tags) {
    const tags = String(query.tags)
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)
      .slice(0, 10);
    if (tags.length > 0) filter.tags = { $in: tags };
  }

  if (query.search) {
    // Escaped substring match rather than $text: it supports partial words
    // (shoppers type "dres"), and escaping removes the ReDoS vector entirely.
    const rx = safeSearchRegex(query.search);
    if (rx) filter.$or = [{ name: rx }, { brand: rx }, { tags: rx }, { shortDescription: rx }];
  }

  return filter;
}

// ── GET /api/products ────────────────────────────────────────────────────────
const listProducts = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const limit = Math.min(Number(req.query.limit) || 12, 60);
  const skip = (page - 1) * limit;

  const filter = await buildProductFilter(req.query);
  if (filter === null) {
    return sendSuccess(res, { products: [] }, { meta: paginationMeta({ page, limit, total: 0 }) });
  }

  const sort = SORT_MAP[req.query.sort] || SORT_MAP.newest;

  const [products, total] = await Promise.all([
    Product.find(filter)
      .select(LIST_FIELDS)
      .populate('category', 'name slug')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean({ virtuals: true }),
    Product.countDocuments(filter),
  ]);

  return sendSuccess(res, { products }, { meta: paginationMeta({ page, limit, total }) });
});

// ── GET /api/products/facets ─────────────────────────────────────────────────
/** Filter metadata (price bounds, available sizes) so the UI never hardcodes them. */
const getFacets = asyncHandler(async (req, res) => {
  const filter = (await buildProductFilter(req.query)) || { _id: null };

  const [priceRange, sizes] = await Promise.all([
    Product.aggregate([
      { $match: filter },
      { $group: { _id: null, min: { $min: '$price' }, max: { $max: '$price' } } },
    ]),
    Product.aggregate([
      { $match: filter },
      { $unwind: '$variants' },
      { $match: { 'variants.isActive': true } },
      { $group: { _id: '$variants.size', stock: { $sum: '$variants.stock' } } },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
  const ordered = sizes.sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a._id);
    const ib = SIZE_ORDER.indexOf(b._id);
    if (ia === -1 && ib === -1) return String(a._id).localeCompare(String(b._id));
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return sendSuccess(res, {
    priceRange: {
      min: Math.floor(priceRange[0]?.min ?? 0),
      max: Math.ceil(priceRange[0]?.max ?? 0),
    },
    sizes: ordered.map((s) => ({ size: s._id, inStock: s.stock > 0 })),
  });
});

// ── GET /api/products/:slug ──────────────────────────────────────────────────
/** Accepts a slug (canonical, SEO-friendly) or an ObjectId (admin deep links). */
const getProduct = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const query = mongoose.isValidObjectId(slug)
    ? { $or: [{ _id: slug }, { slug: String(slug).toLowerCase() }] }
    : { slug: String(slug).toLowerCase() };

  const product = await Product.findOne(query)
    .populate('category', 'name slug')
    .lean({ virtuals: true });

  if (!product) throw ApiError.notFound('This product could not be found.');

  // Draft and archived products stay invisible to shoppers but remain
  // reachable for an admin previewing their own catalogue.
  if (product.status !== 'active' && req.user?.role !== 'admin') {
    throw ApiError.notFound('This product could not be found.');
  }

  return sendSuccess(res, { product });
});

// ── GET /api/products/:slug/related ──────────────────────────────────────────
const getRelatedProducts = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ slug: String(req.params.slug).toLowerCase() })
    .select('_id category tags')
    .lean();

  if (!product) return sendSuccess(res, { products: [] });

  const related = await Product.find({
    _id: { $ne: product._id },
    status: 'active',
    $or: [{ category: product.category }, { tags: { $in: product.tags || [] } }],
  })
    .select(LIST_FIELDS)
    .sort({ soldCount: -1, createdAt: -1 })
    .limit(8)
    .lean({ virtuals: true });

  return sendSuccess(res, { products: related });
});

// ── GET /api/products/collections/home ───────────────────────────────────────
/**
 * One request for the whole homepage instead of four.
 * Cuts round trips, which matters most on slow mobile connections.
 */
const getHomeCollections = asyncHandler(async (_req, res) => {
  const base = { status: 'active' };
  const pick = (extra, sort, limit = 8) =>
    Product.find({ ...base, ...extra })
      .select(LIST_FIELDS)
      .sort(sort)
      .limit(limit)
      .lean({ virtuals: true });

  const [newArrivals, featured, onSale, bestSellers] = await Promise.all([
    pick({ isNewArrival: true }, { createdAt: -1 }),
    pick({ isFeatured: true }, { createdAt: -1 }),
    pick({ $expr: { $lt: ['$price', '$mrp'] } }, { createdAt: -1 }),
    pick({ soldCount: { $gt: 0 } }, { soldCount: -1 }),
  ]);

  return sendSuccess(res, { newArrivals, featured, onSale, bestSellers });
});

// ── Admin: create ────────────────────────────────────────────────────────────
const createProduct = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.body.category);
  if (!category) throw ApiError.badRequest('Please choose a valid category.');

  const slug = await uniqueSlug(Product, req.body.slug || req.body.name);

  const product = await Product.create({
    name: req.body.name,
    slug,
    description: req.body.description,
    shortDescription: req.body.shortDescription || '',
    brand: req.body.brand,
    category: category._id,
    mrp: req.body.mrp,
    price: req.body.price,
    images: Array.isArray(req.body.images) ? req.body.images.slice(0, 6) : [],
    variants: normaliseVariants(req.body.variants, req.body.name),
    status: req.body.status || 'draft',
    isFeatured: Boolean(req.body.isFeatured),
    isNewArrival: Boolean(req.body.isNewArrival),
    tags: normaliseTags(req.body.tags),
    material: req.body.material || '',
    careInstructions: req.body.careInstructions || '',
    countryOfOrigin: req.body.countryOfOrigin || 'India',
    metaTitle: req.body.metaTitle || '',
    metaDescription: req.body.metaDescription || '',
  });

  return sendCreated(res, { product });
});

// ── Admin: update ────────────────────────────────────────────────────────────
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');

  if (req.body.category) {
    const category = await Category.findById(req.body.category);
    if (!category) throw ApiError.badRequest('Please choose a valid category.');
    product.category = category._id;
  }

  // Explicit allowlist — `ratingAverage`, `ratingCount`, `soldCount` and
  // `totalStock` are derived values and must never be settable over the API.
  const assignable = [
    'name', 'description', 'shortDescription', 'brand', 'mrp', 'price',
    'status', 'material', 'careInstructions', 'countryOfOrigin',
    'metaTitle', 'metaDescription',
  ];
  for (const field of assignable) {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  }

  if (req.body.isFeatured !== undefined) product.isFeatured = Boolean(req.body.isFeatured);
  if (req.body.isNewArrival !== undefined) product.isNewArrival = Boolean(req.body.isNewArrival);
  if (req.body.tags !== undefined) product.tags = normaliseTags(req.body.tags);

  if (Array.isArray(req.body.images)) {
    const removed = product.images.filter(
      (old) => old.publicId && !req.body.images.some((n) => n.publicId === old.publicId)
    );
    product.images = req.body.images.slice(0, 6);
    // Clean up orphaned files without blocking the response.
    removed.forEach((img) => storageService.deleteImage(img.publicId).catch(() => {}));
  }

  if (Array.isArray(req.body.variants)) {
    product.variants = normaliseVariants(req.body.variants, product.name, product.variants);
  }

  if (req.body.name && !req.body.slug) {
    product.slug = await uniqueSlug(Product, req.body.name, { excludeId: product._id });
  } else if (req.body.slug) {
    product.slug = await uniqueSlug(Product, req.body.slug, { excludeId: product._id });
  }

  await product.save();
  return sendSuccess(res, { product });
});

// ── Admin: archive (soft delete) ─────────────────────────────────────────────
/**
 * Products are archived, not deleted.
 *
 * A hard delete would orphan the `product` reference on every historical order
 * line, breaking order history permanently.
 */
const archiveProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');

  product.status = 'archived';
  await product.save();

  return sendSuccess(res, {
    product,
    message: 'Product archived. It is hidden from the store but order history is preserved.',
  });
});

// ── Admin: permanent delete (only when never ordered) ────────────────────────
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw ApiError.notFound('Product not found.');

  // eslint-disable-next-line global-require
  const Order = require('../models/Order');
  const referenced = await Order.exists({ 'items.product': product._id });
  if (referenced) {
    throw ApiError.conflict(
      'This product appears in existing orders and cannot be deleted. Archive it instead.',
      { code: 'PRODUCT_REFERENCED' }
    );
  }

  await Promise.all(
    (product.images || [])
      .filter((i) => i.publicId)
      .map((i) => storageService.deleteImage(i.publicId).catch(() => {}))
  );
  await Review.deleteMany({ product: product._id });
  await product.deleteOne();

  return sendSuccess(res, { message: 'Product deleted.' });
});

// ── Admin: adjust variant stock ──────────────────────────────────────────────
const updateVariantStock = asyncHandler(async (req, res) => {
  const { id, variantId } = req.params;
  const stock = Number(req.body.stock);

  if (!Number.isInteger(stock) || stock < 0) {
    throw ApiError.badRequest('Stock must be a whole number of 0 or more.');
  }

  const product = await Product.findById(id);
  if (!product) throw ApiError.notFound('Product not found.');

  const variant = product.variants.id(variantId);
  if (!variant) throw ApiError.notFound('Variant not found.');

  variant.stock = stock;
  await product.save(); // pre-validate recomputes totalStock

  return sendSuccess(res, { product });
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function normaliseTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [
    ...new Set(
      tags
        .filter((t) => typeof t === 'string')
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40)
    ),
  ].slice(0, 15);
}

/**
 * Normalises the variant array, auto-generating an SKU when the admin has not
 * supplied one, and preserving existing variant ids so stock is not reset by
 * an unrelated edit.
 */
function normaliseVariants(variants, productName, existing = []) {
  if (!Array.isArray(variants)) return existing;

  const skuBase = String(productName || 'ITEM')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8) || 'ITEM';

  return variants
    .filter((v) => v && typeof v.size === 'string' && v.size.trim())
    .slice(0, 12)
    .map((v) => {
      const size = v.size.trim().toUpperCase().slice(0, 12);
      const stock = Number.isInteger(Number(v.stock)) && Number(v.stock) >= 0 ? Number(v.stock) : 0;
      const prior = existing.find?.((e) => e._id?.toString() === v._id?.toString());

      return {
        ...(v._id ? { _id: v._id } : {}),
        size,
        color: typeof v.color === 'string' ? v.color.trim().slice(0, 40) : prior?.color || '',
        sku: (v.sku || prior?.sku || `${skuBase}-${size}`).toUpperCase().slice(0, 60),
        stock,
        isActive: v.isActive === undefined ? true : Boolean(v.isActive),
      };
    });
}

module.exports = {
  listProducts,
  getProduct,
  getFacets,
  getRelatedProducts,
  getHomeCollections,
  createProduct,
  updateProduct,
  archiveProduct,
  deleteProduct,
  updateVariantStock,
  LOW_STOCK_THRESHOLD: config.store.lowStockThreshold,
};
