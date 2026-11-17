import { FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS } from './store';
import {
  BRAND_NAME, BUSINESS_ADDRESS, BUSINESS_LOCALITY, CONTACT, INSTAGRAM, LEGAL,
} from './business';
import { formatPrice } from '../utils/format';

/**
 * Storefront content: built-in homepage and section definitions.
 *
 * The live homepage is managed in Admin → Storefront → Homepage and served by
 * `GET /api/storefront` as an ordered list of sections. Everything here is:
 *
 *  - the built-in homepage — today's design, expressed as sections — used
 *    whenever published content is missing, incomplete or unavailable, and
 *    the starting point for the builder before anything has been published;
 *  - the shape of each section type, shared by the renderer and the builder.
 *
 * Two rules apply to every default: no claim appears unless configuration or
 * data backs it, and nothing names a category the store may not have.
 */

export const HERO = {
  eyebrow: 'New season',
  titleLead: 'Timeless ethnic',
  titleAccent: 'elegance',
  body: 'Soft fabrics. Intricate details. Styles made for your most beautiful moments.',
  primary: { label: 'Explore collection', shortLabel: 'Explore', to: '/shop' },
  note: { lead: 'Tradition in', accent: 'every detail' },
  /** Where "Explore" leads, in order of preference. Falls back to /shop. */
  exploreCategorySlugs: ['kurta-sets', 'ethnic-wear', 'salwar-suits', 'festive-wear'],
};

/**
 * Whether cash on delivery can actually be used. A ceiling of zero or less
 * refuses every order, so it counts as unavailable; no ceiling means none.
 */
export function codAvailable(payments) {
  if (!payments?.cod?.enabled) return false;
  const raw = payments.cod.maxOrderValue;
  if (raw === null || raw === undefined || raw === '') return true;
  const cap = Number(raw);
  return !Number.isFinite(cap) || cap > 0;
}

/**
 * Alt text for the bundled editorial photographs in `touch-assets/`.
 * Uploaded images carry their own description from the admin panel.
 */
export const EDITORIAL_ALT = {
  'hero-portrait': 'Model in an ivory kurta with pastel floral embroidery, a sequinned dupatta draped over her hair',
  'hero-full-length': 'Full-length ivory embroidered kurta and palazzo set with a sequinned dupatta',
  'hero-detail': 'Close-up of pastel floral and sequin embroidery on an ivory kurta',
  story: 'Ivory embroidered kurta and palazzo set with a sequinned dupatta, in a courtyard with a carved jali screen',
};

export const STORY = {
  eyebrow: 'The edit',
  title: 'Style your story',
  body: 'Timeless ethnic wear for the modern you.',
  cta: 'Explore the edit',
  shortCta: 'Explore',
};

/** Automatic campaign tiles: rendered only when one of `categorySlugs` is a shoppable category. */
export const CAMPAIGN_TILES = [
  {
    key: 'festive',
    title: 'Festive edit',
    subtitle: 'For every celebration',
    cta: 'Shop festive',
    tone: 'maroon',
    categorySlugs: ['festive-wear', 'festive', 'festive-edit'],
  },
  {
    key: 'everyday',
    title: 'Everyday ethnic',
    subtitle: 'Easy pieces for every day',
    cta: 'Shop everyday',
    tone: 'olive',
    categorySlugs: ['everyday-ethnic', 'kurta-sets', 'kurtas', 'ethnic-wear'],
  },
];

/**
 * Service facts shown in the announcement bar and the trust row by default.
 * Cash on delivery is only mentioned when the payments config switches it on.
 */
export function serviceFacts(payments) {
  const facts = [
    {
      key: 'shipping',
      short: `Free shipping over ${formatPrice(FREE_SHIPPING_THRESHOLD)}`,
      title: 'Free shipping',
      detail: `On orders over ${formatPrice(FREE_SHIPPING_THRESHOLD)}`,
    },
    {
      key: 'returns',
      short: `${RETURN_WINDOW_DAYS}-day returns`,
      title: `${RETURN_WINDOW_DAYS}-day returns`,
      detail: 'See our returns policy',
      to: '/shipping-returns',
    },
  ];

  if (codAvailable(payments)) {
    const cap = Number(payments.cod.maxOrderValue);
    facts.push({
      key: 'cod',
      short: 'Cash on delivery',
      title: 'Cash on delivery',
      detail: cap > 0 ? `On orders up to ${formatPrice(cap)}` : 'Pay when your order arrives',
    });
  }

  facts.push({
    key: 'secure',
    short: 'Secure checkout',
    title: 'Secure checkout',
    detail: 'Encrypted connection',
  });

  return facts;
}

