const config = require('../config/env');
const ApiError = require('../utils/ApiError');
const Category = require('../models/Category');
const Product = require('../models/Product');
const StorefrontContent = require('../models/StorefrontContent');

const {
  ICONS, TONES, SHOW_WHEN, SECTION_TYPES, HERO_MODES, HERO_INTERVALS, HERO_SIZES,ANNOUNCEMENT_MOTIONS, ANNOUNCEMENT_DIRECTIONS, ANNOUNCEMENT_SPEEDS, EDITORIAL_DISPLAYS, TEXT_POSITIONS, OVERLAYS, CATEGORY_SOURCES, PRODUCT_SOURCES,
  CAMPAIGN_SOURCES, CAMPAIGN_LAYOUTS, IMAGE_FITS, COLLECTION_LAYOUTS, DESKTOP_COLUMNS, EDITORIAL_LAYOUTS, EDITORIAL_THEMES,
  ALIGNMENTS, BRAND_THEMES, LIMITS,
} = StorefrontContent.OPTIONS;

/**
 * Storefront content validation.
 *
 * Content arrives from the homepage builder as one JSON document. It is
 * rebuilt here field by field from an explicit whitelist — nothing the client
 * sends is stored unless this module names it — so an unknown key, an HTML
 * fragment, a `javascript:` link, an inline base64 image, an unsupported
 * section type or a reference to a category or product that does not exist is
 * rejected or dropped before it reaches the database. Frontend validation is a
 * convenience only.
 */

/** C0 controls and DEL, except tab, line feed and carriage return. */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
/** Anything shaped like a tag. Plain text never needs one. */
const MARKUP = /<\s*\/?\s*[a-z!?][^>]*>/i;
const PUBLIC_ID = /^[\w\-/:.]+$/;
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const SECTION_ID = /^[A-Za-z0-9_-]{4,40}$/;
/** Same-site path: one leading slash, never `//host` or `/\host`, no spaces. */
const SITE_PATH = /^\/(?![/\\])\S*$/;
const HTTPS_URL = /^https:\/\/[^\s/?#]+\.[^\s/?#]+(?:[/?#]\S*)?$/i;
/** Uploads are https (Cloudinary) or the API's own /uploads path. Plain http
 *  is only the local-disk fallback in development. */
const IMAGE_URL = config.isProduction ? /^(?:https:\/\/|\/uploads\/)\S+$/i : /^(?:https?:\/\/|\/uploads\/)\S+$/i;

const SECTION_LABELS = {
  hero: 'Hero',
  categoryRail: 'Category rail',
  productCollection: 'Product collection',
  productRail: 'Product rail',
  editorial: 'Editorial',
  campaign: 'Campaign',
  trust: 'Trust strip',
  brandMessage: 'Brand message',
};

const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {});

