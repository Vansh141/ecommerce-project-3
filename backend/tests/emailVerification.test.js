const { app, request, createUser, asUser } = require('./helpers');
const User = require('../models/User');

describe('Email verification', () => {
  it('verifies an address from the emailed link', async () => {
    const { user } = await createUser({ emailVerified: false });
    const raw = user.createEmailVerificationToken();
    await user.save();

    const res = await request(app).post(`/api/auth/verify-email/${raw}`);

    expect(res.status).toBe(200);
    const reloaded = await User.findById(user._id);
    expect(reloaded.emailVerified).toBe(true);
  });

  it('treats a link as single-use', async () => {
    const { user } = await createUser({ emailVerified: false });
    const raw = user.createEmailVerificationToken();
    await user.save();

    await request(app).post(`/api/auth/verify-email/${raw}`);
    const again = await request(app).post(`/api/auth/verify-email/${raw}`);

    expect(again.status).toBe(400);
    expect(again.body.error.code).toBe('VERIFY_TOKEN_INVALID');
  });

  it('rejects an expired link', async () => {
    const { user } = await createUser({ emailVerified: false });
    const raw = user.createEmailVerificationToken();
    user.emailVerificationExpire = new Date(Date.now() - 1000);
    await user.save();

    const res = await request(app).post(`/api/auth/verify-email/${raw}`);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VERIFY_TOKEN_INVALID');
  });

  it('rejects a malformed token before looking anything up', async () => {
    const res = await request(app).post('/api/auth/verify-email/not-a-token');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('says so when a new verification email could not be sent', async () => {
    // Email is never configured under test, so delivery always fails here.
    const { token } = await createUser({ emailVerified: false });

    const res = await asUser(token).post('/api/auth/resend-verification');

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('EMAIL_UNAVAILABLE');
  });

  it('sends nothing to an account that is already verified', async () => {
    const { token } = await createUser();

    const res = await asUser(token).post('/api/auth/resend-verification');

    expect(res.status).toBe(200);
    expect(res.body.data.message).toBe('Your email is already verified.');
  });
});
