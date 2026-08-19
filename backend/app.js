const path = require('path');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const cookieParser = require('cookie-parser');

const config = require('./config/env');
const logger = require('./utils/logger');
const { getConnectionState } = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const sanitizeRequest = require('./middleware/sanitizeRequest');
const { globalLimiter } = require('./middleware/rateLimiters');
const paymentController = require('./controllers/paymentController');
const apiRoutes = require('./routes');

const app = express();

/* ── Proxy awareness ───────────────────────────────────────────────────────
 * Must match the actual number of proxies in front of the app. Setting this
 * to `true` would make X-Forwarded-For spoofable and silently defeat every
 * IP-based rate limit. */
app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');

/* ── Security headers ──────────────────────────────────────────────────── */
app.use(
  helmet({
    // The API serves JSON and uploaded images, never HTML documents, so a
    // restrictive CSP here costs nothing and blocks script execution if any
    // response is ever mis-served as HTML.
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'none'"],
        styleSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'none'"],
        formAction: ["'none'"],
      },
    },
    // Uploaded images must remain loadable by the storefront on another origin.
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hsts: config.isProduction
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
  })
);

/* ── CORS allowlist ────────────────────────────────────────────────────────
 * Only origins we explicitly listed are echoed back. `credentials: true` is
 * required for the refresh cookie, and a wildcard origin is illegal alongside
 * it — so an allowlist is mandatory, not optional. */
const corsOptions = {
  origin(origin, callback) {
    // Same-origin/server-to-server requests carry no Origin header.
    if (!origin) return callback(null, true);
    const normalised = origin.replace(/\/$/, '');
    if (config.corsOrigins.includes(normalised)) return callback(null, true);
    logger.warn('Blocked cross-origin request', { origin });
    return callback(new Error('CORS_NOT_ALLOWED'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['RateLimit', 'RateLimit-Policy'],
  maxAge: 86_400,
};
app.use(cors(corsOptions));

app.use(compression());

/* ── Request correlation ───────────────────────────────────────────────── */
app.use((req, res, next) => {
  req.id = crypto.randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
});

/* ── Access log ────────────────────────────────────────────────────────── */
app.use((req, res, next) => {
  if (config.isTest) return next();
  const startedAt = process.hrtime.bigint();
  res.on('finish', () => {
    const ms = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'debug';
    logger[level]('request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(ms),
      requestId: req.id,
    });
  });
  return next();
});

/* ── Razorpay webhook (RAW body) ───────────────────────────────────────────
 * Mounted before express.json(). The webhook signature is an HMAC over the
 * exact bytes Razorpay sent; parsing and re-serialising the JSON would change
 * those bytes and make every legitimate signature fail. */
app.post(
  '/api/payments/webhook',
  express.raw({ type: 'application/json', limit: '1mb' }),
  paymentController.handleWebhook
);

/* ── Body parsing ──────────────────────────────────────────────────────── */
app.use(cookieParser());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

/* ── NoSQL operator stripping ──────────────────────────────────────────── */
app.use(sanitizeRequest);

/* ── Health check ──────────────────────────────────────────────────────────
 * Placed before the rate limiter so orchestrator probes are never throttled. */
app.get('/health', (_req, res) => {
  const db = getConnectionState();
  const healthy = db.ok;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    uptime: Math.round(process.uptime()),
    database: db.state,
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) =>
  res.json({ name: `${config.store.name} API`, status: 'ok', docs: '/health' })
);

/* ── Rate limiting ─────────────────────────────────────────────────────── */
app.use('/api', globalLimiter);

/* ── Locally stored uploads ────────────────────────────────────────────────
 * Only reachable when Cloudinary is unconfigured. `nosniff` plus an explicit
 * CSP means a file that somehow slipped through validation still cannot be
 * executed as script by a browser. */
app.use(
  '/uploads',
  express.static(path.join(__dirname, 'uploads'), {
    maxAge: config.isProduction ? '30d' : 0,
    index: false,
    dotfiles: 'deny',
    setHeaders(res) {
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    },
  })
);

/* ── API ───────────────────────────────────────────────────────────────── */
app.use('/api', apiRoutes);

/* ── Terminal handlers ─────────────────────────────────────────────────── */
app.use(notFound);
app.use(errorHandler);

module.exports = app;
