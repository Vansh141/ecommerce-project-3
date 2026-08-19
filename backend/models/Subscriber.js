const mongoose = require('mongoose');
const crypto = require('crypto');

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    isActive: { type: Boolean, default: true, index: true },
    /** Opaque token for one-click unsubscribe — a legal requirement once
     *  marketing email is sent, and it must not be guessable from the address. */
    unsubscribeToken: { type: String, index: true },
    unsubscribedAt: { type: Date, default: null },
    source: { type: String, default: 'footer' },
  },
  { timestamps: true }
);

// Mongoose 9 middleware is promise-based: no `next` callback.
subscriberSchema.pre('save', function ensureToken() {
  if (!this.unsubscribeToken) {
    this.unsubscribeToken = crypto.randomBytes(24).toString('hex');
  }
});

module.exports = mongoose.model('Subscriber', subscriberSchema);
