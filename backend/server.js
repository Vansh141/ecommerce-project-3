const config = require('./config/env');
const logger = require('./utils/logger');
const { connectDB, disconnectDB } = require('./config/db');
const app = require('./app');
const orderService = require('./services/orderService');

let server;
let sweeper;

/**
 * Boot order matters: the database must be reachable *before* the port opens.
 *
 * Previously the server listened first and only logged a connection failure,
 * so a broken instance would pass a health check while every request 500'd.
 */
async function start() {
  try {
    await connectDB();
  } catch (err) {
    logger.error('Could not connect to MongoDB — aborting startup', { message: err.message });
    process.exit(1);
  }

  server = app.listen(config.port, () => {
    logger.info(`${config.store.name} API listening`, {
      port: config.port,
      env: config.env,
      razorpay: config.razorpay.enabled,
      cloudinary: config.cloudinary.enabled,
      email: config.resend.enabled,
    });
  });

  server.headersTimeout = 65_000;
  server.requestTimeout = 60_000;

  // Releases inventory held by abandoned online checkouts. Without this, an
  // unpaid order would hold stock hostage indefinitely.
  if (!config.isTest) {
    const runSweep = () =>
      orderService
        .expireStalePendingPayments({ olderThanMinutes: 45 })
        .catch((err) => logger.error('Stale order sweep failed', { message: err.message }));

    sweeper = setInterval(runSweep, 15 * 60 * 1000);
    sweeper.unref();
    setTimeout(runSweep, 30_000).unref();
  }
}

/**
 * Graceful shutdown: stop accepting new connections, let in-flight requests
 * finish, then close the database. Without this, every deploy kills active
 * checkouts mid-request.
 */
async function shutdown(signal) {
  logger.info(`${signal} received — shutting down`);

  if (sweeper) clearInterval(sweeper);

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out — forcing exit');
    process.exit(1);
  }, 15_000);
  forceExit.unref();

  try {
    if (server) await new Promise((resolve) => server.close(resolve));
    await disconnectDB();
    logger.info('Shutdown complete');
    process.exit(0);
  } catch (err) {
    logger.error('Error during shutdown', { message: err.message });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', {
    message: reason instanceof Error ? reason.message : String(reason),
  });
});

process.on('uncaughtException', (err) => {
  // The process is in an undefined state; log and let the platform restart it.
  logger.error('Uncaught exception — exiting', { message: err.message, stack: err.stack });
  process.exit(1);
});

start();

module.exports = { start, shutdown };
