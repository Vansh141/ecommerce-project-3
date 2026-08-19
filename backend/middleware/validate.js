const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

/**
 * Terminates a validator chain: converts express-validator failures into a
 * single 400 with per-field details.
 *
 * Placed after the validation chain on every route that accepts input.
 */
function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array({ onlyFirstError: true }).map((e) => ({
    field: e.path ?? e.param,
    message: e.msg,
  }));

  return next(
    ApiError.badRequest(details[0]?.message || 'The submitted data is invalid.', {
      code: 'VALIDATION_ERROR',
      details,
    })
  );
}

module.exports = validate;
