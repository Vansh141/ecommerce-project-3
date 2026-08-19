const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Rate limiters.
 *
 * All limiters use the library's default key generator, which normalises
 * IPv4-mapped IPv6 addresses and applies a subnet mask — writing a custom
 * `keyGenerator` here would reintroduce the bypass that CVE-fixed versions
 * specifically address.
 *
 * Limits are disabled under NODE_ENV=test so the suite is not throttled.
 */
function build(name, { windowMs, max, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    limit: max,
    // Disabling must use `skip`, NOT `limit: 0`. Since v7, a limit of 0 blocks
    // every request instead of allowing them — the exact opposite of "off".
    skip: () => config.isTest,
    skipSuccessfulRequests,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        limiter: name,
        ip: req.ip,
        path: req.originalUrl,
      });
      res.status(429).json({
        success: false,
        error: { message, code: 'RATE_LIMITED' },
      });
    },
  });
}

/** Broad backstop across the whole API. Generous enough for normal browsing. */
const globalLimiter = build('global', {
  windowMs: 60 * 1000,
  max: 300,
  message: 'Too many requests. Please slow down and try again shortly.',
});

/** Login / register. Successful requests are not counted so a legitimate
 *  shopper signing in repeatedly is never locked out by their own success. */
const authLimiter = build('auth', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: 'Too many authentication attempts. Please try again in 15 minutes.',
});

/** Password reset request and reset confirmation. */
const passwordResetLimiter = build('passwordReset', {
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password reset attempts. Please try again in an hour.',
});

/** Order placement — throttles automated checkout abuse and stock probing. */
const orderLimiter = build('order', {
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: 'Too many order attempts. Please wait a few minutes and try again.',
});

/** Payment initiation / verification. */
const paymentLimiter = build('payment', {
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: 'Too many payment attempts. Please wait a few minutes and try again.',
});

/** Image uploads — expensive (decode + re-encode), so kept tight. */
const uploadLimiter = build('upload', {
  windowMs: 10 * 60 * 1000,
  max: 40,
  message: 'Too many uploads. Please wait a few minutes and try again.',
});

/** Public write endpoints that email or persist unauthenticated input. */
const publicWriteLimiter = build('publicWrite', {
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many submissions. Please try again later.',
});

/** Coupon code validation — prevents brute-forcing the coupon namespace. */
const couponLimiter = build('coupon', {
  windowMs: 10 * 60 * 1000,
  max: 25,
  message: 'Too many coupon attempts. Please wait a few minutes and try again.',
});

module.exports = {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  orderLimiter,
  paymentLimiter,
  uploadLimiter,
  publicWriteLimiter,
  couponLimiter,
};
