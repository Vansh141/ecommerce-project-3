const mongoose = require('mongoose');

/**
 * Client-managed storefront content — the homepage builder.
 *
 * One document per page (today only `homepage`). It holds two copies of the
 * same content: `draft`, which the admin edits freely, and `published`, the
 * only copy the public API ever returns. Publishing copies one to the other
 * explicitly, so an edit can never reach the live site by accident.
 *
 * The homepage is an ordered list of `sections`. Each has an `id`, a `type`
 * from `SECTION_TYPES`, an `enabled` flag and that type's own fields — plain
 * text, validated links, fixed options, references to existing categories and
 * products, and image descriptors produced by the upload service. Nothing can
 * carry HTML, CSS or script, and products and categories are referenced by id,
 * never copied.
 *
 * Sections are stored as validated plain objects: `storefrontService` rebuilds
 * every one field by field from an explicit whitelist before it is saved, which
 * is what keeps the shape trustworthy. The limits below are defence in depth.
 */

const ICONS = ['truck', 'returns', 'cod', 'secure', 'package', 'gift', 'sparkles', 'phone', 'heart'];
const TONES = ['maroon', 'olive', 'umber'];
/** `cod` items are shown only while cash on delivery can actually be used. */
const SHOW_WHEN = ['always', 'cod'];

const SECTION_TYPES = [
  'hero',
  'categoryRail',
  'productCollection',
  'productRail',
  'editorial',
  'campaign',
  'trust',
  'brandMessage',
];

const HERO_MODES = ['banner', 'structured'];
/** Seconds each Main Banner stays before the next one. */
const HERO_INTERVALS = [3, 4, 5];
/** How tall a Structured Banner with its own photo is. */
const HERO_SIZES = ['compact', 'medium', 'large'];
const ANNOUNCEMENT_MOTIONS = ['moving', 'still'];
/** rtl: messages travel from right to left; ltr: from left to right. */
const ANNOUNCEMENT_DIRECTIONS = ['rtl', 'ltr'];
const ANNOUNCEMENT_SPEEDS = ['slow', 'normal', 'fast'];
const CATEGORY_SOURCES = ['auto', 'manual'];
const PRODUCT_SOURCES = ['newArrivals', 'onSale', 'featured', 'popular', 'newest', 'category', 'manual'];
const CAMPAIGN_SOURCES = ['categories', 'custom'];
/** Promotion: words beside the artwork on a colour panel, or the artwork alone with optional words on top. */
const CAMPAIGN_LAYOUTS = ['split', 'fullImage'];
/** contain keeps the whole artwork visible; cover fills the banner and may trim its edges. */
const IMAGE_FITS = ['contain', 'cover'];
const COLLECTION_LAYOUTS = ['grid', 'rail'];
const DESKTOP_COLUMNS = [3, 4];
const EDITORIAL_LAYOUTS = ['imageRight', 'imageLeft'];
const EDITORIAL_THEMES = ['umber', 'maroon', 'olive', 'sand'];
/** Story: the photograph beside the words, or filling the whole panel under them. */
const EDITORIAL_DISPLAYS = ['split', 'fullImage'];
/** Where words laid over a photograph sit, and how strongly the photograph is shaded behind them. */
const TEXT_POSITIONS = ['left', 'center', 'right'];
const OVERLAYS = ['light', 'medium', 'dark'];
const ALIGNMENTS = ['left', 'center'];
const BRAND_THEMES = ['plain', 'sand'];

const LIMITS = Object.freeze({
  sections: 24,
  announcement: 6,
  trust: 6,
  campaignItems: 6,
  categoryItems: 16,
  productIds: 24,
  productLimit: 24,
  heroSlides: 4,
  /** Earlier published versions kept for "Restore Previous Version". */
  history: 5,
});

const text = (maxlength) => ({ type: String, trim: true, maxlength, default: '' });

/** Mirrors what `storageService.storeImage` returns. Never a base64 payload. */
const imageSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, maxlength: 500, required: true },
    publicId: { type: String, trim: true, maxlength: 200, default: '' },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    alt: text(160),
  },
  { _id: false }
);

const announcementItemSchema = new mongoose.Schema(
  {
    text: text(80),
    icon: { type: String, enum: ['', ...ICONS], default: '' },
    showWhen: { type: String, enum: SHOW_WHEN, default: 'always' },
  },
  { _id: false }
);

const contentSchema = new mongoose.Schema(
  {
    schemaVersion: { type: Number, default: 2 },
    /** Shown above the navigation on every storefront page. */
    announcement: {
      enabled: { type: Boolean, default: true },
      motion: { type: String, enum: ANNOUNCEMENT_MOTIONS, default: 'moving' },
      direction: { type: String, enum: ANNOUNCEMENT_DIRECTIONS, default: 'rtl' },
      speed: { type: String, enum: ANNOUNCEMENT_SPEEDS, default: 'normal' },
      items: { type: [announcementItemSchema], default: [] },
    },
    seo: {
      title: text(70),
      description: text(170),
      socialImage: { type: imageSchema, default: null },
    },
    sections: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
      validate: {
        validator: (value) => Array.isArray(value) && value.length <= LIMITS.sections,
        message: 'The homepage has too many sections.',
      },
    },
  },
  { _id: false, minimize: false }
);

/** One earlier published version, kept so it can be restored. */
const historyEntrySchema = new mongoose.Schema(
  {
    content: { type: contentSchema, required: true },
    version: { type: Number, required: true, min: 0 },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { _id: false }
);

const storefrontContentSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ['homepage'], required: true, unique: true, default: 'homepage' },

    draft: { type: contentSchema, default: null },
    published: { type: contentSchema, default: null },
    /** Earlier published versions, newest first. Their images stay stored, so a restore works at once. */
    history: { type: [historyEntrySchema], default: [] },

    /** Increments on every publish, so clients can tell content apart. */
    version: { type: Number, default: 0, min: 0 },

    draftUpdatedAt: { type: Date, default: null },
    draftUpdatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true, minimize: false }
);

const StorefrontContent = mongoose.model('StorefrontContent', storefrontContentSchema);

StorefrontContent.OPTIONS = Object.freeze({
  ICONS,
  TONES,
  SHOW_WHEN,
  SECTION_TYPES,
  HERO_MODES,
  HERO_INTERVALS,
  ANNOUNCEMENT_MOTIONS,
  ANNOUNCEMENT_DIRECTIONS,
  ANNOUNCEMENT_SPEEDS,
  CATEGORY_SOURCES,
  PRODUCT_SOURCES,
  CAMPAIGN_SOURCES,
  CAMPAIGN_LAYOUTS,
  IMAGE_FITS,
  COLLECTION_LAYOUTS,
  DESKTOP_COLUMNS,
  EDITORIAL_LAYOUTS,
  EDITORIAL_THEMES,
  EDITORIAL_DISPLAYS,
  HERO_SIZES,
  TEXT_POSITIONS,
  OVERLAYS,
  ALIGNMENTS,
  BRAND_THEMES,
  LIMITS,
});

module.exports = StorefrontContent;
