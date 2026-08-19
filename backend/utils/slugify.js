/**
 * URL-slug generation. Dependency-free so there is no supply-chain surface for
 * something this small.
 */
const COMBINING_MARKS = /[̀-ͯ]/g;

function slugify(input = '') {
  return String(input)
    .normalize('NFKD')
    .replace(COMBINING_MARKS, '') // strip diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

/**
 * Produces a slug guaranteed unique within a collection by appending a counter.
 * `excludeId` lets an update keep its own slug without colliding with itself.
 */
async function uniqueSlug(Model, source, { excludeId = null, field = 'slug' } = {}) {
  const base = slugify(source) || 'item';
  let candidate = base;

  for (let i = 2; i < 200; i += 1) {
    const query = { [field]: candidate };
    if (excludeId) query._id = { $ne: excludeId };
    // eslint-disable-next-line no-await-in-loop
    const exists = await Model.exists(query);
    if (!exists) return candidate;
    candidate = `${base}-${i}`;
  }

  return `${base}-${Date.now()}`;
}

module.exports = { slugify, uniqueSlug };
