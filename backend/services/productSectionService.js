const Product = require('../models/Product');
const Category = require('../models/Category');

/**
 * Products for homepage sections.
 *
 * The homepage builder never copies products: a section names a source — new
 * arrivals, on sale, featured, popular, newest, one category, or products
 * picked by hand — and this resolves every section on the page in a single
 * request. Only `active` products are ever returned, so a draft, archived or
 * deleted product simply drops out of a hand-picked list.
 */

/** Fields safe to expose on a list card; matches the catalogue list. */
const LIST_FIELDS =
  'name slug brand price mrp images status isFeatured isNewArrival ratingAverage ratingCount totalStock variants.size variants.stock variants.isActive createdAt';

const NEWEST = { createdAt: -1, _id: -1 };

const SOURCES = {
  newArrivals: { filter: { isNewArrival: true }, sort: NEWEST },
  // "On sale" means a genuine markdown exists, not a decorative badge.
  onSale: { filter: { $expr: { $lt: ['$price', '$mrp'] } }, sort: NEWEST },
  featured: { filter: { isFeatured: true }, sort: NEWEST },
  popular: { filter: { soldCount: { $gt: 0 } }, sort: { soldCount: -1, createdAt: -1 } },
  newest: { filter: {}, sort: NEWEST },
};

const MAX_LIMIT = 24;

const list = (filter, sort, limit) =>
  Product.find({ status: 'active', ...filter })
    .select(LIST_FIELDS)
    .populate('category', 'name slug')
    .sort(sort)
    .limit(limit)
    .lean({ virtuals: true });

const count = (filter) => Product.countDocuments({ status: 'active', ...filter });

async function resolveSection(section) {
  const limit = Math.min(Math.max(Number.parseInt(section.limit, 10) || 8, 1), MAX_LIMIT);

  if (section.source === 'manual') {
    const ids = [...new Set((section.products || []).map(String))];
    if (ids.length === 0) return { products: [], total: 0, source: 'manual' };
    const found = await Product.find({ status: 'active', _id: { $in: ids } })
      .select(LIST_FIELDS)
      .populate('category', 'name slug')
      .lean({ virtuals: true });
    const byId = new Map(found.map((product) => [String(product._id), product]));
    // The admin's order, not the database's.
    const products = ids.map((id) => byId.get(id)).filter(Boolean).slice(0, limit);
    return { products, total: products.length, source: 'manual' };
  }

  if (section.source === 'category') {
    const category = await Category.findOne({ _id: section.category, isActive: true }).select('_id slug').lean();
    if (!category) return { products: [], total: 0, source: 'category' };
    const filter = { category: category._id };
    const [products, total] = await Promise.all([list(filter, NEWEST, limit), count(filter)]);
    return { products, total, source: 'category', categorySlug: category.slug };
  }

  const definition = SOURCES[section.source];
  if (!definition) return { products: [], total: 0, source: section.source };

  const [products, total] = await Promise.all([
    list(definition.filter, definition.sort, limit),
    count(definition.filter),
  ]);

  // A store that has flagged nothing yet shows its newest stock rather than
  // an empty rail, when the section asks for that.
  if (products.length === 0 && section.fallbackToNewest && section.source !== 'newest') {
    const [newest, newestTotal] = await Promise.all([list({}, NEWEST, limit), count({})]);
    return { products: newest, total: newestTotal, source: 'newest' };
  }

  return { products, total, source: section.source };
}

/** Resolves every requested section in parallel, keyed by section id. */
async function resolveProductSections(sections) {
  const entries = await Promise.all(
    sections.map(async (section) => [section.id, await resolveSection(section)])
  );
  return Object.fromEntries(entries);
}

module.exports = { resolveProductSections, PRODUCT_SECTION_SOURCES: Object.keys(SOURCES).concat(['category', 'manual']) };
