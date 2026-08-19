/**
 * Operational error carrying an HTTP status.
 *
 * `isOperational` distinguishes errors we raised deliberately (safe to show the
 * client) from unexpected crashes (never shown to the client).
 */
class ApiError extends Error {
  constructor(statusCode, message, { code = undefined, details = undefined } = {}) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.isOperational = true;
    if (code) this.code = code;
    if (details) this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', opts) {
    return new ApiError(400, message, opts);
  }
  static unauthorized(message = 'Not authenticated', opts) {
    return new ApiError(401, message, opts);
  }
  static forbidden(message = 'You do not have permission to perform this action', opts) {
    return new ApiError(403, message, opts);
  }
  static notFound(message = 'Resource not found', opts) {
    return new ApiError(404, message, opts);
  }
  static conflict(message = 'Conflict', opts) {
    return new ApiError(409, message, opts);
  }
  static unprocessable(message = 'Unprocessable request', opts) {
    return new ApiError(422, message, opts);
  }
  static tooMany(message = 'Too many requests', opts) {
    return new ApiError(429, message, opts);
  }
  static internal(message = 'Something went wrong', opts) {
    return new ApiError(500, message, opts);
  }
  static serviceUnavailable(message = 'Service unavailable', opts) {
    return new ApiError(503, message, opts);
  }
}

module.exports = ApiError;
