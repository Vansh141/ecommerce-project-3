/**
 * Wraps an async route handler so rejections reach the central error handler.
 *
 * Express 5 forwards async rejections automatically, but wrapping explicitly
 * keeps behaviour identical for sync throws and makes the intent obvious at
 * each call site.
 */
module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
