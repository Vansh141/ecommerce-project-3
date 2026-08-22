/**
 * RETIRED — do not use.
 *
 * This file is a leftover from the original electronics-store scaffold. Its
 * previous contents called `Product.deleteMany()` at module load, with no
 * command flag and no NODE_ENV guard, and then tried to insert sample data
 * shaped for a schema this project no longer has.
 *
 * Running it against a production connection string would have wiped the live
 * catalogue and inserted nothing in its place. It is referenced by no npm
 * script and no other module.
 *
 * The supported seeders are:
 *   npm run seed         → backend/seed/seed.js   (additive, production-guarded)
 *   npm run seed:admin   → backend/seed/createAdmin.js
 *   npm run indexes      → backend/seed/createIndexes.js
 *
 * This stub is kept only so that anyone who runs the old command by muscle
 * memory gets an error instead of a destroyed database. It is safe to delete.
 */
process.stderr.write(
  '\n  backend/seeder.js has been retired because it deleted the entire product\n' +
    '  collection without any safety guard.\n\n' +
    '  Use `npm run seed` (backend/seed/seed.js) instead — it is additive by\n' +
    '  default and refuses to run against NODE_ENV=production without --force.\n\n'
);
process.exit(1);