function createCollector() {
  const errors = [];
  const refs = { categories: [], products: [] };

  const add = (field, message) => errors.push({ field, message });

  const text = (value, field, label, { max, required = false, multiline = false } = {}) => {
    if (value === undefined || value === null) value = '';
    if (typeof value !== 'string') {
      add(field, `${label} must be text.`);
      return '';
    }
    let cleaned = value.replace(CONTROL_CHARS, '');
    cleaned = multiline
      ? cleaned.replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
      : cleaned.replace(/\s+/g, ' ').trim();
    if (MARKUP.test(cleaned)) {
      add(field, `${label} must be plain text — HTML is not allowed.`);
      return '';
    }
    if (cleaned.length > max) add(field, `${label} must be ${max} characters or fewer.`);
    if (required && !cleaned) add(field, `${label} is required.`);
    return cleaned.slice(0, max);
  };

  const link = (value, field, label, { required = false } = {}) => {
    const cleaned = text(value, field, label, { max: 300, required });
    if (!cleaned) return '';
    if (SITE_PATH.test(cleaned) || HTTPS_URL.test(cleaned)) return cleaned;
    add(field, `${label} must be a page on this site, like /shop, or a full https:// address.`);
    return '';
  };

  const option = (value, allowed, field, label, fallback) => {
    if (value === undefined || value === null || value === '') return fallback;
    if (allowed.includes(value)) return value;
    add(field, `${label} is not one of the available options.`);
    return fallback;
  };

  const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);

  const int = (value, field, label, { min, max, fallback }) => {
    if (value === undefined || value === null || value === '') return fallback;
    const n = Number(value);
    if (!Number.isInteger(n) || n < min || n > max) {
      add(field, `${label} must be a whole number from ${min} to ${max}.`);
      return fallback;
    }
    return n;
  };

  /** Where a filled image is centred (x, y as percentages) and how far it is zoomed in. Absent means centred, no zoom. */
  const imageFraming = (value, field, label) => {
    if (value === undefined || value === null) return null;
    const inRange = (n, min, max) => typeof n === 'number' && Number.isFinite(n) && n >= min && n <= max;
    const valid = typeof value === 'object' && !Array.isArray(value)
      && inRange(value.x, 0, 100) && inRange(value.y, 0, 100) && inRange(value.zoom, 1, 3);
    if (!valid) {
      add(field, `The position or zoom saved for ${label.charAt(0).toLowerCase()}${label.slice(1)} is not valid. Open Edit image and save it again.`);
      return null;
    }
    return { x: value.x, y: value.y, zoom: value.zoom };
  };

  const image = (value, field, label) => {
    if (value === undefined || value === null || value === '') return null;
    if (typeof value !== 'object' || Array.isArray(value)) {
      add(field, `${label} is invalid.`);
      return null;
    }
    const url = typeof value.url === 'string' ? value.url.trim() : '';
    if (!url) return null;
    if (url.length > 500 || !IMAGE_URL.test(url)) {
      add(`${field}.url`, `${label} must be an image uploaded through the admin panel.`);
      return null;
    }
    const publicId = typeof value.publicId === 'string' ? value.publicId.trim() : '';
    if (publicId && (publicId.length > 200 || !PUBLIC_ID.test(publicId))) {
      add(`${field}.publicId`, `${label} has an invalid storage reference.`);
      return null;
    }
    const dimension = (n) => (Number.isInteger(n) && n > 0 && n <= 20000 ? n : null);
    const descriptor = {
      url,
      publicId,
      width: dimension(value.width),
      height: dimension(value.height),
      alt: text(value.alt, `${field}.alt`, `${label} description`, { max: 160 }),
    };
    const framing = imageFraming(value.framing, `${field}.framing`, label);
    if (framing) descriptor.framing = framing;
    return descriptor;
  };

  const list = (value, field, label, max, mapItem) => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      add(field, `${label} must be a list.`);
      return [];
    }
    if (value.length > max) add(field, `${label} can have at most ${max} items.`);
    return value
      .slice(0, max)
      .map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          add(`${field}.${index}`, `${label} ${index + 1} is malformed.`);
          return null;
        }
        return mapItem(item, `${field}.${index}`, index + 1);
      })
      .filter(Boolean);
  };

  /** A reference to an existing record; existence is checked once, afterwards. */
  const ref = (kind, value, field, label, { required = false } = {}) => {
    if (value === undefined || value === null || value === '') {
      if (required) add(field, `${label} is required.`);
      return null;
    }
    if (typeof value !== 'string' || !OBJECT_ID.test(value)) {
      add(field, `${label} is not a valid reference.`);
      return null;
    }
    const id = value.toLowerCase();
    refs[kind].push({ id, field, label });
    return id;
  };

  const productRefs = (value, field, label) => {
    if (value === undefined || value === null) return [];
    if (!Array.isArray(value)) {
      add(field, `${label} must be a list.`);
      return [];
    }
    if (value.length > LIMITS.productIds) add(field, `Choose at most ${LIMITS.productIds} products.`);
    const ids = [];
    value.slice(0, LIMITS.productIds).forEach((raw, index) => {
      const id = ref('products', raw, `${field}.${index}`, `Product ${index + 1}`, { required: true });
      if (id && !ids.includes(id)) ids.push(id);
    });
    return ids;
  };

  return { errors, refs, add, text, link, option, bool, int, image, list, ref, productRefs };
}

/* ══════════════════════ Sections ═════════════════════════════════════════ */

