/**
 * Test bootstrap.
 *
 * NODE_ENV is forced to `test` before anything else loads so that:
 *   • config/env generates deterministic secrets instead of demanding a .env
 *   • rate limiters disable themselves (otherwise the suite throttles itself)
 * Each test file gets a fresh in-memory MongoDB.
 */
process.env.NODE_ENV = 'test';
process.env.TAX_INCLUSIVE = 'true';
process.env.TAX_RATE = '0.05';
process.env.FREE_SHIPPING_THRESHOLD = '1499';
process.env.SHIPPING_FLAT_RATE = '79';
process.env.MAX_QTY_PER_ITEM = '10';
process.env.COD_MAX_ORDER_VALUE = '20000';
process.env.ORDER_CANCEL_WINDOW_HOURS = '24';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.LOG_LEVEL = 'error';

// Outbound integrations and real secrets are forced off even when the shell
// exports them. config/env skips backend/.env under test; this covers the
// environment itself, so the suite can never send email or reach a provider.
for (const key of [
  'RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'CONTACT_NOTIFY_EMAIL',
  'RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET',
  'CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET',
  'MONGO_URI', 'JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET',
  'COOKIE_DOMAIN', 'CORS_ORIGINS', 'API_PUBLIC_URL',
]) {
  process.env[key] = '';
}

// Rate limits stay off unless a test file opts in explicitly.
delete process.env.RATE_LIMIT_IN_TESTS;

// `beforeAll` / `afterEach` / `afterAll` come from Vitest's injected globals
// (test.globals = true), because Vitest 4 forbids require('vitest').
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongo;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { serverSelectionTimeoutMS: 20_000 });
  // Unique indexes must exist for the duplicate-prevention tests to be meaningful.
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).createIndexes()));
});

afterEach(async () => {
  const { collections } = mongoose.connection;
  await Promise.all(Object.values(collections).map((c) => c.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase().catch(() => {});
  await mongoose.disconnect();
  if (mongo) await mongo.stop();
});