/* ══════════════════════ Header and footer ════════════════════════════════ */

/**
 * The built-in navigation bar, as editable content.
 *
 * `links` are the owner's own menu links; the shop's categories follow them
 * automatically while `showCategories` is on, and `sale` is the highlighted
 * link that always sits at the end of the row. This is exactly what the
 * header shows today, so a store that never opens the editor is unchanged.
 */
export function defaultHeader() {
  return {
    logo: null,
    links: [
      { enabled: true, label: 'Shop all', link: '/shop' },
      { enabled: true, label: 'New arrivals', link: '/shop?newArrival=true' },
    ],
    showCategories: true,
    sale: { enabled: true, label: 'Sale', link: '/shop?onSale=true' },
  };
}

/** The built-in footer, as editable content — today's wording and details. */
export function defaultFooter() {
  return {
    tagline: 'Timeless Indian ethnic wear, thoughtfully made for every occasion.',
    newsletter: {
      enabled: true,
      title: 'Be first to know',
      description: 'New arrivals, restocks and studio notes. No more than twice a month.',
    },
    shop: {
      title: 'Shop',
      showCategories: true,
      links: [
        { enabled: true, label: 'All products', link: '/shop' },
        { enabled: true, label: 'New arrivals', link: '/shop?newArrival=true' },
      ],
    },
    help: {
      title: 'Help',
      links: [
        { enabled: true, label: 'Track your order', link: '/orders' },
        { enabled: true, label: 'Shipping & returns', link: '/shipping-returns' },
        { enabled: true, label: 'Contact us', link: '/contact' },
        { enabled: true, label: `About ${BRAND_NAME}`, link: '/about' },
      ],
    },
    contact: {
      title: 'Get in touch',
      phone: CONTACT.phoneDisplay,
      email: CONTACT.email,
      location: BUSINESS_LOCALITY,
    },
    social: {
      title: `Follow ${BRAND_NAME}`,
      instagram: INSTAGRAM.url,
      handle: INSTAGRAM.handle,
      note: 'Follow us on Instagram',
    },
    legal: {
      title: 'Legal & business details',
      legalName: LEGAL.legalName,
      tradeName: LEGAL.tradeName,
      gstin: LEGAL.gstin,
      address: BUSINESS_ADDRESS.join('\n'),
    },
    bottom: {
      copyright: `${BRAND_NAME}. All rights reserved.`,
      links: [
        { enabled: true, label: 'Privacy', link: '/privacy' },
        { enabled: true, label: 'Terms', link: '/terms' },
      ],
    },
  };
}

/** A phone number as a `tel:` address — digits and a leading `+` only. */
export function telHref(phone) {
  const cleaned = String(phone || '').replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  return cleaned ? `tel:${cleaned}` : '';
}

/* ══════════════════════ Section definitions ══════════════════════════════ */

/** Kept in step with `StorefrontContent.OPTIONS` on the API. */
export const STOREFRONT_ICON_KEYS = ['truck', 'returns', 'cod', 'secure', 'package', 'gift', 'sparkles', 'phone', 'heart'];
export const CAMPAIGN_TONES = ['maroon', 'olive', 'umber'];
/** Promotion choices. A promotion saved before layouts existed is a Split Layout. */
export const PROMOTION_LAYOUTS = ['split', 'fullImage'];
export const PROMOTION_TEXT_POSITIONS = ['left', 'center', 'right'];
export const PROMOTION_OVERLAYS = ['light', 'medium', 'dark'];
export const PROMOTION_IMAGE_FITS = ['contain', 'cover'];
export const STOREFRONT_LIMITS = Object.freeze({
  sections: 24,
  announcement: 6,
  trust: 6,
  campaignItems: 6,
  categoryItems: 16,
  productIds: 24,
  productLimit: 24,
  heroSlides: 4,
  headerLinks: 6,
  footerLinks: 8,
  footerBottomLinks: 4,
});