/** One banner: a full banner and a structured hero, both kept so switching loses nothing. */
function heroSlideFields(raw, f, v) {
  const banner = asObject(raw.banner);
  const s = asObject(raw.structured);
  return {
    mode: v.option(raw.mode, HERO_MODES, `${f}.mode`, 'Hero mode', 'structured'),
    banner: {
      desktopImage: v.image(banner.desktopImage, `${f}.banner.desktopImage`, 'Desktop banner'),
      mobileImage: v.image(banner.mobileImage, `${f}.banner.mobileImage`, 'Mobile banner'),
      alt: v.text(banner.alt, `${f}.banner.alt`, 'Banner description', { max: 160 }),
      link: v.link(banner.link, `${f}.banner.link`, 'Banner link'),
      // Optional words laid over the image.
      eyebrow: v.text(banner.eyebrow, `${f}.banner.eyebrow`, 'Small text above heading', { max: 40 }),
      heading: v.text(banner.heading, `${f}.banner.heading`, 'Main heading', { max: 60 }),
      accentText: v.text(banner.accentText, `${f}.banner.accentText`, 'Highlighted heading', { max: 60 }),
      description: v.text(banner.description, `${f}.banner.description`, 'Supporting text', { max: 200 }),
      buttonText: v.text(banner.buttonText, `${f}.banner.buttonText`, 'Button text', { max: 30 }),
      buttonLink: v.link(banner.buttonLink, `${f}.banner.buttonLink`, 'Button link'),
      textPosition: v.option(banner.textPosition, TEXT_POSITIONS, `${f}.banner.textPosition`, 'Text position', 'left'),
      overlay: v.option(banner.overlay, OVERLAYS, `${f}.banner.overlay`, 'Overlay strength', 'medium'),
    },
    structured: {
      image: v.image(s.image, `${f}.structured.image`, 'Hero desktop image'),
      mobileImage: v.image(s.mobileImage, `${f}.structured.mobileImage`, 'Hero mobile image'),
      detailImage: v.image(s.detailImage, `${f}.structured.detailImage`, 'Hero detail image'),
      eyebrow: v.text(s.eyebrow, `${f}.structured.eyebrow`, 'Eyebrow', { max: 40 }),
      heading: v.text(s.heading, `${f}.structured.heading`, 'Heading', { max: 60 }),
      accentText: v.text(s.accentText, `${f}.structured.accentText`, 'Accent text', { max: 60 }),
      description: v.text(s.description, `${f}.structured.description`, 'Description', { max: 200 }),
      primaryButtonText: v.text(s.primaryButtonText, `${f}.structured.primaryButtonText`, 'Button text', { max: 30 }),
      primaryButtonLink: v.link(s.primaryButtonLink, `${f}.structured.primaryButtonLink`, 'Button link'),
      detailCaption: v.text(s.detailCaption, `${f}.structured.detailCaption`, 'Detail caption', { max: 60 }),
      // With its own photo: how tall the banner is, and how strongly the photo is shaded behind the words (%).
      size: v.option(s.size, HERO_SIZES, `${f}.structured.size`, 'Banner height', 'compact'),
      shade: v.int(s.shade, `${f}.structured.shade`, 'Image shade', { min: 0, max: 100, fallback: 90 }),
    },
  };
}

const SLIDE_ID = /^[A-Za-z0-9_-]{1,40}$/;

/**
 * The Main Banner: up to four banners that take turns, each a full banner or
 * a structured hero, plus whether and how often they change. A hero saved
 * before banners existed has no `slides` and is a single banner. The first
 * banner is mirrored into the single-banner fields, so anything that reads a
 * hero the older way still shows it.
 */
