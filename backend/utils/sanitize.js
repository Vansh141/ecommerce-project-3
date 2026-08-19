/**
 * Input-sanitisation helpers used across validators and query builders.
 */

/**
 * Escapes every regex metacharacter so user input can be embedded in a
 * MongoDB $regex without granting the caller regex authoring power.
 *
 * Without this, `?search=(a+)+$` pins a CPU core (ReDoS) and takes the
 * single-threaded server down.
 */
function escapeRegex(input = '') {
  return String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Builds a safe, length-capped, case-insensitive "contains" regex.
 * Returns null for empty input so callers can skip the filter entirely.
 */
function safeSearchRegex(input, maxLength = 80) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim().slice(0, maxLength);
  if (!trimmed) return null;
  return new RegExp(escapeRegex(trimmed), 'i');
}

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Recursively strips MongoDB operator keys ($-prefixed), dotted paths, and
 * prototype-pollution keys from an arbitrary payload.
 *
 * This is the defence against NoSQL operator injection: it prevents a body of
 * `{"email": {"$ne": null}}` from ever reaching a query builder. Mutates in
 * place and returns the number of keys removed.
 */
function stripOperators(value, depth = 0) {
  if (depth > 8 || value === null || typeof value !== 'object') return 0;

  let removed = 0;

  if (Array.isArray(value)) {
    for (const item of value) removed += stripOperators(item, depth + 1);
    return removed;
  }

  for (const key of Object.keys(value)) {
    if (key.startsWith('$') || key.includes('.') || FORBIDDEN_KEYS.has(key)) {
      delete value[key];
      removed += 1;
      continue;
    }
    removed += stripOperators(value[key], depth + 1);
  }
  return removed;
}

/**
 * Neutralises characters that let an attacker inject extra SMTP headers or
 * message lines through a user-supplied field (CRLF injection).
 */
function stripCRLF(input = '') {
  return String(input).replace(/[\r\n]+/g, ' ').trim();
}

/** Escapes HTML-significant characters for safe inclusion in an HTML email. */
function escapeHtml(input = '') {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { escapeRegex, safeSearchRegex, stripOperators, stripCRLF, escapeHtml };
