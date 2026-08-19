#!/usr/bin/env node
/**
 * Explicit index creation.
 *
 * `autoIndex` is disabled in production (config/db.js) because implicit index
 * builds can lock a large collection during a deploy. This script performs the
 * build deliberately, when the operator chooses.
 */
const { connectDB, disconnectDB } = require('../config/db');

const MODELS = [
  require('../models/User'),
  require('../models/Product'),
  require('../models/Category'),
  require('../models/Order'),
  require('../models/Coupon'),
  require('../models/Review'),
  require('../models/Subscriber'),
  require('../models/ContactMessage'),
  require('../models/Counter'),
];

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

async function main() {
  await connectDB();
  log('\n  Building indexes…\n');

  for (const Model of MODELS) {
    // eslint-disable-next-line no-await-in-loop
    await Model.createIndexes();
    // eslint-disable-next-line no-await-in-loop
    const indexes = await Model.collection.indexes();
    log(`  ✓ ${Model.modelName.padEnd(16)} ${indexes.length} indexes`);
  }

  log('\n  Done.\n');
  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  log(`\n  ✗ Index creation failed: ${err.message}\n`);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