function heroSection(raw, f, v) {
  const hasSlides = Array.isArray(raw.slides) && raw.slides.length > 0;
  const ids = new Set();
  const slides = hasSlides
    ? v.list(raw.slides, `${f}.slides`, 'Banners', LIMITS.heroSlides, (item, field, n) => {
      let id = typeof item.id === 'string' && SLIDE_ID.test(item.id) ? item.id : `slide-${n}`;
      if (ids.has(id)) id = `slide-${n}`;
      ids.add(id);
      return { id, enabled: v.bool(item.enabled, true), ...heroSlideFields(item, field, v) };
    })
    : [];
  const first = slides[0] || heroSlideFields(raw, f, v);
  const interval = raw.interval === undefined || raw.interval === null || raw.interval === '' ? undefined : Number(raw.interval);
  return {
    mode: first.mode,
    banner: first.banner,
    structured: first.structured,
    slides,
    autoplay: v.bool(raw.autoplay, true),
    interval: v.option(interval, HERO_INTERVALS, `${f}.interval`, 'Time between banners', 4),
  };
}
function categoryRailSection(raw, f, v) {
  return {
    title: v.text(raw.title, `${f}.title`, 'Title', { max: 60 }),
    subtitle: v.text(raw.subtitle, `${f}.subtitle`, 'Subtitle', { max: 120 }),
    source: v.option(raw.source, CATEGORY_SOURCES, `${f}.source`, 'Categories shown', 'auto'),
    items: v.list(raw.items, `${f}.items`, 'Category', LIMITS.categoryItems, (item, field, n) => ({
      enabled: v.bool(item.enabled, true),
      categoryId: v.ref('categories', item.categoryId, `${field}.categoryId`, `Category ${n}`, { required: true }),
      title: v.text(item.title, `${field}.title`, `Category ${n} display title`, { max: 40 }),
      subtitle: v.text(item.subtitle, `${field}.subtitle`, `Category ${n} subtitle`, { max: 60 }),
      image: v.image(item.image, `${field}.image`, `Category ${n} image`),
      link: v.link(item.link, `${field}.link`, `Category ${n} link`),
    })),
  };
}

function productFields(raw, f, v) {
  const source = v.option(raw.source, PRODUCT_SOURCES, `${f}.source`, 'Product source', 'newArrivals');
  return {
    title: v.text(raw.title, `${f}.title`, 'Title', { max: 60 }),
    subtitle: v.text(raw.subtitle, `${f}.subtitle`, 'Subtitle', { max: 120 }),
    source,
    categoryId: source === 'category'
      ? v.ref('categories', raw.categoryId, `${f}.categoryId`, 'Category', { required: true })
      : null,
    productIds: source === 'manual' ? v.productRefs(raw.productIds, `${f}.productIds`, 'Products') : [],
    limit: v.int(raw.limit, `${f}.limit`, 'Maximum products', { min: 1, max: LIMITS.productLimit, fallback: 8 }),
    minItems: v.int(raw.minItems, `${f}.minItems`, 'Minimum products', { min: 1, max: LIMITS.productLimit, fallback: 1 }),
    fallbackToNewest: v.bool(raw.fallbackToNewest, false),
    viewAllText: v.text(raw.viewAllText, `${f}.viewAllText`, 'View all text', { max: 30 }),
    viewAllLink: v.link(raw.viewAllLink, `${f}.viewAllLink`, 'View all link'),
  };
}

function productCollectionSection(raw, f, v) {
  const columns = raw.desktopColumns === undefined || raw.desktopColumns === null || raw.desktopColumns === ''
    ? undefined
    : Number(raw.desktopColumns);
  return {
    ...productFields(raw, f, v),
    layout: v.option(raw.layout, COLLECTION_LAYOUTS, `${f}.layout`, 'Layout', 'grid'),
    desktopColumns: v.option(columns, DESKTOP_COLUMNS, `${f}.desktopColumns`, 'Desktop columns', 4),
    mobileLayout: v.option(raw.mobileLayout, COLLECTION_LAYOUTS, `${f}.mobileLayout`, 'Mobile layout', 'grid'),
    showCount: v.bool(raw.showCount, false),
    skipShownProducts: v.bool(raw.skipShownProducts, false),
  };
}