/** Seconds each Main Banner stays before the next one. */
export const HERO_INTERVALS = [3, 4, 5];

export const SECTION_TYPES = [
  'hero',
  'categoryRail',
  'productCollection',
  'productRail',
  'editorial',
  'campaign',
  'trust',
  'brandMessage',
];

export const PRODUCT_SECTION_TYPES = ['productCollection', 'productRail'];

export const PRODUCT_SOURCES = {
  newArrivals: { label: 'New arrivals', shopLink: '/shop?newArrival=true' },
  onSale: { label: 'On sale', shopLink: '/shop?onSale=true' },
  featured: { label: 'Featured', shopLink: '/shop?featured=true' },
  popular: { label: 'Popular', shopLink: '/shop?sort=popular' },
  newest: { label: 'Newest', shopLink: '/shop' },
  category: { label: 'A category', shopLink: '/shop' },
  manual: { label: 'Hand-picked products', shopLink: '' },
};

/** Where "View all" leads when the admin has not set a link. */
export function sourceShopLink(source, categorySlug) {
  if (source === 'category') return categorySlug ? `/shop?category=${categorySlug}` : '/shop';
  return PRODUCT_SOURCES[source]?.shopLink ?? '/shop';
}

let idCounter = 0;

/** A section id the API accepts: letters, digits, `_` and `-`, 4–40 characters. */
export function newSectionId(type = 'section') {
  idCounter += 1;
  const random = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10)
    : `${Date.now().toString(36)}${idCounter}`;
  return `${String(type).slice(0, 12)}_${random}`;
}

const productDefaults = () => ({
  title: '',
  subtitle: '',
  source: 'newArrivals',
  categoryId: null,
  productIds: [],
  limit: 8,
  minItems: 1,
  fallbackToNewest: false,
  viewAllText: 'View all',
  viewAllLink: '',
});

/** The empty fields of each section type. */
const SECTION_FIELDS = {
  hero: () => ({
    slides: [],
    autoplay: true,
    interval: 4,
    mode: 'structured',
    banner: emptyBanner(),
    structured: {
      image: null,
      mobileImage: null,
      detailImage: null,
      eyebrow: HERO.eyebrow,
      heading: HERO.titleLead,
      accentText: HERO.titleAccent,
      description: HERO.body,
      primaryButtonText: HERO.primary.label,
      primaryButtonLink: HERO.primary.to,
      detailCaption: BUILT_IN_HERO_NOTE,
    },
  }),
  categoryRail: () => ({ title: '', subtitle: '', source: 'auto', items: [] }),
  productCollection: () => ({
    ...productDefaults(),
    layout: 'grid',
    desktopColumns: 4,
    mobileLayout: 'grid',
    showCount: false,
    skipShownProducts: false,
  }),
  productRail: productDefaults,
  editorial: () => ({
    display: 'split',
    textPosition: 'left',
    overlay: 'medium',
    image: null,
    mobileImage: null,
    eyebrow: '',
    heading: '',
    description: '',
    buttonText: '',
    buttonLink: '',
    layout: 'imageRight',
    theme: 'umber',
    shade: 100,
  }),
  campaign: () => ({ title: '', source: 'custom', items: [] }),
  trust: () => ({ items: [] }),
  brandMessage: () => ({
    eyebrow: '',
    title: '',
    description: '',
    buttonText: '',
    link: '',
    alignment: 'center',
    theme: 'plain',
  }),
};

/** A new section of `type`, ready for the builder. */
export function createSection(type, overrides = {}) {
  return { id: newSectionId(type), type, enabled: true, ...SECTION_FIELDS[type](), ...overrides };
}

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/**
 * A stored section laid over its type's empty fields, so older or partial
 * data still renders. Unknown types return `null` and are skipped.
 */
