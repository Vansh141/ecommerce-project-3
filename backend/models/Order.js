const mongoose = require('mongoose');
const Counter = require('./Counter');

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'packed',
  'shipped',
  'delivered',
  'cancelled',
  'refunded',
];

/** Statuses from which an order may still legitimately move forward. */
const ACTIVE_STATUSES = ['pending', 'confirmed', 'packed', 'shipped'];
const TERMINAL_STATUSES = ['delivered', 'cancelled', 'refunded'];

/** Allowed forward transitions. Anything not listed here is rejected. */
const STATUS_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['shipped', 'cancelled'],
  shipped: ['delivered', 'cancelled'],
  delivered: ['refunded'],
  cancelled: ['refunded'],
  refunded: [],
};

const PAYMENT_METHODS = ['COD', 'RAZORPAY'];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'];

/**
 * Order line. Every display field is a snapshot taken at purchase time, so the
 * order remains an accurate historical record even if the product is renamed,
 * repriced, or archived.
 */
const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    variantId: { type: mongoose.Schema.Types.ObjectId, required: true },

    name: { type: String, required: true },
    slug: { type: String, default: '' },
    image: { type: String, default: '' },
    brand: { type: String, default: '' },
    sku: { type: String, required: true },
    size: { type: String, required: true },
    color: { type: String, default: '' },

    /** Unit price actually charged. */
    price: { type: Number, required: true, min: 0 },
    /** Unit compare-at price at purchase time. */
    mrp: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true, index: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    items: {
      type: [orderItemSchema],
      required: true,
      validate: [(v) => Array.isArray(v) && v.length > 0, 'An order must contain at least one item.'],
    },

    /** Address snapshot — editing the address book must not rewrite history. */
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String, default: '' },
      city: { type: String, required: true },
      state: { type: String, required: true },
      postalCode: { type: String, required: true },
      country: { type: String, default: 'India' },
    },

    /** Every figure here is computed server-side; client totals are discarded. */
    pricing: {
      itemsTotal: { type: Number, required: true, min: 0 },
      discountTotal: { type: Number, default: 0, min: 0 },
      shippingTotal: { type: Number, default: 0, min: 0 },
      taxTotal: { type: Number, default: 0, min: 0 },
      grandTotal: { type: Number, required: true, min: 0 },
      currency: { type: String, default: 'INR' },
      taxInclusive: { type: Boolean, default: true },
    },

    coupon: {
      code: { type: String, default: null },
      couponId: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
      discountType: { type: String, enum: ['percentage', 'fixed', null], default: null },
      discountValue: { type: Number, default: 0 },
      discountAmount: { type: Number, default: 0 },
    },

    payment: {
      method: { type: String, enum: PAYMENT_METHODS, required: true },
      status: { type: String, enum: PAYMENT_STATUSES, default: 'pending', index: true },
      amount: { type: Number, default: 0 },
      razorpayOrderId: { type: String, default: null, index: true },
      razorpayPaymentId: { type: String, default: null, index: true },
      razorpaySignature: { type: String, default: null },
      paidAt: { type: Date, default: null },
      failureReason: { type: String, default: null },
    },

    status: { type: String, enum: ORDER_STATUSES, default: 'pending', index: true },
    statusHistory: {
      type: [
        {
          status: { type: String, enum: ORDER_STATUSES, required: true },
          at: { type: Date, default: Date.now },
          by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
          note: { type: String, default: '' },
          _id: false,
        },
      ],
      default: [],
    },

    cancellation: {
      reason: { type: String, default: null },
      at: { type: Date, default: null },
      by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    },

    refund: {
      amount: { type: Number, default: 0 },
      refundId: { type: String, default: null },
      status: { type: String, enum: ['none', 'pending', 'processed', 'failed'], default: 'none' },
      at: { type: Date, default: null },
      reason: { type: String, default: null },
    },

    /**
     * Idempotency guard. Cancelling twice must not credit stock twice, and a
     * webhook retry must not double-process. Flipped atomically.
     */
    stockRestored: { type: Boolean, default: false },
    /** True once stock has been deducted, so we never deduct twice. */
    stockReserved: { type: Boolean, default: false },

    deliveredAt: { type: Date, default: null },
    shippedAt: { type: Date, default: null },
    trackingNumber: { type: String, default: '' },
    customerNote: { type: String, default: '', maxlength: 500 },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
);

// ── Indexes matched to real query shapes ─────────────────────────────────────
orderSchema.index({ user: 1, createdAt: -1 }); // "my orders"
orderSchema.index({ status: 1, createdAt: -1 }); // admin filter by status
orderSchema.index({ 'payment.status': 1, createdAt: -1 }); // revenue / unpaid reports
orderSchema.index({ createdAt: -1 });

// ── Virtuals ─────────────────────────────────────────────────────────────────
orderSchema.virtual('isPaid').get(function isPaid() {
  return this.payment?.status === 'paid';
});

orderSchema.virtual('isDelivered').get(function isDelivered() {
  return this.status === 'delivered';
});

orderSchema.virtual('itemCount').get(function itemCount() {
  return (this.items || []).reduce((sum, i) => sum + i.qty, 0);
});

/** Whether the *status* permits cancellation. Time-window and ownership rules
 *  live in orderService, which owns the full policy. */
orderSchema.virtual('isCancellable').get(function isCancellable() {
  return ['pending', 'confirmed', 'packed'].includes(this.status);
});

// ── Hooks ────────────────────────────────────────────────────────────────────
// Mongoose 9 middleware is promise-based: no `next` callback.
orderSchema.pre('save', async function assignOrderNumber() {
  if (this.orderNumber) return;
  const seq = await Counter.next('order');
  const year = new Date().getFullYear().toString().slice(-2);
  this.orderNumber = `TCH${year}${String(seq).padStart(6, '0')}`;
});

orderSchema.pre('save', function seedStatusHistory() {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status, at: new Date(), note: 'Order placed' });
  }
});

// ── Statics ──────────────────────────────────────────────────────────────────
orderSchema.statics.STATUSES = ORDER_STATUSES;
orderSchema.statics.ACTIVE_STATUSES = ACTIVE_STATUSES;
orderSchema.statics.TERMINAL_STATUSES = TERMINAL_STATUSES;
orderSchema.statics.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
orderSchema.statics.PAYMENT_METHODS = PAYMENT_METHODS;
orderSchema.statics.PAYMENT_STATUSES = PAYMENT_STATUSES;

orderSchema.statics.canTransition = function canTransition(from, to) {
  return (STATUS_TRANSITIONS[from] || []).includes(to);
};

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;
module.exports.PAYMENT_STATUSES = PAYMENT_STATUSES;
module.exports.STATUS_TRANSITIONS = STATUS_TRANSITIONS;