function editorialSection(raw, f, v) {
  return {
    image: v.image(raw.image, `${f}.image`, 'Image'),
    mobileImage: v.image(raw.mobileImage, `${f}.mobileImage`, 'Mobile image'),
    eyebrow: v.text(raw.eyebrow, `${f}.eyebrow`, 'Eyebrow', { max: 40 }),
    heading: v.text(raw.heading, `${f}.heading`, 'Heading', { max: 60 }),
    description: v.text(raw.description, `${f}.description`, 'Description', { max: 240 }),
    buttonText: v.text(raw.buttonText, `${f}.buttonText`, 'Button text', { max: 30 }),
    buttonLink: v.link(raw.buttonLink, `${f}.buttonLink`, 'Button link'),
    layout: v.option(raw.layout, EDITORIAL_LAYOUTS, `${f}.layout`, 'Layout', 'imageRight'),
    theme: v.option(raw.theme, EDITORIAL_THEMES, `${f}.theme`, 'Background', 'umber'),
    display: v.option(raw.display, EDITORIAL_DISPLAYS, `${f}.display`, 'Layout', 'split'),
    textPosition: v.option(raw.textPosition, TEXT_POSITIONS, `${f}.textPosition`, 'Text position', 'left'),
    overlay: v.option(raw.overlay, OVERLAYS, `${f}.overlay`, 'Overlay strength', 'medium'),
    // Full Image: how strongly the shading behind the words shows (%).
    shade: v.int(raw.shade, `${f}.shade`, 'Shade strength', { min: 0, max: 100, fallback: 100 }),
  };
}

function campaignSection(raw, f, v) {
  return {
    title: v.text(raw.title, `${f}.title`, 'Title', { max: 60 }),
    source: v.option(raw.source, CAMPAIGN_SOURCES, `${f}.source`, 'Promotion source', 'categories'),
    items: v.list(raw.items, `${f}.items`, 'Promotion', LIMITS.campaignItems, (item, field, n) => ({
      enabled: v.bool(item.enabled, true),
      layout: v.option(item.layout, CAMPAIGN_LAYOUTS, `${field}.layout`, `Promotion ${n} layout`, 'split'),
      desktopImage: v.image(item.desktopImage, `${field}.desktopImage`, `Promotion ${n} image`),
      mobileImage: v.image(item.mobileImage, `${field}.mobileImage`, `Promotion ${n} phone image`),
      eyebrow: v.text(item.eyebrow, `${field}.eyebrow`, `Promotion ${n} small text`, { max: 40 }),
      // Required per layout, and only while shown — see SECTION_RULES.campaign.
      title: v.text(item.title, `${field}.title`, `Promotion ${n} main heading`, { max: 50 }),
      description: v.text(item.description, `${field}.description`, `Promotion ${n} description`, { max: 120 }),
      buttonText: v.text(item.buttonText, `${field}.buttonText`, `Promotion ${n} button text`, { max: 30 }),
      link: v.link(item.link, `${field}.link`, `Promotion ${n} button link`, { required: true }),
      tone: v.option(item.tone, TONES, `${field}.tone`, `Promotion ${n} background colour`, 'umber'),
      textPosition: v.option(item.textPosition, TEXT_POSITIONS, `${field}.textPosition`, `Promotion ${n} text position`, 'left'),
      overlay: v.option(item.overlay, OVERLAYS, `${field}.overlay`, `Promotion ${n} image shade`, 'medium'),
      imageFit: v.option(item.imageFit, IMAGE_FITS, `${field}.imageFit`, `Promotion ${n} image display`, 'contain'),
    })),
  };
}

function trustSection(raw, f, v) {
  return {
    items: v.list(raw.items, `${f}.items`, 'Service message', LIMITS.trust, (item, field, n) => ({
      enabled: v.bool(item.enabled, true),
      icon: v.option(item.icon, ICONS, `${field}.icon`, `Service message ${n} icon`, 'sparkles'),
      title: v.text(item.title, `${field}.title`, `Service message ${n} title`, { max: 40, required: true }),
      description: v.text(item.description, `${field}.description`, `Service message ${n} description`, { max: 80 }),
      link: v.link(item.link, `${field}.link`, `Service message ${n} link`),
      showWhen: v.option(item.showWhen, SHOW_WHEN, `${field}.showWhen`, `Service message ${n} visibility`, 'always'),
    })),
  };
}