export function normalizeSection(raw) {
  if (!isObject(raw) || !SECTION_TYPES.includes(raw.type)) return null;
  const base = SECTION_FIELDS[raw.type]();
  const section = {
    ...base,
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : newSectionId(raw.type),
    enabled: raw.enabled !== false,
  };
  if (raw.type === 'hero') {
    section.banner = { ...base.banner, ...(isObject(raw.banner) ? raw.banner : {}) };
    section.structured = { ...base.structured, ...(isObject(raw.structured) ? raw.structured : {}) };
    section.slides = Array.isArray(raw.slides)
      ? raw.slides.filter(isObject).slice(0, STOREFRONT_LIMITS.heroSlides).map(normalizeHeroSlide)
      : [];
    section.autoplay = raw.autoplay !== false;
    section.interval = HERO_INTERVALS.includes(Number(raw.interval)) ? Number(raw.interval) : 4;
  }
  if ('items' in base) section.items = Array.isArray(raw.items) ? raw.items.filter(isObject) : [];
  if (raw.type === 'campaign') section.items = section.items.map(normalizePromotionItem);
  if ('productIds' in base) section.productIds = Array.isArray(raw.productIds) ? raw.productIds : [];
  return section;
}

const oneOf = (value, options, fallback) => (options.includes(value) ? value : fallback);

/** One stored promotion with every choice filled in. Nothing already stored is dropped. */
function normalizePromotionItem(raw) {
  return {
    ...raw,
    layout: oneOf(raw.layout, PROMOTION_LAYOUTS, 'split'),
    textPosition: oneOf(raw.textPosition, PROMOTION_TEXT_POSITIONS, 'left'),
    overlay: oneOf(raw.overlay, PROMOTION_OVERLAYS, 'medium'),
    imageFit: oneOf(raw.imageFit, PROMOTION_IMAGE_FITS, 'contain'),
  };
}

function emptyBanner() {
  return {
    desktopImage: null,
    mobileImage: null,
    alt: '',
    link: '',
    // Optional words laid over the image.
    eyebrow: '',
    heading: '',
    accentText: '',
    description: '',
    buttonText: '',
    buttonLink: '',
    textPosition: 'left',
    overlay: 'medium',
  };
}

function emptyStructuredHero() {
  return {
    image: null,
    mobileImage: null,
    detailImage: null,
    eyebrow: '',
    heading: '',
    accentText: '',
    description: '',
    primaryButtonText: '',
    primaryButtonLink: '',
    detailCaption: '',
    size: 'compact',
    shade: 90,
  };
}

/** One stored Main Banner, laid over empty fields. */
function normalizeHeroSlide(raw, index) {
  return {
    ...raw,
    id: typeof raw.id === 'string' && raw.id ? raw.id : `slide-${index + 1}`,
    enabled: raw.enabled !== false,
    mode: raw.mode === 'banner' ? 'banner' : 'structured',
    banner: { ...emptyBanner(), ...(isObject(raw.banner) ? raw.banner : {}) },
    structured: { ...emptyStructuredHero(), ...(isObject(raw.structured) ? raw.structured : {}) },
  };
}

/**
 * The banners of a Main Banner section, in order, including hidden ones. A
 * hero saved before banners existed is one banner made from its single-banner
 * fields.
 */
export function heroSlides(section) {
  if (Array.isArray(section?.slides) && section.slides.length > 0) return section.slides;
  return [{
    id: 'slide-1',
    enabled: true,
    mode: section?.mode === 'banner' ? 'banner' : 'structured',
    banner: { ...emptyBanner(), ...(isObject(section?.banner) ? section.banner : {}) },
    structured: { ...emptyStructuredHero(), ...(isObject(section?.structured) ? section.structured : {}) },
  }];
}

/** A new, empty banner for the Main Banner. */
export function createHeroSlide(overrides = {}) {
  return {
    id: newSectionId('slide'),
    enabled: true,
    mode: 'banner',
    banner: emptyBanner(),
    structured: emptyStructuredHero(),
    ...overrides,
  };
}

const FACT_ICON = { shipping: 'truck', returns: 'returns', cod: 'cod', secure: 'secure' };

/** The built-in hero's closing note, as stored in content. */
export const BUILT_IN_HERO_NOTE = `${HERO.note.lead} ${HERO.note.accent}`;

/**
 * The built-in homepage — today's design as sections. Images are `null`: the
 * bundled editorial photographs fill those slots. Cash on delivery is listed
 * but marked `showWhen: 'cod'`, so it renders only while it can be honoured.
 */
