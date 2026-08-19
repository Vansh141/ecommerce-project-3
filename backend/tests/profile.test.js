const { app, request, createUser, asUser, TEST_PASSWORD, VALID_ADDRESS } = require('./helpers');
const User = require('../models/User');

describe('Profile', () => {
  it('returns the signed-in user profile', async () => {
    const { token, user } = await createUser();

    const res = await asUser(token).get('/api/users/profile');
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('updates the display name', async () => {
    const { token } = await createUser();

    const res = await asUser(token).put('/api/users/profile').send({ name: 'Ananya Rao' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.name).toBe('Ananya Rao');
  });

  it('refuses to change email through the profile endpoint', async () => {
    const { token, user } = await createUser();

    await asUser(token).put('/api/users/profile').send({ email: 'attacker@example.com' });

    const reloaded = await User.findById(user._id);
    expect(reloaded.email).toBe(user.email);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.status).toBe(401);
  });
});

describe('Password change', () => {
  it('requires the current password', async () => {
    const { token } = await createUser();

    const res = await asUser(token)
      .put('/api/users/password')
      .send({ currentPassword: 'TotallyWrong9', newPassword: 'Chennai8Coast' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('CURRENT_PASSWORD_INVALID');
  });

  it('changes the password when the current one is correct', async () => {
    const { token, user } = await createUser();

    const res = await asUser(token)
      .put('/api/users/password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'Chennai8Coast' });

    expect(res.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'Chennai8Coast' });
    expect(login.status).toBe(200);
  });

  it('rejects a weak new password', async () => {
    const { token } = await createUser();

    const res = await asUser(token)
      .put('/api/users/password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'short' });

    expect(res.status).toBe(400);
  });

  it('rejects reusing the same password', async () => {
    const { token } = await createUser();

    const res = await asUser(token)
      .put('/api/users/password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: TEST_PASSWORD });

    expect(res.status).toBe(400);
  });

  it('revokes other sessions but keeps the current one alive', async () => {
    const { token, user } = await createUser();
    const { signAccessToken } = require('../services/tokenService');
    const otherDeviceToken = signAccessToken(user);

    const res = await asUser(token)
      .put('/api/users/password')
      .send({ currentPassword: TEST_PASSWORD, newPassword: 'Chennai8Coast' });

    expect(res.status).toBe(200);
    // The response hands back a freshly signed token for this device…
    const newToken = res.body.data.accessToken;
    expect(newToken).toBeTruthy();

    const stillWorks = await asUser(newToken).get('/api/users/profile');
    expect(stillWorks.status).toBe(200);

    // …while the token held by any other device is dead.
    const otherDevice = await asUser(otherDeviceToken).get('/api/users/profile');
    expect(otherDevice.status).toBe(401);
  });
});

describe('Address book', () => {
  it('adds an address and makes the first one default', async () => {
    const { token } = await createUser();

    const res = await asUser(token).post('/api/users/addresses').send(VALID_ADDRESS);

    expect(res.status).toBe(201);
    expect(res.body.data.address.isDefault).toBe(true);
    expect(res.body.data.address.city).toBe('Mumbai');
  });

  it('validates address fields server-side', async () => {
    const { token } = await createUser();

    const res = await asUser(token)
      .post('/api/users/addresses')
      .send({ ...VALID_ADDRESS, phone: 'not-a-phone', postalCode: '!' });

    expect(res.status).toBe(400);
  });

  it('keeps exactly one default when a second is added', async () => {
    const { token } = await createUser();

    await asUser(token).post('/api/users/addresses').send(VALID_ADDRESS);
    const second = await asUser(token)
      .post('/api/users/addresses')
      .send({ ...VALID_ADDRESS, label: 'Work', line1: '5 Nariman Point', isDefault: true });

    const defaults = second.body.data.addresses.filter((a) => a.isDefault);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].label).toBe('Work');
  });

  it('prevents editing another user address', async () => {
    const alice = await createUser();
    const bob = await createUser();

    const created = await asUser(alice.token).post('/api/users/addresses').send(VALID_ADDRESS);
    const addressId = created.body.data.address._id;

    // Bob's request only ever searches Bob's own subdocument array.
    const res = await asUser(bob.token)
      .put(`/api/users/addresses/${addressId}`)
      .send({ ...VALID_ADDRESS, fullName: 'Hijacked' });

    expect(res.status).toBe(404);

    const reloaded = await User.findById(alice.user._id);
    expect(reloaded.addresses[0].fullName).toBe(VALID_ADDRESS.fullName);
  });

  it('promotes another address to default when the default is deleted', async () => {
    const { token } = await createUser();

    const first = await asUser(token).post('/api/users/addresses').send(VALID_ADDRESS);
    await asUser(token)
      .post('/api/users/addresses')
      .send({ ...VALID_ADDRESS, label: 'Work', line1: '5 Nariman Point' });

    const res = await asUser(token).delete(
      `/api/users/addresses/${first.body.data.address._id}`
    );

    expect(res.status).toBe(200);
    expect(res.body.data.addresses).toHaveLength(1);
    expect(res.body.data.addresses[0].isDefault).toBe(true);
  });
});

describe('Account closure', () => {
  it('requires the password and anonymises the record', async () => {
    const { token, user } = await createUser();

    const wrong = await asUser(token).delete('/api/users/account').send({ password: 'Nope12345' });
    expect(wrong.status).toBe(401);

    const res = await asUser(token).delete('/api/users/account').send({ password: TEST_PASSWORD });
    expect(res.status).toBe(200);

    const reloaded = await User.findById(user._id);
    // Soft-deleted, not removed — order history must survive for tax purposes.
    expect(reloaded).not.toBeNull();
    expect(reloaded.isActive).toBe(false);
    expect(reloaded.email).toContain('deleted');
    expect(reloaded.name).toBe('Deleted user');
  });
});
