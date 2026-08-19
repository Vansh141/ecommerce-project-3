const { app, request, createUser } = require('./helpers');
const User = require('../models/User');
const { signAccessToken } = require('../services/tokenService');

describe('Authentication', () => {
  describe('registration', () => {
    it('creates an account and issues an access token plus refresh cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Priya Sharma', email: 'priya@example.com', password: 'Kolkata7Rain' });

      expect(res.status).toBe(201);
      expect(res.body.data.accessToken).toBeTruthy();
      expect(res.body.data.user.email).toBe('priya@example.com');
      expect(res.body.data.user.role).toBe('customer');

      const cookies = res.headers['set-cookie'] || [];
      const refresh = cookies.find((c) => c.startsWith('touch_rt='));
      expect(refresh).toBeTruthy();
      expect(refresh).toContain('HttpOnly');
    });

    it('never returns the password hash', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Test', email: 'nohash@example.com', password: 'Kolkata7Rain' });

      expect(JSON.stringify(res.body)).not.toContain('$2a$');
      expect(JSON.stringify(res.body)).not.toContain('$2b$');
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('rejects weak passwords', async () => {
      for (const password of ['short1', 'password', 'passwordonly', '12345678']) {
        // eslint-disable-next-line no-await-in-loop
        const res = await request(app)
          .post('/api/auth/register')
          .send({ name: 'Test', email: `weak${password}@example.com`, password });
        expect(res.status).toBe(400);
      }
    });

    it('refuses privilege escalation via the request body', async () => {
      const res = await request(app).post('/api/auth/register').send({
        name: 'Sneaky',
        email: 'sneaky@example.com',
        password: 'Kolkata7Rain',
        role: 'admin',
        isAdmin: true,
        tokenVersion: 99,
      });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('customer');

      const stored = await User.findOne({ email: 'sneaky@example.com' });
      expect(stored.role).toBe('customer');
      expect(stored.tokenVersion).toBe(0);
    });
  });

  describe('login', () => {
    it('signs in with correct credentials', async () => {
      await createUser({ email: 'known@example.com', password: 'Kolkata7Rain' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'known@example.com', password: 'Kolkata7Rain' });

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeTruthy();
    });

    it('gives an identical response for a wrong password and a missing account', async () => {
      await createUser({ email: 'real@example.com', password: 'Kolkata7Rain' });

      const wrongPassword = await request(app)
        .post('/api/auth/login')
        .send({ email: 'real@example.com', password: 'Wrong9Password' });

      const noSuchUser = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@example.com', password: 'Wrong9Password' });

      // Identical status and message — nothing here reveals which emails exist.
      expect(wrongPassword.status).toBe(401);
      expect(noSuchUser.status).toBe(401);
      expect(wrongPassword.body.error.message).toBe(noSuchUser.body.error.message);
    });

    it('resists NoSQL operator injection in the email field', async () => {
      await createUser({ email: 'victim@example.com', password: 'Kolkata7Rain' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: { $ne: null }, password: { $ne: null } });

      expect(res.status).toBe(400);
      expect(res.body.data?.accessToken).toBeUndefined();
    });

    it('does not crash when the password is an object', async () => {
      await createUser({ email: 'typed@example.com', password: 'Kolkata7Rain' });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'typed@example.com', password: { $gt: '' } });

      // Must be a clean 400, not a 500 leaking a bcrypt stack trace.
      expect(res.status).toBe(400);
    });

    it('locks an account after repeated failures', async () => {
      await createUser({ email: 'brute@example.com', password: 'Kolkata7Rain' });

      for (let i = 0; i < User.MAX_LOGIN_ATTEMPTS; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'brute@example.com', password: 'Wrong9Password' });
      }

      // Even the *correct* password is refused once locked.
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'brute@example.com', password: 'Kolkata7Rain' });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('ACCOUNT_LOCKED');
    });
  });

  describe('token revocation', () => {
    it('rejects a token whose tokenVersion is stale', async () => {
      const { user, token } = await createUser();

      const before = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(before.status).toBe(200);

      await User.updateOne({ _id: user._id }, { $inc: { tokenVersion: 1 } });

      const after = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(after.status).toBe(401);
      expect(after.body.error.code).toBe('TOKEN_REVOKED');
    });

    it('rejects a token belonging to a deleted account', async () => {
      const { user, token } = await createUser();
      await User.deleteOne({ _id: user._id });

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('USER_NOT_FOUND');
    });

    it('rejects a token for a deactivated account', async () => {
      const { user, token } = await createUser();
      await User.updateOne({ _id: user._id }, { $set: { isActive: false } });

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('rejects a token signed with the wrong secret', async () => {
      const jwt = require('jsonwebtoken');
      const forged = jwt.sign({ sub: '507f1f77bcf86cd799439011', role: 'admin', tv: 0 }, 'attacker-secret', {
        expiresIn: '1h',
      });

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
      expect(res.status).toBe(401);
    });

    it('rejects a refresh token presented as an access token', async () => {
      const { user } = await createUser();
      const { signRefreshToken } = require('../services/tokenService');

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${signRefreshToken(user)}`);

      // Different secret AND a different audience claim — both must fail it.
      expect(res.status).toBe(401);
    });
  });

  describe('CSRF protection on cookie endpoints', () => {
    it('refuses a refresh request without the custom header', async () => {
      const login = await request(app)
        .post('/api/auth/register')
        .send({ name: 'Cookie', email: 'cookie@example.com', password: 'Kolkata7Rain' });

      const cookie = login.headers['set-cookie'];

      const withoutHeader = await request(app).post('/api/auth/refresh').set('Cookie', cookie);
      expect(withoutHeader.status).toBe(403);
      expect(withoutHeader.body.error.code).toBe('CSRF_HEADER_REQUIRED');

      const withHeader = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', cookie)
        .set('X-Requested-With', 'XMLHttpRequest');
      expect(withHeader.status).toBe(200);
      expect(withHeader.body.data.accessToken).toBeTruthy();
    });
  });

  describe('password reset', () => {
    it('gives the same response whether or not the account exists', async () => {
      await createUser({ email: 'exists@example.com' });

      const known = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'exists@example.com' });
      const unknown = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nobody@example.com' });

      expect(known.status).toBe(200);
      expect(unknown.status).toBe(200);
      expect(known.body.data.message).toBe(unknown.body.data.message);
    });

    it('stores only a hash of the reset token', async () => {
      const { user } = await createUser();
      const raw = user.createPasswordResetToken();
      await user.save();

      const stored = await User.findById(user._id).select('+resetPasswordToken');
      expect(stored.resetPasswordToken).not.toBe(raw);
      expect(stored.resetPasswordToken).toBe(User.hashToken(raw));
    });

    it('rejects an expired reset token', async () => {
      const { user } = await createUser();
      const raw = user.createPasswordResetToken();
      user.resetPasswordExpire = new Date(Date.now() - 1000);
      await user.save();

      const res = await request(app)
        .post(`/api/auth/reset-password/${raw}`)
        .send({ password: 'Mumbai9Monsoon' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('RESET_TOKEN_INVALID');
    });

    it('invalidates all existing sessions after a successful reset', async () => {
      const { user } = await createUser();
      const oldToken = signAccessToken(user);
      const raw = user.createPasswordResetToken();
      await user.save();

      const reset = await request(app)
        .post(`/api/auth/reset-password/${raw}`)
        .send({ password: 'Mumbai9Monsoon' });
      expect(reset.status).toBe(200);

      const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${oldToken}`);
      expect(res.status).toBe(401);
    });

    it('lets the user sign in with the new password only', async () => {
      const { user } = await createUser({ email: 'resetme@example.com', password: 'Kolkata7Rain' });
      const raw = user.createPasswordResetToken();
      await user.save();

      await request(app).post(`/api/auth/reset-password/${raw}`).send({ password: 'Mumbai9Monsoon' });

      const oldPw = await request(app)
        .post('/api/auth/login')
        .send({ email: 'resetme@example.com', password: 'Kolkata7Rain' });
      const newPw = await request(app)
        .post('/api/auth/login')
        .send({ email: 'resetme@example.com', password: 'Mumbai9Monsoon' });

      expect(oldPw.status).toBe(401);
      expect(newPw.status).toBe(200);
    });
  });
});