export function defaultStorefrontContent({ payments } = {}) {
  const facts = serviceFacts({ cod: { enabled: true, maxOrderValue: payments?.cod?.maxOrderValue } });
  const byKey = Object.fromEntries(facts.map((fact) => [fact.key, fact]));
  const showWhen = (key) => (key === 'cod' ? 'cod' : 'always');
  const rail = (id, overrides) => ({ id, type: 'productRail', enabled: true, ...productDefaults(), ...overrides });

  const hero = { id: 'default-hero', type: 'hero', enabled: true, ...SECTION_FIELDS.hero() };
  hero.structured.primaryButtonShortText = HERO.primary.shortLabel;

  return {
    schemaVersion: STOREFRONT_SCHEMA_VERSION,
    header: defaultHeader(),
    footer: defaultFooter(),
    // Phones show the first two messages, so cash on delivery comes second.
    announcement: {
      enabled: true,
      motion: 'moving',
      direction: 'rtl',
      speed: 'normal',
      items: ['shipping', 'cod', 'returns', 'secure']
        .filter((key) => byKey[key])
        .map((key) => ({ text: byKey[key].short, icon: FACT_ICON[key], showWhen: showWhen(key) })),
    },
    seo: {
      title: 'Ethnic wear for every moment',
      description: 'Shop TOUCHH — timeless Indian ethnic wear, thoughtfully made for every occasion.',
      socialImage: null,
    },
    sections: [
      hero,
      { id: 'default-categories', type: 'categoryRail', enabled: true, ...SECTION_FIELDS.categoryRail() },
      rail('default-new-arrivals', {
        title: 'New arrivals',
        subtitle: 'Fresh pieces, just in',
        source: 'newArrivals',
        fallbackToNewest: true,
      }),
      {
        id: 'default-story',
        type: 'editorial',
        enabled: true,
        ...SECTION_FIELDS.editorial(),
        eyebrow: STORY.eyebrow,
        heading: STORY.title,
        description: STORY.body,
        buttonText: STORY.cta,
        buttonShortText: STORY.shortCta,
        buttonLink: '/shop',
      },
      {
        id: 'default-collection',
        type: 'productCollection',
        enabled: true,
        ...SECTION_FIELDS.productCollection(),
        title: 'The collection',
        source: 'newest',
        viewAllText: 'Shop all',
        viewAllLink: '/shop',
        showCount: true,
        skipShownProducts: true,
      },
      { id: 'default-campaigns', type: 'campaign', enabled: true, title: '', source: 'categories', items: [] },
      rail('default-on-sale', {
        title: 'On sale',
        subtitle: 'Selected pieces, now reduced',
        source: 'onSale',
        minItems: 4,
        viewAllLink: '/shop?onSale=true',
      }),
      rail('default-featured', {
        title: 'Featured pieces',
        subtitle: 'Pieces we love right now',
        source: 'featured',
        minItems: 4,
        viewAllLink: '/shop?featured=true',
      }),
      rail('default-best-sellers', {
        title: 'Best sellers',
        subtitle: 'Our most-ordered pieces',
        source: 'popular',
        minItems: 4,
        viewAllLink: '/shop?sort=popular',
      }),
      {
        id: 'default-trust',
        type: 'trust',
        enabled: true,
        items: facts.map((fact) => ({
          enabled: true,
          icon: FACT_ICON[fact.key],
          title: fact.title,
          description: fact.detail,
          link: fact.to || '',
          showWhen: showWhen(fact.key),
        })),
      },
    ],
  };
}

/** Content saved from this version on keeps its section list exactly as saved. */
export const STOREFRONT_SCHEMA_VERSION = 3;

/**
 * Content saved before version 3 can predate Shop by Category. It gets the
 * category circles back directly under the hero (or first, with no hero), so
 * an older draft or published homepage never silently loses them. From
 * version 3 on, removing the section is respected.
 */
export function withCategoryRail(sections, schemaVersion) {
  if (Number(schemaVersion) >= STOREFRONT_SCHEMA_VERSION) return sections;
  if (sections.some((section) => section.type === 'categoryRail')) return sections;
  const taken = new Set(sections.map((section) => section.id));
  const rail = {
    id: taken.has('default-categories') ? newSectionId('categoryRail') : 'default-categories',
    type: 'categoryRail',
    enabled: true,
    ...SECTION_FIELDS.categoryRail(),
  };
  const next = [...sections];
  next.splice(sections.findIndex((section) => section.type === 'hero') + 1, 0, rail);
  return next;
}

