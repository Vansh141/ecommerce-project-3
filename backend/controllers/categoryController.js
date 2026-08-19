const Category = require('../models/Category');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { uniqueSlug } = require('../utils/slugify');
const storageService = require('../services/storageService');

// ── GET /api/categories ──────────────────────────────────────────────────────
/** Public: active categories with live product counts, for nav and filters. */
const listCategories = asyncHandler(async (req, res) => {
  const includeInactive = req.user?.role === 'admin' && req.query.all === 'true';
  const filter = includeInactive ? {} : { isActive: true };

  const categories = await Category.find(filter)
    .sort({ displayOrder: 1, name: 1 })
    .lean({ virtuals: true });

  // One aggregation rather than a query per category.
  const counts = await Product.aggregate([
    { $match: { status: 'active' } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  return sendSuccess(res, {
    categories: categories.map((c) => ({ ...c, productCount: countMap.get(String(c._id)) || 0 })),
  });
});

// ── GET /api/categories/:slug ────────────────────────────────────────────────
const getCategory = asyncHandler(async (req, res) => {
  const category = await Category.findOne({ slug: String(req.params.slug).toLowerCase() }).lean({
    virtuals: true,
  });

  if (!category) throw ApiError.notFound('Category not found.');
  if (!category.isActive && req.user?.role !== 'admin') {
    throw ApiError.notFound('Category not found.');
  }

  return sendSuccess(res, { category });
});

// ── Admin ────────────────────────────────────────────────────────────────────
const createCategory = asyncHandler(async (req, res) => {
  const slug = await uniqueSlug(Category, req.body.slug || req.body.name);

  const category = await Category.create({
    name: req.body.name,
    slug,
    description: req.body.description || '',
    image: req.body.image || { url: '', publicId: '', alt: '' },
    parent: req.body.parent || null,
    isActive: req.body.isActive === undefined ? true : Boolean(req.body.isActive),
    showInNav: req.body.showInNav === undefined ? true : Boolean(req.body.showInNav),
    displayOrder: Number.isFinite(Number(req.body.displayOrder)) ? Number(req.body.displayOrder) : 0,
    metaTitle: req.body.metaTitle || '',
    metaDescription: req.body.metaDescription || '',
  });

  return sendCreated(res, { category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found.');

  if (req.body.parent && String(req.body.parent) === String(category._id)) {
    throw ApiError.badRequest('A category cannot be its own parent.');
  }

  const assignable = ['name', 'description', 'metaTitle', 'metaDescription'];
  for (const field of assignable) {
    if (req.body[field] !== undefined) category[field] = req.body[field];
  }

  if (req.body.isActive !== undefined) category.isActive = Boolean(req.body.isActive);
  if (req.body.showInNav !== undefined) category.showInNav = Boolean(req.body.showInNav);
  if (req.body.displayOrder !== undefined) category.displayOrder = Number(req.body.displayOrder) || 0;
  if (req.body.parent !== undefined) category.parent = req.body.parent || null;

  if (req.body.image !== undefined) {
    const oldPublicId = category.image?.publicId;
    category.image = req.body.image || { url: '', publicId: '', alt: '' };
    if (oldPublicId && oldPublicId !== category.image.publicId) {
      storageService.deleteImage(oldPublicId).catch(() => {});
    }
  }

  if (req.body.name && !req.body.slug) {
    category.slug = await uniqueSlug(Category, req.body.name, { excludeId: category._id });
  } else if (req.body.slug) {
    category.slug = await uniqueSlug(Category, req.body.slug, { excludeId: category._id });
  }

  await category.save();
  return sendSuccess(res, { category });
});

/**
 * Deletion is refused while any product still points at the category.
 * Silently reassigning or orphaning products would corrupt the catalogue.
 */
const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) throw ApiError.notFound('Category not found.');

  const [productCount, childCount] = await Promise.all([
    Product.countDocuments({ category: category._id }),
    Category.countDocuments({ parent: category._id }),
  ]);

  if (productCount > 0) {
    throw ApiError.conflict(
      `${productCount} product${productCount === 1 ? '' : 's'} still use${productCount === 1 ? 's' : ''} this category. Move them first, or deactivate the category instead.`,
      { code: 'CATEGORY_IN_USE' }
    );
  }
  if (childCount > 0) {
    throw ApiError.conflict('This category has sub-categories. Remove them first.', {
      code: 'CATEGORY_HAS_CHILDREN',
    });
  }

  if (category.image?.publicId) {
    storageService.deleteImage(category.image.publicId).catch(() => {});
  }
  await category.deleteOne();

  return sendSuccess(res, { message: 'Category deleted.' });
});

module.exports = { listCategories, getCategory, createCategory, updateCategory, deleteCategory };
