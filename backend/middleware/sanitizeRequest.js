const { stripOperators } = require('../utils/sanitize');
const logger = require('../utils/logger');

/**
 * Strips MongoDB operators, dotted paths and prototype-pollution keys from
 * every inbound payload.
 *
 * This blocks NoSQL operator injection at the edge — a body of
 * `{"email": {"$ne": null}}` becomes `{"email": {}}` and can never turn a
 * findOne into an "any user" match.
 *
 * Note: `express-mongo-sanitize` is deliberately not used. In Express 5
 * `req.query` is a getter-only property, so that package throws on assignment.
 * We mutate the underlying objects in place instead.
 */
function sanitizeRequest(req, _res, next) {
  let removed = 0;

  if (req.body && typeof req.body === 'object') removed += stripOperators(req.body);
  if (req.params && typeof req.params === 'object') removed += stripOperators(req.params);

  // req.query is not reassignable in Express 5, but its contents are mutable.
  if (req.query && typeof req.query === 'object') removed += stripOperators(req.query);

  if (removed > 0) {
    logger.warn('Stripped forbidden keys from request', {
      method: req.method,
      path: req.originalUrl,
      removed,
      ip: req.ip,
    });
  }

  next();
}

module.exports = sanitizeRequest;
