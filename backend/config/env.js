/**
 * Centralised, validated environment configuration.
 *
 * Design rules:
 *  - Fail fast. If a required variable is missing or weak, the process refuses
 *    to boot rather than silently falling back to an insecure default.
 *  - Never log a secret value. Only names and "set/not set" are ever printed.
 *  - Optional integrations (Razorpay, Cloudinary, SMTP) are feature-flagged by
 *    credential presence. Missing credentials disable the feature cleanly
 *    instead of crashing or, worse, pretending to work.
 */
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';
const isTest = NODE_ENV === 'test';

const errors = [];
const warnings = [];

/** Values that must never be accepted as a real secret. */
const FORBIDDEN_SECRETS = new Set([
  'somesecretkey',
  'secret',
  'secretkey',
  'changeme',
  'change_me',
  'password',
  'jwtsecret',
  'your_jwt_secret_here',
  'replace_with_a_long_random_secret_string',
  'replace_me',
  'test',
]);

const MIN_SECRET_LENGTH = 32;

function str(name, { required = false, fallback = undefined } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    if (required) errors.push(`${name} is required but not set.`);
    return fallback;
  }
  return raw.trim();
}

function int(name, { fallback, min, max } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    errors.push(`${name} must be an integer.`);
    return fallback;
  }
  if (min !== undefined && parsed < min) {
    errors.push(`${name} must be >= ${min}.`);
    return fallback;
  }
  if (max !== undefined && parsed > max) {
    errors.push(`${name} must be <= ${max}.`);
    return fallback;
  }
  return parsed;
}

function float(name, { fallback, min, max } = {}) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseFloat(raw);
  if (Number.isNaN(parsed)) {
    errors.push(`${name} must be a number.`);
    return fallback;
  }
  if (min !== undefined && parsed < min) errors.push(`${name} must be >= ${min}.`);
  if (max !== undefined && parsed > max) errors.push(`${name} must be <= ${max}.`);
  return parsed;
}

function bool(name, fallback = false) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

/**
 * Reads a cryptographic secret and enforces real entropy requirements.
 * In test mode a deterministic secret is generated so the suite can run
 * without a .env file — but it is never used outside NODE_ENV=test.
 */