function brandMessageSection(raw, f, v) {
  return {
    eyebrow: v.text(raw.eyebrow, `${f}.eyebrow`, 'Eyebrow', { max: 40 }),
    title: v.text(raw.title, `${f}.title`, 'Title', { max: 80 }),
    description: v.text(raw.description, `${f}.description`, 'Description', { max: 600, multiline: true }),
    buttonText: v.text(raw.buttonText, `${f}.buttonText`, 'Button text', { max: 30 }),
    link: v.link(raw.link, `${f}.link`, 'Button link'),
    alignment: v.option(raw.alignment, ALIGNMENTS, `${f}.alignment`, 'Alignment', 'center'),
    theme: v.option(raw.theme, BRAND_THEMES, `${f}.theme`, 'Background', 'plain'),
  };
}

const SECTION_BUILDERS = {
  hero: heroSection,
  categoryRail: categoryRailSection,
  productCollection: productCollectionSection,
  productRail: productFields,
  editorial: editorialSection,
  campaign: campaignSection,
  trust: trustSection,
  brandMessage: brandMessageSection,
};

const productRules = (s, f, v) => {
  if (s.source === 'manual' && s.productIds.length === 0) v.add(`${f}.productIds`, 'Choose at least one product.');
  if (s.minItems > s.limit) v.add(`${f}.minItems`, 'The minimum cannot be higher than the maximum.');
};

/** Rules for one banner that is shown. */
function heroSlideRules(s, f, v) {
  if (s.mode === 'banner') {
    if (!s.banner.desktopImage) v.add(`${f}.banner.desktopImage`, 'Upload a large-screen image, or change this banner to Structured.');
    if (!s.banner.alt) v.add(`${f}.banner.alt`, 'Describe the banner for screen readers, including any words in the artwork.');
    if (s.banner.buttonText && !s.banner.buttonLink) v.add(`${f}.banner.buttonLink`, 'Add a link for the banner button.');
  } else {
    if (!s.structured.heading) v.add(`${f}.structured.heading`, 'Add a main heading for this banner.');
    if (s.structured.primaryButtonText && !s.structured.primaryButtonLink) {
      v.add(`${f}.structured.primaryButtonLink`, 'Add a link for the banner button.');
    }
  }
}

/** Rules that apply only while a section is switched on. */
const SECTION_RULES = {
  hero(s, f, v) {
    if (s.slides.length === 0) {
      heroSlideRules(s, f, v);
      return;
    }
    if (!s.slides.some((slide) => slide.enabled)) v.add(`${f}.slides`, 'Show at least one banner, or hide the Main Banner.');
    s.slides.forEach((slide, index) => {
      if (slide.enabled) heroSlideRules(slide, `${f}.slides.${index}`, v);
    });
  },
  categoryRail(s, f, v) {
    if (s.source === 'manual' && s.items.length === 0) {
      v.add(`${f}.items`, 'Add at least one category, or show all categories automatically.');
    }
  },
  productCollection: productRules,
  productRail: productRules,
  editorial(s, f, v) {
    if (!s.heading) v.add(`${f}.heading`, 'Add a heading, or switch the section off.');
    if (s.buttonText && !s.buttonLink) v.add(`${f}.buttonLink`, 'Add a link for the button.');
  },
  campaign(s, f, v) {
    // Stored promotions are not shown, or editable, while the automatic source is chosen.
    if (s.source !== 'custom') return;
    if (s.items.length === 0) {
      v.add(`${f}.items`, 'Add at least one promotion, or show the automatic promotions.');
    }
    s.items.forEach((item, index) => {
      if (!item.enabled) return;
      const field = `${f}.items.${index}`;
      const n = index + 1;
      if (item.layout === 'fullImage') {
        if (!item.desktopImage) v.add(`${field}.desktopImage`, `Upload a banner image for promotion ${n}, or switch it to Split Layout.`);
        if (!item.title && !item.desktopImage?.alt) {
          v.add(`${field}.title`, `Add a main heading or an image description for promotion ${n}.`);
        }
      } else if (!item.title) {
        v.add(`${field}.title`, `Add a main heading for promotion ${n}.`);
      }
    });
  },
  brandMessage(s, f, v) {
    if (!s.title) v.add(`${f}.title`, 'Add a title, or switch the section off.');
    if (s.buttonText && !s.link) v.add(`${f}.link`, 'Add a link for the button.');
  },
};

