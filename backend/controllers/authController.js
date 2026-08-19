const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const config = require('../config/env');
const { sendSuccess, sendCreated } = require('../utils/apiResponse');
const emailService = require('../services/emailService');
const {
  issueSession,
  verifyRefreshToken,
  readRefreshCookie,
  clearRefreshCookie,
} = require('../services/tokenService');

/**
 * A single, constant response for every forgot-password outcome.
 *
 * Returning "user not found" would let an attacker enumerate which email
 * addresses have accounts — a privacy leak and a targeting list for
 * credential stuffing.
 */
const GENERIC_RESET_RESPONSE = {
  message: 'If an account exists for that email address, a password reset link has been sent.',
};

// ── POST /api/auth/register ──────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    // Deliberately vague: confirms nothing about whether the address is taken.
    throw ApiError.conflict('That email address cannot be used to register.', {
      code: 'REGISTRATION_REJECTED',
    });
  }

  const user = await User.create({ name, email, password });

  const rawVerifyToken = user.createEmailVerificationToken();
  await user.save();

  const session = issueSession(res, user);

  // Fire-and-forget: a mail outage must not fail account creation.
  emailService
    .sendWelcome({
      to: user.email,
      name: user.name,
      verifyUrl: `${config.clientUrl}/verify-email/${rawVerifyToken}`,
    })
    .catch(() => {});

  logger.info('User registered', { userId: user._id.toString() });

  return sendCreated(res, { user: user.toPublicJSON(), ...session });
});

// ── POST /api/auth/login ─────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password +failedLoginAttempts +lockUntil');

  // Identical message for "no such user" and "wrong password" so timing and
  // wording cannot be used to enumerate accounts.
  const invalid = ApiError.unauthorized('Incorrect email or password.', {
    code: 'INVALID_CREDENTIALS',
  });

  if (!user) {
    // Equalises response time against the bcrypt path below.
    await User.findOne({ email: '__nonexistent__' });
    throw invalid;
  }

  if (user.isLocked) {
    throw ApiError.tooMany(
      'This account is temporarily locked after too many failed sign-in attempts. Please try again in 15 minutes.',
      { code: 'ACCOUNT_LOCKED' }
    );
  }

  if (!user.isActive) {
    throw ApiError.forbidden('This account has been deactivated.', { code: 'ACCOUNT_DISABLED' });
  }

  const matches = await user.matchPassword(password);
  if (!matches) {
    await user.registerFailedLogin();
    throw invalid;
  }

  await user.clearLoginAttempts();
  const session = issueSession(res, user);

  logger.info('User signed in', { userId: user._id.toString() });

  return sendSuccess(res, { user: user.toPublicJSON(), ...session });
});

// ── POST /api/auth/refresh ───────────────────────────────────────────────────
/**
 * Exchanges the httpOnly refresh cookie for a new access token.
 * The SPA calls this on boot, which is how a session survives a page reload
 * without ever persisting a token in localStorage.
 */
const refresh = asyncHandler(async (req, res) => {
  const token = readRefreshCookie(req);
  if (!token) {
    throw ApiError.unauthorized('No active session.', { code: 'NO_REFRESH_TOKEN' });
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    clearRefreshCookie(res);
    throw ApiError.unauthorized('Session expired. Please sign in again.', {
      code: 'REFRESH_INVALID',
    });
  }

  const user = await User.findById(payload.sub);
  if (!user || !user.isActive || (user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
    clearRefreshCookie(res);
    throw ApiError.unauthorized('Session is no longer valid. Please sign in again.', {
      code: 'REFRESH_REVOKED',
    });
  }

  // Rotate the refresh cookie on every use so a captured cookie has a shorter
  // useful life than its nominal expiry.
  const session = issueSession(res, user);

  return sendSuccess(res, { user: user.toPublicJSON(), ...session });
});

// ── POST /api/auth/logout ────────────────────────────────────────────────────
const logout = asyncHandler(async (_req, res) => {
  clearRefreshCookie(res);
  return sendSuccess(res, { message: 'Signed out.' });
});

// ── POST /api/auth/logout-all ────────────────────────────────────────────────
/** Invalidates every token issued to this user, on every device. */
const logoutAll = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
  clearRefreshCookie(res);
  logger.info('All sessions revoked', { userId: req.user._id.toString() });
  return sendSuccess(res, { message: 'Signed out of all devices.' });
});

// ── POST /api/auth/forgot-password ───────────────────────────────────────────
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (user && user.isActive) {
    const rawToken = user.createPasswordResetToken();
    await user.save({ validateBeforeSave: false });

    const resetUrl = `${config.clientUrl}/reset-password/${rawToken}`;
    const delivered = await emailService.sendPasswordReset({
      to: user.email,
      name: user.name,
      resetUrl,
    });

    if (!delivered) {
      // Clear the token so a mail failure does not leave a live reset token
      // stranded on the account.
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });
      logger.error('Password reset email could not be delivered', {
        userId: user._id.toString(),
      });
    }
  }

  // Always the same response, same status, regardless of what happened above.
  return sendSuccess(res, GENERIC_RESET_RESPONSE);
});

// ── POST /api/auth/reset-password/:token ─────────────────────────────────────
const resetPassword = asyncHandler(async (req, res) => {
  const hashed = User.hashToken(req.params.token);

  const user = await User.findOne({
    resetPasswordToken: hashed,
    resetPasswordExpire: { $gt: new Date() },
  }).select('+password +resetPasswordToken +resetPasswordExpire');

  if (!user) {
    throw ApiError.badRequest('This reset link is invalid or has expired. Please request a new one.', {
      code: 'RESET_TOKEN_INVALID',
    });
  }

  user.password = req.body.password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpire = undefined;
  // Revokes every existing session — essential if the account was compromised.
  user.tokenVersion = (user.tokenVersion ?? 0) + 1;
  user.failedLoginAttempts = 0;
  user.lockUntil = undefined;
  await user.save();

  clearRefreshCookie(res);
  logger.info('Password reset completed', { userId: user._id.toString() });

  return sendSuccess(res, {
    message: 'Password updated. Please sign in with your new password.',
  });
});

// ── POST /api/auth/verify-email/:token ───────────────────────────────────────
const verifyEmail = asyncHandler(async (req, res) => {
  const hashed = User.hashToken(req.params.token);

  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationExpire: { $gt: new Date() },
  }).select('+emailVerificationToken +emailVerificationExpire');

  if (!user) {
    throw ApiError.badRequest('This verification link is invalid or has expired.', {
      code: 'VERIFY_TOKEN_INVALID',
    });
  }

  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationExpire = undefined;
  await user.save({ validateBeforeSave: false });

  return sendSuccess(res, { message: 'Email verified.', user: user.toPublicJSON() });
});

// ── POST /api/auth/resend-verification ───────────────────────────────────────
const resendVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select(
    '+emailVerificationToken +emailVerificationExpire'
  );

  if (user.emailVerified) {
    return sendSuccess(res, { message: 'Your email is already verified.' });
  }

  const rawToken = user.createEmailVerificationToken();
  await user.save({ validateBeforeSave: false });

  await emailService.sendWelcome({
    to: user.email,
    name: user.name,
    verifyUrl: `${config.clientUrl}/verify-email/${rawToken}`,
  });

  return sendSuccess(res, { message: 'Verification email sent.' });
});

// ── GET /api/auth/me ─────────────────────────────────────────────────────────
const me = asyncHandler(async (req, res) => sendSuccess(res, { user: req.user.toPublicJSON() }));

module.exports = {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  me,
};