const over = (defaults, value) => ({ ...defaults, ...(isObject(value) ? value : {}) });

/**
 * Published header or footer content over the built-in one, so a document
 * saved before either existed — or one missing a group of fields — still
 * renders completely. A group the owner has actually saved is used as saved:
 * a field they cleared stays cleared rather than springing back.
 */
export function resolveHeader(raw) {
  const defaults = defaultHeader();
  return {
    ...over(defaults, raw),
    links: Array.isArray(raw?.links) ? raw.links.filter(isObject) : defaults.links,
    sale: over(defaults.sale, raw?.sale),
  };
}

export function resolveFooter(raw) {
  const defaults = defaultFooter();
  const column = (key) => {
    const saved = isObject(raw?.[key]) ? raw[key] : null;
    return {
      ...over(defaults[key], saved),
      links: Array.isArray(saved?.links) ? saved.links.filter(isObject) : defaults[key].links,
    };
  };
  return {
    tagline: typeof raw?.tagline === 'string' ? raw.tagline : defaults.tagline,
    newsletter: over(defaults.newsletter, raw?.newsletter),
    shop: column('shop'),
    help: column('help'),
    contact: over(defaults.contact, raw?.contact),
    social: over(defaults.social, raw?.social),
    legal: over(defaults.legal, raw?.legal),
    bottom: column('bottom'),
  };
}

/**
 * Published content, normalised over the built-in defaults so a missing or
 * incomplete document still renders a complete homepage. `fromCms` tells
 * components whether the admin has published anything.
 */
export function resolveStorefront(published, { payments } = {}) {
  const defaults = defaultStorefrontContent({ payments });
  if (!isObject(published) || !Array.isArray(published.sections)) return { ...defaults, fromCms: false };

  const announcement = { ...defaults.announcement, ...(isObject(published.announcement) ? published.announcement : {}) };
  announcement.items = Array.isArray(published.announcement?.items)
    ? published.announcement.items
    : defaults.announcement.items;

  const seo = { ...defaults.seo, ...(isObject(published.seo) ? published.seo : {}) };
  seo.title = seo.title || defaults.seo.title;
  seo.description = seo.description || defaults.seo.description;

  const sections = withCategoryRail(published.sections.map(normalizeSection).filter(Boolean), published.schemaVersion);
  sections.forEach((section) => {
    // The API requires a heading for a structured hero; this guards older data.
    if (section.type === 'hero' && !section.structured.heading) {
      section.structured.heading = defaults.sections[0].structured.heading;
    }
    // Short phone labels are part of the built-in copy, not stored content.
    // While a button still says the built-in words, it keeps the built-in
    // short label, so saving the homepage unchanged looks exactly the same.
    if (section.type === 'hero' && !section.structured.primaryButtonShortText
      && section.structured.primaryButtonText === HERO.primary.label) {
      section.structured.primaryButtonShortText = HERO.primary.shortLabel;
    }
    if (section.type === 'editorial' && !section.buttonShortText && section.buttonText === STORY.cta) {
      section.buttonShortText = STORY.shortCta;
    }
    if (section.type === 'hero') {
      section.slides.forEach((slide) => {
        if (!slide.structured.primaryButtonShortText && slide.structured.primaryButtonText === HERO.primary.label) {
          slide.structured.primaryButtonShortText = HERO.primary.shortLabel;
        }
      });
    }
  });

  return {
    schemaVersion: STOREFRONT_SCHEMA_VERSION,
    announcement,
    header: resolveHeader(published.header),
    footer: resolveFooter(published.footer),
    seo,
    sections,
    fromCms: true,
  };
}

/** Switched-on items that may be shown now; COD-only ones need COD available. */
export function visibleItems(items, payments) {
  const cod = codAvailable(payments);
  return (Array.isArray(items) ? items : []).filter(
    (item) => item && item.enabled !== false && (item.showWhen !== 'cod' || cod)
  );
}
