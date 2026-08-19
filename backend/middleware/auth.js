const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../services/tokenService');

function extractBearer(req) {
  const header = req.headers.authorization;
  if (!header || typeof header !== 'string') return null;
  const [scheme, token] = header.split(' ');
  if (!/^Bearer$/i.test(scheme) || !token) return null;
  return token.trim();
}

/**
 * Loads and validates the caller.
 *
 * Four things are checked, and skipping any one of them has bitten this
 * codebase before:
 *   1. the signature is valid
 *   2. the user still exists          (a deleted account must not stay usable)
 *   3. the account is active
 *   4. the token's version matches    (revocation on password change / demote)
 */
const protect = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req);
  if (!token) {
    throw ApiError.unauthorized('Not authenticated. Please sign in.', { code: 'NO_TOKEN' });
  }

  const payload = verifyAccessToken(token); // throws → 401 via errorHandler

  const user = await User.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized('Account no longer exists.', { code: 'USER_NOT_FOUND' });
  }
  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.', { code: 'ACCOUNT_DISABLED' });
  }
  if ((user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
    throw ApiError.unauthorized('Session is no longer valid. Please sign in again.', {
      code: 'TOKEN_REVOKED',
    });
  }

  req.user = user;
  return next();
});

/**
 * Authorises an admin.
 *
 * Returns 403, not 401: the caller *is* authenticated, they simply lack
 * permission. Returning 401 here would make the client's session-expiry
 * interceptor log a legitimate customer out.
 */
function requireAdmin(req, _res, next) {
  if (!req.user) {
    return next(ApiError.unauthorized('Not authenticated. Please sign in.'));
  }
  if (req.user.role !== 'admin') {
    return next(ApiError.forbidden('Administrator access is required.', { code: 'ADMIN_ONLY' }));
  }
  return next();
}

/**
 * Attaches the user when a valid token is present, but never rejects.
 * Used by endpoints that personalise output for signed-in shoppers while
 * remaining fully public (e.g. product detail showing "you reviewed this").
 */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const token = extractBearer(req);
  if (!token) return next();

  try {
    const payload = verifyAccessToken(token);
    const user = await User.findById(payload.sub);
    if (user && user.isActive && (user.tokenVersion ?? 0) === (payload.tv ?? 0)) {
      req.user = user;
    }
  } catch {
    // A bad token on an optional route is simply treated as "not signed in".
  }
  return next();
});

module.exports = { protect, requireAdmin, optionalAuth };
