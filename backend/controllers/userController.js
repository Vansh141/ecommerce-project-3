const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const { clearRefreshCookie, issueSession } = require('../services/tokenService');

// ── GET /api/users/profile ───────────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) =>
  sendSuccess(res, { user: req.user.toPublicJSON() })
);

// ── PUT /api/users/profile ───────────────────────────────────────────────────
/**
 * Updates only the fields a user is allowed to change about themselves.
 *
 * `role`, `tokenVersion`, `isActive` and `emailVerified` are deliberately not
 * readable from the body — a whitelist here is what prevents privilege
 * escalation via mass assignment.
 */
const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('Account not found.');

  if (typeof req.body.name === 'string') user.name = req.body.name.trim();
  if (typeof req.body.phone === 'string') user.phone = req.body.phone.trim();

  await user.save();

  return sendSuccess(res, { user: user.toPublicJSON(), message: 'Profile updated.' });
});

// ── PUT /api/users/password ──────────────────────────────────────────────────
/**
 * Changing a password requires proving knowledge of the current one.
 *
 * Without this check, anyone with a momentarily unattended session (or a
 * stolen access token) could lock the real owner out permanently.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw ApiError.notFound('Account not found.');

  const matches = await user.matchPassword(currentPassword);
  if (!matches) {
    throw ApiError.unauthorized('Your current password is incorrect.', {
      code: 'CURRENT_PASSWORD_INVALID',
    });
  }

  if (await user.matchPassword(newPassword)) {
    throw ApiError.badRequest('Your new password must be different from your current one.');
  }

  user.password = newPassword;
  // Revoke sessions everywhere, then immediately re-issue for *this* device so
  // the user is not logged out of the tab they just used.
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  await user.save();

  const session = issueSession(res, user);
  logger.info('Password changed', { userId: user._id.toString() });

  return sendSuccess(res, {
    message: 'Password updated. You have been signed out of all other devices.',
    user: user.toPublicJSON(),
    ...session,
  });
});

// ── DELETE /api/users/account ────────────────────────────────────────────────
/**
 * Soft-deletes the account: order history must survive for tax and dispute
 * purposes, so the record is deactivated and anonymised rather than removed.
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!user) throw ApiError.notFound('Account not found.');

  if (user.role === 'admin') {
    throw ApiError.forbidden('Administrator accounts cannot be self-deleted.');
  }

  const matches = await user.matchPassword(req.body.password);
  if (!matches) throw ApiError.unauthorized('Password is incorrect.');

  user.isActive = false;
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  user.email = `deleted+${user._id}@deleted.invalid`;
  user.name = 'Deleted user';
  user.phone = '';
  user.addresses = [];
  await user.save({ validateBeforeSave: false });

  clearRefreshCookie(res);
  logger.info('Account deleted', { userId: user._id.toString() });

  return sendSuccess(res, { message: 'Your account has been closed.' });
});

// ── Address book ─────────────────────────────────────────────────────────────

const MAX_ADDRESSES = 10;

const listAddresses = asyncHandler(async (req, res) =>
  sendSuccess(res, { addresses: req.user.addresses })
);

const addAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('Account not found.');

  if (user.addresses.length >= MAX_ADDRESSES) {
    throw ApiError.badRequest(`You can save up to ${MAX_ADDRESSES} addresses.`);
  }

  const makeDefault = Boolean(req.body.isDefault) || user.addresses.length === 0;
  if (makeDefault) user.addresses.forEach((a) => { a.isDefault = false; });

  user.addresses.push({
    label: req.body.label || 'Home',
    fullName: req.body.fullName,
    phone: req.body.phone,
    line1: req.body.line1,
    line2: req.body.line2 || '',
    city: req.body.city,
    state: req.body.state,
    postalCode: req.body.postalCode,
    country: req.body.country || 'India',
    isDefault: makeDefault,
  });

  await user.save();
  const created = user.addresses[user.addresses.length - 1];

  return sendCreated(res, { address: created, addresses: user.addresses });
});

const updateAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('Account not found.');

  // Ownership is implicit: we only ever look inside *this* user's subdocument
  // array, so one customer can never address another customer's record.
  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found.');

  const fields = ['label', 'fullName', 'phone', 'line1', 'line2', 'city', 'state', 'postalCode', 'country'];
  for (const field of fields) {
    if (typeof req.body[field] === 'string') address[field] = req.body[field].trim();
  }

  if (req.body.isDefault === true) {
    user.addresses.forEach((a) => { a.isDefault = false; });
    address.isDefault = true;
  }

  await user.save();
  return sendSuccess(res, { address, addresses: user.addresses });
});

const deleteAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('Account not found.');

  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found.');

  const wasDefault = address.isDefault;
  address.deleteOne();

  if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;

  await user.save();
  return sendSuccess(res, { addresses: user.addresses });
});

const setDefaultAddress = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw ApiError.notFound('Account not found.');

  const address = user.addresses.id(req.params.addressId);
  if (!address) throw ApiError.notFound('Address not found.');

  user.addresses.forEach((a) => { a.isDefault = false; });
  address.isDefault = true;
  await user.save();

  return sendSuccess(res, { addresses: user.addresses });
});

module.exports = {
  getProfile,
  updateProfile,
  changePassword,
  deleteAccount,
  listAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
  MAX_ADDRESSES,
};
