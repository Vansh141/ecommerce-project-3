const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 32,
      index: true,
    },
    description: { type: String, trim: true, maxlength: 200, default: '' },

    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    /** Percent (0–100) when percentage, rupees when fixed. */
    discountValue: { type: Number, required: true, min: 0 },
    /** Caps the rupee value of a percentage coupon. 0 = uncapped. */
    maxDiscountAmount: { type: Number, default: 0, min: 0 },
    minOrderValue: { type: Number, default: 0, min: 0 },

    startsAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },

    isActive: { type: Boolean, default: true, index: true },

    /** 0 = unlimited. */
    totalUsageLimit: { type: Number, default: 0, min: 0 },
    perUserLimit: { type: Number, default: 1, min: 0 },
    usedCount: { type: Number, default: 0, min: 0 },

    /**
     * Per-user redemption ledger. Enforcing `perUserLimit` requires knowing who
     * has already redeemed; counting orders would miss cancelled ones.
     */
    redemptions: {
      type: [
        {
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
          order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
          amount: { type: Number, default: 0 },
          at: { type: Date, default: Date.now },
          _id: false,
        },
      ],
      default: [],
      select: false,
    },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

couponSchema.index({ isActive: 1, expiresAt: 1 });

couponSchema.virtual('isExpired').get(function isExpired() {
  return this.expiresAt instanceof Date && this.expiresAt.getTime() < Date.now();
});

couponSchema.virtual('isExhausted').get(function isExhausted() {
  return this.totalUsageLimit > 0 && this.usedCount >= this.totalUsageLimit;
});

// Mongoose 9 middleware is promise-based: no `next` callback, throw to fail.
couponSchema.pre('validate', function checkValues() {
  if (this.discountType === 'percentage' && this.discountValue > 100) {
    throw new Error('A percentage discount cannot exceed 100.');
  }
  if (this.expiresAt && this.startsAt && this.expiresAt <= this.startsAt) {
    throw new Error('Expiry must be after the start date.');
  }
});

module.exports = mongoose.model('Coupon', couponSchema);
