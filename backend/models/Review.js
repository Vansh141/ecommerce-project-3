const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    /** Proof of purchase. A review cannot exist without a delivered order. */
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },

    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120, default: '' },
    comment: { type: String, required: true, trim: true, maxlength: 2000 },

    /** Always true given the order requirement, but stored for display. */
    isVerifiedPurchase: { type: Boolean, default: true },
    /** Lets an admin hide abusive content without destroying the record. */
    isApproved: { type: Boolean, default: true, index: true },

    userName: { type: String, required: true },
  },
  { timestamps: true }
);

/**
 * One review per user per product. A unique index — rather than an application
 * check — is what actually prevents duplicate-review abuse under concurrency.
 */
reviewSchema.index({ product: 1, user: 1 }, { unique: true });
reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
