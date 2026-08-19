#!/usr/bin/env node
/**
 * Administrator bootstrap.
 *
 * Solves the chicken-and-egg problem: `role` defaults to `customer` and only an
 * admin can promote anyone, so a fresh deployment previously had no way to
 * reach its own admin panel without editing MongoDB by hand.
 *
 * Credentials come from the environment — never from a hardcoded default, and
 * never printed back out.
 */
const config = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function validate() {
  const { email, password, name } = config.adminBootstrap;
  const problems = [];

  if (!email) problems.push('ADMIN_EMAIL is not set.');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) problems.push('ADMIN_EMAIL is not a valid address.');

  if (!password) problems.push('ADMIN_PASSWORD is not set.');
  else {
    if (password.length < 12) problems.push('ADMIN_PASSWORD must be at least 12 characters.');
    if (!/[A-Za-z]/.test(password)) problems.push('ADMIN_PASSWORD must contain a letter.');
    if (!/[0-9]/.test(password)) problems.push('ADMIN_PASSWORD must contain a number.');
  }

  if (problems.length > 0) {
    log('\n  Cannot create the administrator account:\n');
    problems.forEach((p) => log(`    ✗ ${p}`));
    log(`
  Set these in backend/.env, run this command once, then blank them again:

    ADMIN_NAME=Your Name
    ADMIN_EMAIL=you@yourstore.com
    ADMIN_PASSWORD=<a long, unique password>
`);
    process.exit(1);
  }

  return { email: email.toLowerCase(), password, name: name || 'Store Owner' };
}

async function main() {
  const { email, password, name } = validate();

  await connectDB();

  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role === 'admin') {
      log(`\n  ✓ ${email} is already an administrator. Nothing to do.\n`);
    } else {
      existing.role = 'admin';
      existing.isActive = true;
      // Force a re-login so the elevated role is reflected in a fresh token.
      existing.tokenVersion = (existing.tokenVersion ?? 0) + 1;
      await existing.save();
      log(`\n  ✓ Promoted the existing account ${email} to administrator.`);
      log('    Their password was NOT changed. They must sign in again.\n');
    }
  } else {
    // Hashing happens in the User pre-save hook, so the plaintext never
    // reaches the database from here either.
    await User.create({ name, email, password, role: 'admin', emailVerified: true });
    log(`\n  ✓ Administrator account created for ${email}\n`);
  }

  log('  Now remove ADMIN_EMAIL and ADMIN_PASSWORD from your .env file.\n');

  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  log(`\n  ✗ Failed: ${err.message}\n`);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