function normaliseSections(value, v) {
  if (!Array.isArray(value)) {
    v.add('sections', 'Homepage sections are missing.');
    return [];
  }
  if (value.length > LIMITS.sections) v.add('sections', `The homepage can have at most ${LIMITS.sections} sections.`);

  const ids = new Set();
  let heroes = 0;

  return value
    .slice(0, LIMITS.sections)
    .map((raw, index) => {
      const f = `sections.${index}`;
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        v.add(f, `Section ${index + 1} is malformed.`);
        return null;
      }
      if (!SECTION_TYPES.includes(raw.type)) {
        v.add(`${f}.type`, `Section ${index + 1} is not a supported section type.`);
        return null;
      }

      let id = typeof raw.id === 'string' && SECTION_ID.test(raw.id) ? raw.id : null;
      if (!id) {
        v.add(`${f}.id`, `Section ${index + 1} has an invalid id.`);
      } else if (ids.has(id)) {
        v.add(`${f}.id`, `Section ${index + 1} has the same id as another section.`);
        id = null;
      } else {
        ids.add(id);
      }

      if (raw.type === 'hero') {
        heroes += 1;
        if (heroes > 1) v.add(`${f}.type`, 'The homepage can have only one hero.');
      }

      const section = {
        id: id || `invalid-${index}`,
        type: raw.type,
        enabled: v.bool(raw.enabled, true),
        ...SECTION_BUILDERS[raw.type](raw, f, v),
      };
      if (section.enabled && SECTION_RULES[raw.type]) SECTION_RULES[raw.type](section, f, v);
      return section;
    })
    .filter(Boolean);
}

/** One query per kind: every referenced category and product must exist. */
async function verifyReferences(v) {
  const unique = (list) => [...new Set(list.map((r) => r.id))];
  const categoryIds = unique(v.refs.categories);
  const productIds = unique(v.refs.products);

  const [categories, products] = await Promise.all([
    categoryIds.length ? Category.find({ _id: { $in: categoryIds } }).select('_id').lean() : [],
    productIds.length ? Product.find({ _id: { $in: productIds } }).select('_id').lean() : [],
  ]);

  const existingCategories = new Set(categories.map((c) => String(c._id)));
  const existingProducts = new Set(products.map((p) => String(p._id)));

  v.refs.categories
    .filter((r) => !existingCategories.has(r.id))
    .forEach((r) => v.add(r.field, `${r.label} no longer exists. Choose another category.`));
  v.refs.products
    .filter((r) => !existingProducts.has(r.id))
    .forEach((r) => v.add(r.field, `${r.label} no longer exists. Remove it from the selection.`));
}

/**
 * Validates and rebuilds a content document. Throws a 400 listing every
 * problem, so the admin sees all of them at once rather than one per save.
 */
async function normaliseContent(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw ApiError.badRequest('Storefront content is missing.', { code: 'VALIDATION_ERROR' });
  }

  const v = createCollector();
  const announcement = asObject(raw.announcement);
  const seo = asObject(raw.seo);

  const content = {
    // 3 marks content saved by the current builder, whose section list is kept exactly.
    // A version 2 document (such as a restored older version) stays 2, so the
    // storefront still gives it the Shop by Category section it predates.
    schemaVersion: Number(raw.schemaVersion) === 2 ? 2 : 3,
    announcement: {
      enabled: v.bool(announcement.enabled, true),
      items: v.list(announcement.items, 'announcement.items', 'Announcement', LIMITS.announcement, (item, field, n) => ({
        text: v.text(item.text, `${field}.text`, `Announcement ${n}`, { max: 80, required: true }),
        icon: v.option(item.icon, ICONS, `${field}.icon`, `Announcement ${n} icon`, ''),
        showWhen: v.option(item.showWhen, SHOW_WHEN, `${field}.showWhen`, `Announcement ${n} visibility`, 'always'),
      })),
      motion: v.option(announcement.motion, ANNOUNCEMENT_MOTIONS, 'announcement.motion', 'Movement', 'moving'),
      direction: v.option(announcement.direction, ANNOUNCEMENT_DIRECTIONS, 'announcement.direction', 'Direction', 'rtl'),
      speed: v.option(announcement.speed, ANNOUNCEMENT_SPEEDS, 'announcement.speed', 'Speed', 'normal'),
    },
    seo: {
      title: v.text(seo.title, 'seo.title', 'Meta title', { max: 70 }),
      description: v.text(seo.description, 'seo.description', 'Meta description', { max: 170 }),
      socialImage: v.image(seo.socialImage, 'seo.socialImage', 'Social sharing image'),
    },
    sections: normaliseSections(raw.sections, v),
  };

  // Existence checks only for a document whose shape is already valid.
  if (!v.errors.length) await verifyReferences(v);

  if (v.errors.length) {
    throw ApiError.badRequest(v.errors[0].message, { code: 'VALIDATION_ERROR', details: v.errors });
  }
  return content;
}

