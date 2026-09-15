const { isDeepStrictEqual } = require('util');
const StorefrontContent = require('../models/StorefrontContent');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { sendSuccess } = require('../utils/apiResponse');
const storageService = require('../services/storageService');
const { normaliseContent, toPublicContent, collectPublicIds } = require('../services/storefrontService');

const KEY = 'homepage';
const { LIMITS } = StorefrontContent.OPTIONS;

const plain = (sub) => (sub && typeof sub.toObject === 'function' ? sub.toObject() : sub ?? null);

/**
 * Every stored image any kept version refers to: the draft, the live copy and
 * the earlier published versions that "Restore Previous Version" can bring
 * back. An image leaves storage only once none of them uses it, so replacing a
 * picture never breaks the live site and a restore always works at once.
 */
const referencedIds = (doc) => new Set([
  ...collectPublicIds(plain(doc.draft)),
  ...collectPublicIds(plain(doc.published)),
  ...(doc.history || []).flatMap((entry) => [...collectPublicIds(plain(entry.content))]),
]);

/** Removes stored images that no kept version references any more. Best effort, like products. */
function releaseUnusedImages(before, doc) {
  const stillUsed = referencedIds(doc);
  for (const publicId of before) {
    if (!stillUsed.has(publicId)) storageService.deleteImage(publicId).catch(() => {});
  }
}

/** Keeps the live copy as the newest earlier version, up to the history limit. */
function rememberLiveVersion(doc) {
  if (!doc.published) return;
  doc.history = [
    { content: plain(doc.published), version: doc.version, publishedAt: doc.publishedAt, publishedBy: doc.publishedBy },
    ...(doc.history || []).map(plain),
  ].slice(0, LIMITS.history);
}

/** What the admin panel sees: both copies, status, earlier versions and who changed what. */
async function adminView(doc) {
  if (!doc) {
    return {
      draft: null, published: null, version: 0, hasUnpublishedChanges: false,
      draftUpdatedAt: null, draftUpdatedBy: null, publishedAt: null, publishedBy: null, history: [],
    };
  }

  await doc.populate([
    { path: 'draftUpdatedBy', select: 'name' },
    { path: 'publishedBy', select: 'name' },
    { path: 'history.publishedBy', select: 'name' },
  ]);

  const draft = plain(doc.draft);
  const published = plain(doc.published);
  const person = (user) => (user?.name ? { name: user.name } : null);

  return {
    draft,
    published,
    version: doc.version,
    hasUnpublishedChanges: Boolean(draft) && !isDeepStrictEqual(draft, published),
    draftUpdatedAt: doc.draftUpdatedAt,
    draftUpdatedBy: person(doc.draftUpdatedBy),
    publishedAt: doc.publishedAt,
    publishedBy: person(doc.publishedBy),
    // Only when and by whom — the content itself stays on the server until it is restored.
    history: (doc.history || []).map((entry) => ({
      version: entry.version,
      publishedAt: entry.publishedAt,
      publishedBy: person(entry.publishedBy),
    })),
  };
}

const audit = (action, req, extra = {}) =>
  logger.info(`Storefront ${action}`, { action: `storefront.${action}`, actor: String(req.user._id), ...extra });

// ── GET /api/storefront ──────────────────────────────────────────────────────
/**
 * Public: the published homepage content, or `null` when nothing has been
 * published. Drafts, history, storage ids and editor identities never leave
 * the server.
 */
const getPublishedStorefront = asyncHandler(async (_req, res) => {
  const doc = await StorefrontContent.findOne({ key: KEY }).select('published version publishedAt').lean();
  const content = toPublicContent(doc?.published ?? null);

  // Low-frequency content: browsers and any CDN may reuse it briefly, but a
  // publish still reaches every visitor within about a minute.
  res.set('Cache-Control', 'public, max-age=30');
  return sendSuccess(res, {
    content,
    version: content ? doc.version : 0,
    publishedAt: content ? doc.publishedAt : null,
  });
});

// ── GET /api/admin/storefront ────────────────────────────────────────────────
const getAdminStorefront = asyncHandler(async (_req, res) => {
  const doc = await StorefrontContent.findOne({ key: KEY });
  res.set('Cache-Control', 'no-store');
  return sendSuccess(res, await adminView(doc));
});

