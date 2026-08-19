const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    description: { type: String, trim: true, maxlength: 500, default: '' },

    image: {
      url: { type: String, trim: true, default: '' },
      publicId: { type: String, trim: true, default: '' },
      alt: { type: String, trim: true, maxlength: 160, default: '' },
    },

    /** Self-reference so a two-level menu (Women → Dresses) works without a rewrite. */
    parent: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', default: null, index: true },

    isActive: { type: Boolean, default: true, index: true },
    showInNav: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },

    metaTitle: { type: String, trim: true, maxlength: 70, default: '' },
    metaDescription: { type: String, trim: true, maxlength: 180, default: '' },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

categorySchema.index({ isActive: 1, displayOrder: 1 });
categorySchema.index({ parent: 1, isActive: 1 });

categorySchema.virtual('children', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parent',
});

module.exports = mongoose.model('Category', categorySchema);