/** Whether the storefront may mention cash on delivery right now. */
function isCodAvailable() {
  return Boolean(config.store.codEnabled) && Number(config.store.codMaxOrderValue) > 0;
}

/** Replaces every stored image descriptor with its public fields only. */
function withoutStorageIds(value) {
  if (Array.isArray(value)) return value.map(withoutStorageIds);
  if (!value || typeof value !== 'object') return value;
  if (typeof value.url === 'string' && 'publicId' in value) {
    const image = { url: value.url, width: value.width ?? null, height: value.height ?? null, alt: value.alt || '' };
    if (value.framing && typeof value.framing === 'object') {
      image.framing = { x: value.framing.x, y: value.framing.y, zoom: value.framing.zoom };
    }
    return image;
  }
  return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, withoutStorageIds(child)]));
}

/**
 * The shape shoppers receive: published content only, with storage
 * references removed, switched-off sections and items dropped, and
 * cash-on-delivery messages hidden whenever the payments config cannot
 * honour them.
 */
function toPublicContent(content, { codAvailable = isCodAvailable() } = {}) {
  if (!content) return null;
  const clean = withoutStorageIds(content);
  const visible = (item) => item && item.enabled !== false && (item.showWhen !== 'cod' || codAvailable);
  const enabledItems = (items) => (Array.isArray(items) ? items.filter((item) => item && item.enabled !== false) : []);

  return {
    schemaVersion: clean.schemaVersion === 3 ? 3 : 2,
    announcement: {
      enabled: clean.announcement?.enabled !== false,
      items: (clean.announcement?.items || []).filter(visible),
      motion: clean.announcement?.motion === 'still' ? 'still' : 'moving',
      direction: clean.announcement?.direction === 'ltr' ? 'ltr' : 'rtl',
      speed: ['slow', 'fast'].includes(clean.announcement?.speed) ? clean.announcement.speed : 'normal',
    },
    seo: {
      title: clean.seo?.title || '',
      description: clean.seo?.description || '',
      socialImage: clean.seo?.socialImage || null,
    },
    sections: (clean.sections || [])
      .filter((section) => section && section.enabled !== false && SECTION_TYPES.includes(section.type))
      .map((section) => {
        if (section.type === 'hero') return { ...section, slides: enabledItems(section.slides) };
        if (section.type === 'trust') return { ...section, items: (section.items || []).filter(visible) };
        if (section.type === 'categoryRail' || section.type === 'campaign') {
          return { ...section, items: enabledItems(section.items) };
        }
        return section;
      }),
  };
}

/** Every stored image reference anywhere in a content document. */
function collectPublicIds(content, ids = new Set()) {
  if (Array.isArray(content)) {
    content.forEach((item) => collectPublicIds(item, ids));
  } else if (content && typeof content === 'object') {
    if (typeof content.url === 'string' && content.publicId) ids.add(content.publicId);
    Object.values(content).forEach((child) => collectPublicIds(child, ids));
  }
  return ids;
}

module.exports = {
  normaliseContent,
  toPublicContent,
  collectPublicIds,
  isCodAvailable,
  SECTION_LABELS,
};
