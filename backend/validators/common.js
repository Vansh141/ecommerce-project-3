const { param, query, body } = require('express-validator');
const mongoose = require('mongoose');

/** Rejects malformed ObjectIds at the edge, so they never reach Mongoose. */
const objectIdParam = (name = 'id') =>
  param(name)
    .custom((value) => mongoose.isValidObjectId(value))
    .withMessage('Invalid identifier.');

const optionalObjectIdBody = (name) =>
  body(name)
    .optional({ nullable: true })
    .custom((value) => value === null || value === '' || mongoose.isValidObjectId(value))
    .withMessage('Invalid identifier.');

/** Shared pagination guards. `limit` is capped so a client cannot request the
 *  entire catalogue in one call. */
const paginationRules = [
  query('page').optional().isInt({ min: 1, max: 10_000 }).toInt().withMessage('Invalid page.'),
  query('limit').optional().isInt({ min: 1, max: 60 }).toInt().withMessage('Limit must be 1–60.'),
];

/**
 * Frees a string field of control characters and enforces a length ceiling.
 * Applied to anything that will later be rendered or emailed.
 */
const safeText = (field, { min = 1, max = 500, optional = false, fieldLabel } = {}) => {
  const label = fieldLabel || field;
  let chain = body(field);
  if (optional) chain = chain.optional({ nullable: true, checkFalsy: true });
  return chain
    .isString()
    .withMessage(`${label} must be text.`)
    .bail()
    .trim()
    .isLength({ min, max })
    .withMessage(`${label} must be between ${min} and ${max} characters.`);
};

module.exports = { objectIdParam, optionalObjectIdBody, paginationRules, safeText };
