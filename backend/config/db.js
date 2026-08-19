const mongoose = require('mongoose');
const config = require('./env');
const logger = require('../utils/logger');

/**
 * Index creation is disabled in production. Building indexes implicitly on
 * boot can lock a large collection and stall the app; production indexes are
 * created deliberately via `npm run indexes`.
 */
mongoose.set('autoIndex', !config.isProduction);

// Reject unknown query operators rather than silently ignoring them.
mongoose.set('strictQuery', true);

/**
 * NOTE: `sanitizeFilter` is deliberately NOT enabled globally.
 *
 * It wraps *every* filter value containing a `$` key in `$eq`, which breaks
 * legitimate server-constructed queries ($in, $gte, $elemMatch, $expr …) that
 * this codebase relies on. Operator injection is instead blocked at the edge by
 * `middleware/sanitizeRequest`, which strips `$`-prefixed and dotted keys from
 * req.body/params/query before any query is built — a targeted defence that
 * cannot be defeated by user input and does not break internal queries.
 */

let isConnected = false;

async function connectDB(uri = config.mongoUri) {
  if (!uri) throw new Error('connectDB called without a MongoDB connection string.');

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('MongoDB connected');
  });
  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB disconnected');
  });
  mongoose.connection.on('error', (err) => {
    isConnected = false;
    logger.error('MongoDB connection error', { message: err.message });
  });

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10_000,
    socketTimeoutMS: 45_000,
    maxPoolSize: 10,
    minPoolSize: 1,
    retryWrites: true,
  });

  isConnected = true;
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.connection.close(false);
  isConnected = false;
}

function getConnectionState() {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  return {
    ok: mongoose.connection.readyState === 1,
    state: states[mongoose.connection.readyState] ?? 'unknown',
  };
}

module.exports = { connectDB, disconnectDB, getConnectionState, isConnected: () => isConnected };
