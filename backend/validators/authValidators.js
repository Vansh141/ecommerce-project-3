const { body, param } = require('express-validator');

/**
 * The 200 most abused passwords would be better, but even a short blocklist
 * eliminates the overwhelming majority of credential-stuffing hits. Kept
 * inline to avoid a dependency for a list this small.
 */
const COMMON_PASSWORDS = new Set([
  'password', 'password1', 'password123', '12345678', '123456789', '1234567890',
  'qwerty123', 'qwertyuiop', 'iloveyou', 'admin123', 'welcome1', 'welcome123',
  'abc12345', 'letmein123', 'monkey123', 'dragon123', 'football1', 'baseball1',
  'sunshine1', 'princess1', 'passw0rd', 'p@ssw0rd', 'trustno1', 'starwars1',
  'india@123', 'indian123',
]);

/**
 * Password policy: at least 8 characters containing both a letter and a digit,
 * and not on the common-password blocklist.
 *
 * `isString()` first is important — without it a JSON object reaches
 * bcrypt.compare and throws, producing an unauthenticated 500.
 */
const passwordRule = (field = 'password') =>
  body(field)
    .isString()
    .withMessage('Password must be text.')
    .bail()
    .isLength({ min: 8, max: 128 })
    .withMessage('Password must be at least 8 characters.')
    .bail()
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain at least one letter.')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number.')
    .custom((value) => !COMMON_PASSWORDS.has(String(value).toLowerCase()))
    .withMessage('That password is too common. Please choose a stronger one.');

const emailRule = (field = 'email') =>
  body(field)
    .isString()
    .withMessage('Email must be text.')
    .bail()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address.')
    .bail()
    .isLength({ max: 254 })
    .withMessage('Email address is too long.')
    // `all_lowercase` only. Gmail dot/plus stripping is deliberately disabled:
    // it silently merges distinct addresses and breaks plus-addressing.
    .normalizeEmail({
      all_lowercase: true,
      gmail_remove_dots: false,
      gmail_remove_subaddress: false,
      outlookdotcom_remove_subaddress: false,
      yahoo_remove_subaddress: false,
      icloud_remove_subaddress: false,
    });

const registerRules = [
  body('name')
    .isString()
    .withMessage('Name must be text.')
    .bail()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters.')
    .matches(/^[\p{L}\p{M}\s.'-]+$/u)
    .withMessage('Name contains invalid characters.'),
  emailRule(),
  passwordRule(),
];

const loginRules = [
  emailRule(),
  body('password').isString().withMessage('Password is required.').bail().notEmpty()
    .withMessage('Password is required.'),
];

const forgotPasswordRules = [emailRule()];

const resetPasswordRules = [
  param('token').isString().bail().isLength({ min: 32, max: 128 }).withMessage('Invalid reset link.'),
  passwordRule(),
];

const changePasswordRules = [
  body('currentPassword').isString().withMessage('Current password is required.').bail().notEmpty()
    .withMessage('Current password is required.'),
  passwordRule('newPassword'),
];

module.exports = {
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
  changePasswordRules,
  passwordRule,
  emailRule,
};
