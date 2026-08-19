const mongoose = require('mongoose');
const { discountPercent } = require('../utils/money');

/**
 * A purchasable variant of a product.
 *
 * Size is the only differentiator today. `color` is present but optional so a
 * colour dimension can be introduced later by populating it and widening the
 * uniqueness rule — no migration of existing documents required.
 */
const variantSchema = new mongoose.Schema(
  {
    size: { type: String, required: true, trim: true, uppercase: true, maxlength: 12 },
    color: { type: String, trim: true, maxlength: 40, default: '' },
    sku: { type: String, required: true, trim: true, uppercase: true, maxlength: 60 },
    /** Authoritative stock. Only ever changed via atomic conditional updates. */
    stock: { type: Number, required: true, default: 0, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: true }
);

const imageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true, trim: true },
    publicId: { type: String, trim: true, default: '' },
    alt: { type: String, trim: true, maxlength: 160, default: '' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    shortDescription: { type: String, trim: true, maxlength: 300, default: '' },

    brand: { type: String, required: true, trim: true, maxlength: 80, default: 'TOUCH' },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
      index: true,
    },

    /** Compare-at price. Must be >= price; enforced in the pre-validate hook. */
    mrp: { type: Number, required: true, min: 0 },
    /** Actual selling price. */
    price: { type: Number, required: true, min: 0, index: true },

    images: { type: [imageSchema], default: [] },
    variants: { type: [variantSchema], default: [] },

    /**
     * `archived` replaces hard deletion so historical order lines keep a
     * resolvable product reference.
     */
    status: {
      type: String,
      enum: ['draft', 'active', 'archived'],
      default: 'draft',
      index: true,
    },

    isFeatured: { type: Boolean, default: false, index: true },
    isNewArrival: { type: Boolean, default: false, index: true },

    tags: { type: [String], default: [], index: true },
    material: { type: String, trim: true, maxlength: 120, default: '' },
    careInstructions: { type: String, trim: true, maxlength: 500, default: '' },
    countryOfOrigin: { type: String, trim: true, maxlength: 60, default: 'India' },

    /**
     * Derived from Review documents by reviewService. Never settable through
     * the product API — the admin product form does not expose these.
     */
    ratingAverage: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },

    /** Denormalised sum of variant stock; keeps "in stock" filters indexable. */
    totalStock: { type: Number, default: 0, min: 0, index: true },

    soldCount: { type: Number, default: 0, min: 0 },

    metaTitle: { type: String, trim: true, maxlength: 70, default: '' },
    metaDescription: { type: String, trim: true, maxlength: 180, default: '' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Indexes ──────────────────────────────────────────────────────────────────
// Weighted text index powers keyword search without a regex scan.
productSchema.index(
  { name: 'text', brand: 'text', tags: 'text', shortDescription: 'text', description: 'text' },
  {
    name: 'product_search_idx',
    weights: { name: 10, brand: 5, tags: 4, shortDescription: 2, description: 1 },
  }
);
// Compound indexes matched to the real PLP query shapes.
productSchema.index({ status: 1, category: 1, price: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ status: 1, isFeatured: 1, createdAt: -1 });
productSchema.index({ status: 1, isNewArrival: 1, createdAt: -1 });
productSchema.index({ status: 1, totalStock: 1 });
productSchema.index({ 'variants.sku': 1 });

// ── Virtuals ─────────────────────────────────────────────────────────────────
productSchema.virtual('discountPercent').get(function getDiscount() {
  return discountPercent(this.mrp, this.price);
});

productSchema.virtual('thumbnail').get(function getThumbnail() {
  return this.images?.[0]?.url || '';
});

productSchema.virtual('inStock').get(function getInStock() {
  return (this.totalStock || 0) > 0;
});

productSchema.virtual('availableSizes').get(function getAvailableSizes() {
  return (this.variants || []).filter((v) => v.isActive && v.stock > 0).map((v) => v.size);
});

// ── Hooks ────────────────────────────────────────────────────────────────────
// Mongoose 9 middleware is promise-based: no `next` callback, throw to fail.
productSchema.pre('validate', function normalise() {
  // A compare-at price below the selling price would render a negative
  // discount badge; treat it as "no MRP set".
  if (typeof this.mrp === 'number' && typeof this.price === 'number' && this.mrp < this.price) {
    this.mrp = this.price;
  }

  if (Array.isArray(this.variants) && this.variants.length > 0) {
    const seen = new Set();
    for (const v of this.variants) {
      const key = `${(v.size || '').toUpperCase()}::${(v.color || '').toLowerCase()}`;
      if (seen.has(key)) {
        throw new Error(`Duplicate variant for size "${v.size}".`);
      }
      seen.add(key);
    }
  }

  this.totalStock = (this.variants || [])
    .filter((v) => v.isActive)
    .reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
});

/**
 * Recomputes `totalStock` after an atomic `$inc` on a variant's stock, so the
 * denormalised field cannot drift away from the variant array.
 */
productSchema.statics.recalculateStock = async function recalculateStock(productId) {
  const product = await this.findById(productId).select('variants totalStock');
  if (!product) return null;
  const total = (product.variants || [])
    .filter((v) => v.isActive)
    .reduce((sum, v) => sum + (Number(v.stock) || 0), 0);
  if (total !== product.totalStock) {
    await this.updateOne({ _id: productId }, { $set: { totalStock: total } });
  }
  return total;
};

module.exports = mongoose.model('Product', productSchema);