function secret(name) {
  const raw = process.env[name];

  if (!raw) {
    if (isTest) return `test-only-${name}-${'x'.repeat(MIN_SECRET_LENGTH)}`;
    errors.push(
      `${name} is required. Generate one with: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`
    );
    return undefined;
  }

  const value = raw.trim();

  if (FORBIDDEN_SECRETS.has(value.toLowerCase())) {
    errors.push(`${name} is set to a well-known placeholder value and must be replaced.`);
    return undefined;
  }
  if (value.length < MIN_SECRET_LENGTH) {
    errors.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters (currently ${value.length}).`);
    return undefined;
  }
  if (/^(.)\1+$/.test(value)) {
    errors.push(`${name} is a single repeated character and provides no entropy.`);
    return undefined;
  }
  return value;
}

/** Parses a comma-separated origin allowlist, rejecting malformed entries. */
function originList(name, fallback = []) {
  const raw = process.env[name];
  if (!raw) return fallback;
  return raw
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean)
    .filter((o) => {
      try {
        // eslint-disable-next-line no-new
        new URL(o);
        return true;
      } catch {
        errors.push(`${name} contains an invalid origin: "${o}"`);
        return false;
      }
    });
}

// ── Core ─────────────────────────────────────────────────────────────────────
const PORT = int('PORT', { fallback: 5000, min: 1, max: 65535 });

let MONGO_URI = str('MONGO_URI');
if (!MONGO_URI && !isTest) {
  errors.push('MONGO_URI is required (there is deliberately no localhost fallback).');
}
if (MONGO_URI && isProduction && /(?:localhost|127\.0\.0\.1)/i.test(MONGO_URI)) {
  errors.push('MONGO_URI points at localhost but NODE_ENV=production.');
}

const JWT_ACCESS_SECRET = secret('JWT_ACCESS_SECRET');
const JWT_REFRESH_SECRET = secret('JWT_REFRESH_SECRET');
if (JWT_ACCESS_SECRET && JWT_REFRESH_SECRET && JWT_ACCESS_SECRET === JWT_REFRESH_SECRET) {
  errors.push('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different values.');
}

// ── Client / CORS ────────────────────────────────────────────────────────────
const CLIENT_URL = str('CLIENT_URL', {
  required: isProduction,
  fallback: isProduction ? undefined : 'http://localhost:5173',
});
if (CLIENT_URL && isProduction && /(?:localhost|127\.0\.0\.1)/i.test(CLIENT_URL)) {
  errors.push('CLIENT_URL points at localhost but NODE_ENV=production.');
}

/**
 * Public origin of THIS API, used to build absolute URLs for locally stored
 * uploads. Only needed when Cloudinary is unconfigured and the storefront is
 * served from a different origin than the API — otherwise a relative
 * `/uploads/...` URL would resolve against the storefront and 404.
 */
const API_PUBLIC_URL = str('API_PUBLIC_URL');
if (API_PUBLIC_URL && isProduction && /(?:localhost|127\.0\.0\.1)/i.test(API_PUBLIC_URL)) {
  errors.push('API_PUBLIC_URL points at localhost but NODE_ENV=production.');
}

const corsFallback = CLIENT_URL
  ? isProduction
    ? [CLIENT_URL]
    : [CLIENT_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
  : [];
const CORS_ORIGINS = [...new Set(originList('CORS_ORIGINS', corsFallback))];
if (isProduction && CORS_ORIGINS.length === 0) {
  errors.push('No CORS origins resolved. Set CLIENT_URL or CORS_ORIGINS.');
}

// ── Cookies ──────────────────────────────────────────────────────────────────
const COOKIE_SAMESITE = (str('COOKIE_SAMESITE', { fallback: 'lax' }) || 'lax').toLowerCase();
if (!['lax', 'strict', 'none'].includes(COOKIE_SAMESITE)) {
  errors.push('COOKIE_SAMESITE must be one of: lax, strict, none.');
}
if (COOKIE_SAMESITE === 'none' && !isProduction) {
  warnings.push('COOKIE_SAMESITE=none requires HTTPS; cookies will be rejected over plain HTTP.');
}

// ── Trust proxy ──────────────────────────────────────────────────────────────
// Must match the real number of reverse proxies in front of the app. Setting
// this to `true` blindly makes X-Forwarded-For spoofable and defeats rate limiting.
const TRUST_PROXY_RAW = str('TRUST_PROXY', { fallback: isProduction ? '1' : '0' });
let TRUST_PROXY;
if (TRUST_PROXY_RAW === 'false' || TRUST_PROXY_RAW === '0') {
  TRUST_PROXY = false;
} else if (/^\d+$/.test(TRUST_PROXY_RAW)) {
  TRUST_PROXY = Number.parseInt(TRUST_PROXY_RAW, 10);
} else {
  TRUST_PROXY = TRUST_PROXY_RAW; // e.g. 'loopback' or a subnet
}

// ── Optional integrations ────────────────────────────────────────────────────
const smtp = {
  host: str('SMTP_HOST'),
  port: int('SMTP_PORT', { fallback: 587, min: 1, max: 65535 }),
  secure: bool('SMTP_SECURE', false),
  user: str('SMTP_USER'),
  pass: str('SMTP_PASS'),
  fromName: str('MAIL_FROM_NAME', { fallback: 'TOUCH' }),
  fromEmail: str('MAIL_FROM_EMAIL'),
};
smtp.enabled = Boolean(smtp.host && smtp.user && smtp.pass && smtp.fromEmail);
if (isProduction && !smtp.enabled) {
  warnings.push('SMTP is not configured. Password reset and order emails will not be delivered.');
}

const razorpay = {
  keyId: str('RAZORPAY_KEY_ID'),
  keySecret: str('RAZORPAY_KEY_SECRET'),
  webhookSecret: str('RAZORPAY_WEBHOOK_SECRET'),
};
razorpay.enabled = Boolean(razorpay.keyId && razorpay.keySecret);
razorpay.webhookEnabled = Boolean(razorpay.enabled && razorpay.webhookSecret);
if (razorpay.enabled && !razorpay.webhookSecret) {
  warnings.push('RAZORPAY_WEBHOOK_SECRET is not set. Webhook payment reconciliation is disabled.');
}
if (isProduction && !razorpay.enabled) {
  warnings.push('Razorpay is not configured. Online payment will be unavailable (COD only).');
}

const cloudinary = {
  cloudName: str('CLOUDINARY_CLOUD_NAME'),
  apiKey: str('CLOUDINARY_API_KEY'),
  apiSecret: str('CLOUDINARY_API_SECRET'),
  folder: str('CLOUDINARY_FOLDER', { fallback: 'touch/products' }),
};
cloudinary.enabled = Boolean(cloudinary.cloudName && cloudinary.apiKey && cloudinary.apiSecret);
if (isProduction && !cloudinary.enabled) {
  warnings.push(
    'Cloudinary is not configured. Uploads fall back to local disk, which is ephemeral on most hosts — images will be lost on redeploy.'
  );
}

// ── Storefront commerce settings ─────────────────────────────────────────────
const store = {
  name: str('STORE_NAME', { fallback: 'TOUCH' }),
  currency: str('STORE_CURRENCY', { fallback: 'INR' }),
  // Amounts are in the store's major currency unit (rupees).
  freeShippingThreshold: float('FREE_SHIPPING_THRESHOLD', { fallback: 1499, min: 0 }),
  shippingFlatRate: float('SHIPPING_FLAT_RATE', { fallback: 79, min: 0 }),
  // GST is inclusive in Indian apparel retail: the listed price already contains
  // tax. We display the tax component rather than adding it on top.
  taxRate: float('TAX_RATE', { fallback: 0.05, min: 0, max: 1 }),
  taxInclusive: bool('TAX_INCLUSIVE', true),
  codEnabled: bool('COD_ENABLED', true),
  codMaxOrderValue: float('COD_MAX_ORDER_VALUE', { fallback: 20000, min: 0 }),
  maxQtyPerItem: int('MAX_QTY_PER_ITEM', { fallback: 10, min: 1, max: 100 }),
  orderCancelWindowHours: int('ORDER_CANCEL_WINDOW_HOURS', { fallback: 24, min: 0 }),
  lowStockThreshold: int('LOW_STOCK_THRESHOLD', { fallback: 5, min: 0 }),
};

// ── Admin bootstrap (used only by `npm run seed:admin`) ──────────────────────
const adminBootstrap = {
  name: str('ADMIN_NAME', { fallback: 'Store Owner' }),
  email: str('ADMIN_EMAIL'),
  password: str('ADMIN_PASSWORD'),
};

// ── Report and fail fast ─────────────────────────────────────────────────────
if (warnings.length > 0) {
  for (const w of warnings) console.warn(`[config] WARNING: ${w}`);
}

if (errors.length > 0) {
  console.error('\n[config] Refusing to start — environment configuration is invalid:\n');
  for (const e of errors) console.error(`  ✗ ${e}`);
  console.error('\nSee backend/.env.example for the full list of variables.\n');
  process.exit(1);
}

const config = Object.freeze({
  env: NODE_ENV,
  isProduction,
  isTest,
  isDevelopment: !isProduction && !isTest,
  port: PORT,
  mongoUri: MONGO_URI,
  clientUrl: CLIENT_URL,
  apiPublicUrl: API_PUBLIC_URL,
  corsOrigins: CORS_ORIGINS,
  trustProxy: TRUST_PROXY,
  jwt: Object.freeze({
    accessSecret: JWT_ACCESS_SECRET,
    refreshSecret: JWT_REFRESH_SECRET,
    accessTtl: str('ACCESS_TOKEN_TTL', { fallback: '15m' }),
    refreshTtl: str('REFRESH_TOKEN_TTL', { fallback: '30d' }),
    refreshTtlMs: int('REFRESH_TOKEN_TTL_MS', { fallback: 30 * 24 * 60 * 60 * 1000, min: 60_000 }),
    issuer: str('JWT_ISSUER', { fallback: 'touch-api' }),
  }),
  cookie: Object.freeze({
    name: 'touch_rt',
    sameSite: COOKIE_SAMESITE,
    secure: isProduction || COOKIE_SAMESITE === 'none',
    domain: str('COOKIE_DOMAIN'),
    path: '/api/auth',
  }),
  smtp: Object.freeze(smtp),
  razorpay: Object.freeze(razorpay),
  cloudinary: Object.freeze(cloudinary),
  store: Object.freeze(store),
  adminBootstrap: Object.freeze(adminBootstrap),
  logLevel: str('LOG_LEVEL', { fallback: isProduction ? 'info' : 'debug' }),
});

module.exports = config;
