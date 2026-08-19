const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const BCRYPT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 8;
const LOCK_DURATION_MS = 15 * 60 * 1000;

const addressSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, maxlength: 40, default: 'Home' },
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    line1: { type: String, required: true, trim: true, maxlength: 200 },
    line2: { type: String, trim: true, maxlength: 200, default: '' },
    city: { type: String, required: true, trim: true, maxlength: 80 },
    state: { type: String, required: true, trim: true, maxlength: 80 },
    postalCode: { type: String, required: true, trim: true, maxlength: 12 },
    country: { type: String, trim: true, maxlength: 60, default: 'India' },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
      index: true,
    },
    // `select: false` keeps the hash out of every query result by default, so
    // it can never be serialised into an API response by accident.
    password: { type: String, required: true, select: false },
    phone: { type: String, trim: true, maxlength: 20, default: '' },

    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
      index: true,
    },

    /**
     * Incremented to invalidate every previously issued token for this user.
     * Bumped on password change, logout-everywhere, and role demotion — this
     * is what makes JWTs genuinely revocable.
     */
    tokenVersion: { type: Number, default: 0 },

    addresses: { type: [addressSchema], default: [] },

    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String, select: false, index: true },
    emailVerificationExpire: { type: Date, select: false },

    resetPasswordToken: { type: String, select: false, index: true },
    resetPasswordExpire: { type: Date, select: false },

    failedLoginAttempts: { type: Number, default: 0, select: false },
    lockUntil: { type: Date, select: false },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        delete ret.password;
        delete ret.resetPasswordToken;
        delete ret.resetPasswordExpire;
        delete ret.emailVerificationToken;
        delete ret.emailVerificationExpire;
        delete ret.failedLoginAttempts;
        delete ret.lockUntil;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.index({ createdAt: -1 });

// ── Virtuals ─────────────────────────────────────────────────────────────────
userSchema.virtual('isAdmin').get(function isAdmin() {
  return this.role === 'admin';
});

userSchema.virtual('isLocked').get(function isLocked() {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
});

// ── Hooks ────────────────────────────────────────────────────────────────────
/**
 * Hashing lives in the model, not in controllers, so *every* write path
 * (register, reset, admin seed, bootstrap script) hashes consistently. It is
 * impossible to persist a plaintext password through the model.
 */
// Mongoose 9 middleware is promise-based: there is no `next` callback. Hooks
// resolve by returning and fail by throwing.
userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(BCRYPT_ROUNDS);
  this.password = await bcrypt.hash(this.password, salt);
});

/** Exactly one default address, always. */
userSchema.pre('save', function enforceSingleDefaultAddress() {
  if (!this.isModified('addresses') || this.addresses.length === 0) return;

  const defaults = this.addresses.filter((a) => a.isDefault);
  if (defaults.length === 0) {
    this.addresses[0].isDefault = true;
  } else if (defaults.length > 1) {
    // Keep the most recently flagged one only.
    let kept = false;
    for (let i = this.addresses.length - 1; i >= 0; i -= 1) {
      if (this.addresses[i].isDefault) {
        if (kept) this.addresses[i].isDefault = false;
        else kept = true;
      }
    }
  }
});

// ── Methods ──────────────────────────────────────────────────────────────────
userSchema.methods.matchPassword = async function matchPassword(candidate) {
  if (typeof candidate !== 'string' || !this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

/**
 * Per-account brute-force protection, complementing the per-IP rate limiter.
 * IP limits alone are defeated by a rotating proxy pool; this is not.
 */
userSchema.methods.registerFailedLogin = async function registerFailedLogin() {
  const update = { $inc: { failedLoginAttempts: 1 } };
  const attempts = (this.failedLoginAttempts || 0) + 1;

  if (attempts >= MAX_LOGIN_ATTEMPTS && !this.isLocked) {
    update.$set = { lockUntil: new Date(Date.now() + LOCK_DURATION_MS) };
  }
  await this.constructor.updateOne({ _id: this._id }, update);
};

userSchema.methods.clearLoginAttempts = async function clearLoginAttempts() {
  await this.constructor.updateOne(
    { _id: this._id },
    { $set: { failedLoginAttempts: 0, lastLoginAt: new Date() }, $unset: { lockUntil: 1 } }
  );
};

/**
 * Returns the *raw* token for emailing; only its SHA-256 hash is stored, so a
 * database leak does not hand over working reset links.
 */
userSchema.methods.createPasswordResetToken = function createPasswordResetToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.resetPasswordExpire = new Date(Date.now() + 15 * 60 * 1000);
  return rawToken;
};

userSchema.methods.createEmailVerificationToken = function createEmailVerificationToken() {
  const rawToken = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
  this.emailVerificationExpire = new Date(Date.now() + 24 * 60 * 60 * 1000);
  return rawToken;
};

userSchema.statics.hashToken = function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
};

/** The safe shape returned to clients and embedded in auth responses. */
userSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    _id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone,
    role: this.role,
    isAdmin: this.role === 'admin',
    emailVerified: this.emailVerified,
    createdAt: this.createdAt,
  };
};

userSchema.statics.MAX_LOGIN_ATTEMPTS = MAX_LOGIN_ATTEMPTS;

module.exports = mongoose.model('User', userSchema);
