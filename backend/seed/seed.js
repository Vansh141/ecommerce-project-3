#!/usr/bin/env node
/**
 * Catalogue seeder.
 *
 * Safety rules — this script can destroy a live catalogue, so it is deliberately
 * awkward to misuse:
 *   • It does nothing unless given an explicit command (`--import` / `--destroy`).
 *   • It refuses to run at all against NODE_ENV=production without `--force`.
 *   • `--import` is additive by default: existing products are updated in place,
 *     not deleted. Use `--fresh` to replace the catalogue.
 *   • It never touches users or orders.
 */
const mongoose = require('mongoose');
const config = require('../config/env');
const { connectDB, disconnectDB } = require('../config/db');
const Category = require('../models/Category');
const Product = require('../models/Product');
const { slugify } = require('../utils/slugify');
const { categories, products, APPAREL_SIZES } = require('./catalogue');

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);

const COMMANDS = { import: has('--import'), destroy: has('--destroy') };
const FORCE = has('--force');
const FRESH = has('--fresh');

function log(msg) {
  process.stdout.write(`${msg}\n`);
}

function guardProduction(action) {
  if (config.isProduction && !FORCE) {
    log(`\n  Refusing to ${action} against NODE_ENV=production.`);
    log('  If you are certain, re-run with --force.\n');
    process.exit(1);
  }
}

function skuFor(name, size) {
  const base = slugify(name).toUpperCase().replace(/-/g, '').slice(0, 8) || 'ITEM';
  return `${base}-${String(size).replace(/\s+/g, '').toUpperCase()}`;
}

async function importData() {
  guardProduction('seed');

  if (FRESH) {
    guardProduction('delete the existing catalogue');
    log('  Removing existing products and categories…');
    await Product.deleteMany({});
    await Category.deleteMany({});
  }

  // ── Categories ─────────────────────────────────────────────────────────────
  const categoryIdByKey = new Map();

  for (const cat of categories) {
    const slug = slugify(cat.name);
    const doc = await Category.findOneAndUpdate(
      { slug },
      {
        $set: {
          name: cat.name,
          slug,
          description: cat.description,
          displayOrder: cat.displayOrder,
          isActive: true,
          showInNav: true,
          image: { url: cat.image, publicId: '', alt: `${cat.name} collection` },
          metaTitle: cat.metaTitle,
          metaDescription: cat.metaDescription,
        },
      },
      { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
    );
    categoryIdByKey.set(cat.key, doc._id);
  }
  log(`  ✓ ${categories.length} categories ready`);

  // ── Products ───────────────────────────────────────────────────────────────
  let created = 0;
  let updated = 0;

  for (const item of products) {
    const categoryId = categoryIdByKey.get(item.category);
    if (!categoryId) {
      log(`  ! Skipping "${item.name}" — unknown category "${item.category}"`);
      continue;
    }

    const slug = slugify(item.name);
    const sizes = item.sizes || APPAREL_SIZES;

    const variantDocs = sizes.map((size) => ({
      size: String(size).toUpperCase(),
      sku: skuFor(item.name, size),
      stock: item.stock?.[size] ?? 0,
      isActive: true,
    }));

    const existing = await Product.findOne({ slug });

    if (existing) {
      // Preserve live stock levels on re-seed: overwriting them would wipe a
      // real shop's inventory the moment someone re-runs the seeder.
      existing.name = item.name;
      existing.description = item.description;
      existing.shortDescription = item.shortDescription;
      existing.category = categoryId;
      existing.price = item.price;
      existing.mrp = item.mrp;
      existing.material = item.material;
      existing.careInstructions = item.careInstructions;
      existing.tags = item.tags;
      existing.isFeatured = Boolean(item.isFeatured);
      existing.isNewArrival = Boolean(item.isNewArrival);
      existing.images = item.images.map((url, i) => ({
        url,
        publicId: '',
        alt: `${item.name} — view ${i + 1}`,
      }));
      await existing.save();
      updated += 1;
      continue;
    }

    await Product.create({
      name: item.name,
      slug,
      description: item.description,
      shortDescription: item.shortDescription,
      brand: 'TOUCH',
      category: categoryId,
      price: item.price,
      mrp: item.mrp,
      images: item.images.map((url, i) => ({
        url,
        publicId: '',
        alt: `${item.name} — view ${i + 1}`,
      })),
      variants: variantDocs,
      status: 'active',
      isFeatured: Boolean(item.isFeatured),
      isNewArrival: Boolean(item.isNewArrival),
      tags: item.tags,
      material: item.material,
      careInstructions: item.careInstructions,
      countryOfOrigin: 'India',
      metaTitle: item.name,
      metaDescription: item.shortDescription,
    });
    created += 1;
  }

  log(`  ✓ ${created} products created, ${updated} updated`);
  log('\n  Demo images are Unsplash placeholders — replace them in Admin → Products.\n');
}

async function destroyData() {
  guardProduction('delete the catalogue');

  const [productCount, categoryCount] = await Promise.all([
    Product.countDocuments(),
    Category.countDocuments(),
  ]);

  log(`  Deleting ${productCount} products and ${categoryCount} categories…`);
  await Product.deleteMany({});
  await Category.deleteMany({});
  log('  ✓ Catalogue cleared (users and orders untouched)');
}

async function main() {
  if (!COMMANDS.import && !COMMANDS.destroy) {
    log(`
  TOUCH catalogue seeder

    npm run seed              Add/update the demo catalogue (safe, additive)
    npm run seed -- --fresh   Replace the catalogue entirely
    npm run seed:destroy      Remove all products and categories

  Neither users nor orders are ever modified by this script.
  Add --force to override the production guard.
`);
    process.exit(0);
  }

  await connectDB();
  log(`\n  Connected to ${mongoose.connection.name}\n`);

  if (COMMANDS.destroy) await destroyData();
  else await importData();

  await disconnectDB();
  process.exit(0);
}

main().catch(async (err) => {
  log(`\n  ✗ Seeding failed: ${err.message}\n`);
  await disconnectDB().catch(() => {});
  process.exit(1);
});
