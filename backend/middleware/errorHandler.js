const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const config = require('../config/env');
const logger = require('../utils/logger');

/** Terminal 404 for any unmatched route. Runs after all routers. */
function notFound(req, _res, next) {
  next(ApiError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Translates any thrown value into a safe, consistent JSON error response.
 *
 * The core rule: only errors we deliberately raised (`ApiError`) or explicitly
 * recognise have their message forwarded to the client. Everything else
 * becomes a generic 500 so internals, stack traces, driver messages and file
 * paths never reach a user.
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity
function errorHandler(err, req, res, _next) {
  try {
    return respond(err, req, res);
  } catch (handlerFailure) {
    // A crash inside the error handler makes Express fall back to its default,
    // which masks every real error as an opaque 500. Fail loudly in the log and
    // still return a well-formed body.
    logger.error('Error handler itself failed', {
      message: handlerFailure.message,
      originalMessage: err?.message,
      requestId: req.id,
    });
    if (res.headersSent) return undefined;
    return res
      .status(500)
      .json({ success: false, error: { message: 'Something went wrong. Please try again.' } });
  }
}

function respond(err, req, res) {
  let statusCode = 500;
  let message = 'Something went wrong. Please try again.';
  let code;
  let details;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code;
    details = err.details;
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'The submitted data is invalid.';
    code = 'VALIDATION_ERROR';
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }));
  } else if (err instanceof mongoose.Error.CastError) {
    // A malformed ObjectId is a client mistake, not a server fault.
    statusCode = 400;
    message = `Invalid value for "${err.path}".`;
    code = 'INVALID_ID';
  } else if (err && err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'value';
    message = `That ${field} is already in use.`;
    code = 'DUPLICATE_KEY';
  } else if (err && (err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError')) {
    statusCode = 401;
    message = 'Invalid authentication token.';
    code = 'INVALID_TOKEN';
  } else if (err && err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Your session has expired. Please sign in again.';
    code = 'TOKEN_EXPIRED';
  } else if (err && err.name === 'MulterError') {
    statusCode = 400;
    code = err.code;
    message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'That file is too large.'
        : err.code === 'LIMIT_UNEXPECTED_FILE'
          ? 'Unexpected file field.'
          : 'File upload failed.';
  } else if (err && err.type === 'entity.too.large') {
    statusCode = 413;
    message = 'Request body is too large.';
    code = 'PAYLOAD_TOO_LARGE';
  } else if (err && err.type === 'entity.parse.failed') {
    statusCode = 400;
    message = 'Request body is not valid JSON.';
    code = 'INVALID_JSON';
  } else if (err && err.message === 'CORS_NOT_ALLOWED') {
    statusCode = 403;
    message = 'Origin not allowed.';
    code = 'CORS_NOT_ALLOWED';
  }

  // An operational ApiError (e.g. a 503 for "payments unavailable") is an
  // expected outcome we raised deliberately — it is not a crash, so it must not
  // pollute the error log or page an on-call engineer.
  const isUnexpectedFault = statusCode >= 500 && !err?.isOperational;

  // Log the full error server-side; the client only ever sees `message`.
  const logPayload = {
    method: req.method,
    path: req.originalUrl,
    statusCode,
    userId: req.user?._id?.toString(),
    requestId: req.id,
    name: err?.name,
    message: err?.message,
    ...(isUnexpectedFault && !config.isProduction ? { stack: err?.stack } : {}),
  };

  if (isUnexpectedFault) logger.error('Unhandled request error', logPayload);
  else if (statusCode >= 500) logger.warn('Service error', logPayload);
  else logger.debug('Request error', logPayload);

  const body = { success: false, error: { message } };
  if (code) body.error.code = code;
  if (details) body.error.details = details;

  // Stack traces are exposed only outside production, and only for real faults.
  if (!config.isProduction && isUnexpectedFault && err?.stack) {
    body.error.stack = err.stack.split('\n').slice(0, 8);
  }

  return res.status(statusCode).json(body);
}

module.exports = { notFound, errorHandler };