// ── PUT /api/admin/storefront/draft ──────────────────────────────────────────
const saveDraft = asyncHandler(async (req, res) => {
  const content = await normaliseContent(req.body?.content);

  const doc = (await StorefrontContent.findOne({ key: KEY })) || new StorefrontContent({ key: KEY });
  const before = referencedIds(doc);

  doc.draft = content;
  doc.draftUpdatedAt = new Date();
  doc.draftUpdatedBy = req.user._id;
  await doc.save();

  releaseUnusedImages(before, doc);
  audit('draft_saved', req);
  res.set('Cache-Control', 'no-store');
  return sendSuccess(res, await adminView(doc));
});

// ── POST /api/admin/storefront/publish ───────────────────────────────────────
/**
 * Publishes the draft. When `content` is sent, it is validated and saved as
 * the draft first, so "Publish" always publishes exactly what is on screen.
 * The version it replaces is kept, so it can be restored.
 */
const publish = asyncHandler(async (req, res) => {
  const doc = (await StorefrontContent.findOne({ key: KEY })) || new StorefrontContent({ key: KEY });
  const before = referencedIds(doc);

  if (req.body?.content !== undefined) {
    doc.draft = await normaliseContent(req.body.content);
    doc.draftUpdatedAt = new Date();
    doc.draftUpdatedBy = req.user._id;
  }
  if (!doc.draft) {
    throw ApiError.badRequest('There is no draft to publish yet. Save a draft first.', { code: 'NO_DRAFT' });
  }

  // Re-validated at publish time, in case the rules tightened since it was saved.
  const content = await normaliseContent(plain(doc.draft));
  // Publishing the same content again adds nothing worth restoring.
  if (!isDeepStrictEqual(content, plain(doc.published))) rememberLiveVersion(doc);
  doc.draft = content;
  doc.published = content;
  doc.version += 1;
  doc.publishedAt = new Date();
  doc.publishedBy = req.user._id;
  await doc.save();

  releaseUnusedImages(before, doc);
  audit('published', req, { version: doc.version });
  res.set('Cache-Control', 'no-store');
  return sendSuccess(res, await adminView(doc));
});

// ── POST /api/admin/storefront/discard ───────────────────────────────────────
/**
 * Discards the draft: it becomes the live version again, or — when nothing has
 * been published — is removed, so the editor returns to the built-in homepage
 * that customers see.
 */
const discardDraft = asyncHandler(async (req, res) => {
  const doc = await StorefrontContent.findOne({ key: KEY });
  if (!doc) return sendSuccess(res, await adminView(null));

  const before = referencedIds(doc);
  doc.draft = doc.published ? plain(doc.published) : null;
  doc.draftUpdatedAt = new Date();
  doc.draftUpdatedBy = req.user._id;
  await doc.save();

  releaseUnusedImages(before, doc);
  audit('draft_discarded', req);
  res.set('Cache-Control', 'no-store');
  return sendSuccess(res, await adminView(doc));
});

// ── POST /api/admin/storefront/restore ───────────────────────────────────────
/**
 * Restore Previous Version: the most recent earlier published version becomes
 * the live homepage (and the draft) again, as a new version. The version it
 * replaces is kept in its place, so a restore can itself be undone the same
 * way. The stored content is re-validated first — a category or product
 * deleted since then is reported instead of published.
 */
const restorePrevious = asyncHandler(async (req, res) => {
  const doc = await StorefrontContent.findOne({ key: KEY });
  const previous = doc?.history?.[0];
  if (!previous) {
    throw ApiError.badRequest('There is no earlier published version to restore.', { code: 'NO_PREVIOUS_VERSION' });
  }

  const content = await normaliseContent(plain(previous.content));
  const before = referencedIds(doc);
  const restoredVersion = previous.version;

  const rest = doc.history.slice(1).map(plain);
  doc.history = rest;
  rememberLiveVersion(doc);
  doc.draft = content;
  doc.published = content;
  doc.version += 1;
  doc.publishedAt = new Date();
  doc.publishedBy = req.user._id;
  doc.draftUpdatedAt = doc.publishedAt;
  doc.draftUpdatedBy = req.user._id;
  await doc.save();

  releaseUnusedImages(before, doc);
  audit('restored', req, { version: doc.version, restoredVersion });
  res.set('Cache-Control', 'no-store');
  return sendSuccess(res, await adminView(doc));
});

module.exports = { getPublishedStorefront, getAdminStorefront, saveDraft, publish, discardDraft, restorePrevious };
