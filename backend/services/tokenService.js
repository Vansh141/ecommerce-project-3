const jwt = require('jsonwebtoken');
const config = require('../config/env');
const ApiError = require('../utils/ApiError');

/**
 * Token strategy
 * ──────────────
 * Access token  : short-lived (15m), returned in the JSON body, held in memory
 *                 by the SPA. Never written to localStorage, so an XSS payload
 *                 cannot simply read it out of storage.
 * Refresh token : long-lived (30d), delivered as an httpOnly + Secure cookie
 *                 scoped to /api/auth. JavaScript cannot read it at all.
 *
 * Both carry `tv` (tokenVersion). Bumping the user's tokenVersion instantly
 * invalidates every token ever issued to them — this is what makes logout
 * everywhere, password change, and admin demotion actually take effect.
 */

const ACCESS_AUDIENCE = 'touch:access';
const REFRESH_AUDIENCE = 'touch:refresh';

function signAccessToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), role: user.role, tv: user.tokenVersion ?? 0 },
    config.jwt.accessSecret,
    {
      expiresIn: config.jwt.accessTtl,
      issuer: config.jwt.issuer,
      audience: ACCESS_AUDIENCE,
    }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user._id.toString(), tv: user.tokenVersion ?? 0 },
    config.jwt.refreshSecret,
    {
      expiresIn: config.jwt.refreshTtl,
      issuer: config.jwt.issuer,
      audience: REFRESH_AUDIENCE,
    }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: config.jwt.issuer,
    audience: ACCESS_AUDIENCE,
  });
}

function verifyRefreshToken(token) {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: config.jwt.issuer,
    audience: REFRESH_AUDIENCE,
  });
}

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    path: config.cookie.path,
    maxAge: config.jwt.refreshTtlMs,
    ...(config.cookie.domain ? { domain: config.cookie.domain } : {}),
  };
}

function setRefreshCookie(res, token) {
  res.cookie(config.cookie.name, token, refreshCookieOptions());
}

function clearRefreshCookie(res) {
  const { maxAge, ...opts } = refreshCookieOptions();
  res.clearCookie(config.cookie.name, opts);
}

function readRefreshCookie(req) {
  return req.cookies?.[config.cookie.name] || null;
}

/** Issues a fresh pair and installs the refresh cookie. */
function issueSession(res, user) {
  const accessToken = signAccessToken(user);
  setRefreshCookie(res, signRefreshToken(user));
  return { accessToken, expiresIn: config.jwt.accessTtl };
}

/**
 * Cross-site cookie requests are only possible after a successful CORS
 * preflight, and a custom header forces that preflight. Since the CORS layer
 * only echoes allowlisted origins, a malicious site cannot obtain approval —
 * so requiring this header is effective CSRF protection for the cookie-
 * authenticated endpoints (refresh, logout).
 */
function requireCsrfHeader(req, _res, next) {
  const header = req.get('X-Requested-With');
  if (header !== 'XMLHttpRequest') {
    return next(
      ApiError.forbidden('Missing required request header.', { code: 'CSRF_HEADER_REQUIRED' })
    );
  }
  return next();
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  readRefreshCookie,
  issueSession,
  requireCsrfHeader,
};
