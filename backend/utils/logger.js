/**
 * Minimal structured logger.
 *
 * Deliberately dependency-free and secret-aware: any key whose name looks like
 * a credential is redacted before it can reach a log sink, so an accidental
 * `logger.info('cfg', config)` cannot leak a token.
 */
const config = require('../config/env');

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };
const activeLevel = LEVELS[config.logLevel] ?? LEVELS.info;

const SENSITIVE_KEY = /(pass(word)?|secret|token|authorization|cookie|apikey|api_key|signature|otp|cvv|card)/i;

function redact(value, depth = 0) {
  if (depth > 4 || value === null || value === undefined) return value;
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1));
  if (typeof value !== 'object') return value;
  if (value instanceof Error) return { name: value.name, message: value.message };

  const out = {};
  for (const [key, val] of Object.entries(value)) {
    out[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redact(val, depth + 1);
  }
  return out;
}

function emit(level, message, meta) {
  if (LEVELS[level] > activeLevel) return;

  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ...(meta !== undefined ? { meta: redact(meta) } : {}),
  };

  const line = config.isProduction
    ? JSON.stringify(entry)
    : `${entry.ts} ${level.toUpperCase().padEnd(5)} ${message}${meta !== undefined ? ` ${JSON.stringify(entry.meta)}` : ''}`;

  if (level === 'error') process.stderr.write(`${line}\n`);
  else process.stdout.write(`${line}\n`);
}

module.exports = {
  error: (msg, meta) => emit('error', msg, meta),
  warn: (msg, meta) => emit('warn', msg, meta),
  info: (msg, meta) => emit('info', msg, meta),
  debug: (msg, meta) => emit('debug', msg, meta),
  redact,
};
