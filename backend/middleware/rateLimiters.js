const rateLimit = require('express-rate-limit');
const config = require('../config/env');
const logger = require('../utils/logger');

/**
 * Rate limiters.
 *
 * IP-keyed limiters use the library's default key generator, which normalises
 * IPv4-mapped IPv6 addresses and applies a subnet mask — writing a custom
 * IP-based `keyGenerator` here would reintroduce the bypass that CVE-fixed
 * versions specifically address. The one custom key below is an account id, on
 * routes that are only reachable after `protect` has identified the caller.
 *
 * Limits are disabled under NODE_ENV=test so the suite is not throttled. The
 * rate-limit tests opt back in with RATE_LIMIT_IN_TESTS=true; that flag is read
 * per request and has no effect outside NODE_ENV=test.
 */
const disabledForTests = () => config.isTest && process.env.RATE_LIMIT_IN_TESTS !== 'true';

function build(
  name,
  { windowMs, max, message, skipSuccessfulRequests = false, skip, requestWasSuccessful, keyGenerator }
) {
  return rateLimit({
    windowMs,
    limit: max,
    // Disabling must use `skip`, NOT `limit: 0`. Since v7, a limit of 0 blocks
    // every request instead of allowing them — the exact opposite of "off".
    skip: (req, res) => disabledForTests() || Boolean(skip && skip(req, res)),
    skipSuccessfulRequests,
    ...(requestWasSuccessful ? { requestWasSuccessful } : {}),
    ...(keyGenerator ? { keyGenerator } : {}),
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

/**
 * Session refresh.
 *
 * Only requests that present a refresh cookie are considered, and only failed
 * ones count. An anonymous visitor's boot-time check carries no cookie and is
 * rejected before any token or database work, and a signed-in shopper's
 * successful refresh never counts — what remains is someone replaying expired,
 * revoked or forged refresh tokens, which is the pattern worth throttling.
 */
const refreshLimiter = build('refresh', {
  windowMs: 15 * 60 * 1000,
  max: 30,
  skipSuccessfulRequests: true,
  skip: (req) => !req.cookies?.[config.cookie.name],
  message: 'Too many attempts to restore your session. Please sign in again in a few minutes.',
});

/** Requesting a password reset link — every accepted request sends email. */
const passwordResetLimiter = build('passwordReset', {
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many password reset attempts. Please try again in an hour.',
});

/**
 * Setting a new password from an emailed link.
 *
 * A separate budget from the request limiter, so a shopper who asked for the
 * link several times can still use it. Successful resets are not counted;
 * failures (an expired link, a password that fails the policy) are.
 */
const passwordResetConfirmLimiter = build('passwordResetConfirm', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  message: 'Too many password reset attempts. Please wait 15 minutes and try again.',
});

/** Re-sending the email verification link. */
const verificationEmailLimiter = build('verificationEmail', {
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many verification emails requested. Please try again in an hour.',
});

/**
 * Re-authentication behind a session.
 *
 * Changing the password and closing the account both check the current
 * password, which would otherwise be an unthrottled guessing oracle for anyone
 * holding a session. Keyed per account, so shoppers who share a network never
 * throttle each other; successful attempts are not counted.
 */
const accountSecurityLimiter = build('accountSecurity', {
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `account:${req.user?._id}`,
  message: 'Too many attempts. Please wait 15 minutes and try again.',
});

/**
 * Cart pricing.
 *
 * Public so a guest can see totals, and every call reads the catalogue, so it
 * is bounded here rather than only by the global backstop. The storefront sends
 * one debounced request per change to the bag — far below this.
 */
const previewLimiter = build('preview', {
  windowMs: 10 * 60 * 1000,
  max: 200,
  message: 'Too many bag updates. Please wait a moment and try again.',
});

/**
 * Coupon guessing through the cart preview.
 *
 * The preview accepts a coupon code, so without this it would be a way around
 * `couponLimiter` on /coupons/validate. Only previews that carry a code are
 * considered, and only codes that do not exist, have expired or are used up
 * count (the controller sets `res.locals.couponRejected`). A real coupon that
 * simply needs a bigger bag keeps re-pricing as the shopper edits quantities.
 */
const previewCouponLimiter = build('previewCoupon', {
  windowMs: 10 * 60 * 1000,
  max: 25,
  skip: (req) => !(typeof req.body?.couponCode === 'string' && req.body.couponCode.trim()),
  skipSuccessfulRequests: true,
  requestWasSuccessful: (_req, res) => res.statusCode < 400 && !res.locals.couponRejected,
  message: 'Too many coupon attempts. Please wait a few minutes and try again.',
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

/**
 * Homepage product sections. Public and read-only, but one call runs a query
 * per section, so it carries its own bound. A page load sends one request.
 */
const productSectionsLimiter = build('productSections', {
  windowMs: 10 * 60 * 1000,
  max: 300,
  message: 'Too many requests. Please wait a moment and try again.',
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
  refreshLimiter,
  passwordResetLimiter,
  passwordResetConfirmLimiter,
  verificationEmailLimiter,
  accountSecurityLimiter,
  previewLimiter,
  previewCouponLimiter,
  orderLimiter,
  paymentLimiter,
  uploadLimiter,
  publicWriteLimiter,
  couponLimiter,
  productSectionsLimiter,
};
