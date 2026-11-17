import {
  BookOpen, GalleryHorizontal, LayoutGrid, Megaphone, PanelTop, Quote, Rows3, ShieldCheck,
} from 'lucide-react';
import { CAMPAIGN_TILES, STOREFRONT_LIMITS, heroSlides } from '../../../config/storefront';
import { findShoppableCategory, shoppableCategories } from '../../../utils/categories';

/**
 * How each section type is named and explained in the editor. The store owner
 * is not a developer, so everything here is plain business language; the
 * technical type names stay in code only.
 *
 * - label:       the kind of section, everywhere in the editor
 * - description: one short sentence about what it controls (editor header)
 * - listText:    what the owner can change, on the section's card
 * - addTitle / addText: how it is offered in "What would you like to add?"
 */
export const SECTION_META = {
  hero: {
    label: 'Main Banner',
    description: 'Change the main image and message customers see at the top of your homepage.',
    listText: 'Add different banners for different collections, launches and campaigns.',
    addTitle: 'Main Banner',
    addText: 'The large banner at the top of your homepage.',
    icon: PanelTop,
  },
  categoryRail: {
    label: 'Shop by Category',
    description: 'Choose which categories customers see near the top of the homepage.',
    listText: 'Choose which categories appear here.',
    addTitle: 'Shop by Category',
    addText: 'Show your main shopping categories.',
    icon: LayoutGrid,
  },
  productCollection: {
    label: 'Products',
    description: 'Choose which products appear in this section.',
    listText: 'Choose which products appear here.',
    addTitle: 'Products',
    addText: 'Show products from your store.',
    icon: Rows3,
  },
  productRail: {
    label: 'Featured Products',
    description: 'Choose which products appear in this row.',
    listText: 'Choose which products appear in this row.',
    addTitle: 'Featured Products',
    addText: 'A swipeable row of products, like “Trending now”.',
    icon: GalleryHorizontal,
  },
  editorial: {
    label: 'Story',
    description: 'Add an image and message to tell customers about your collection.',
    listText: 'Update the image and story shown here.',
    addTitle: 'Story',
    addText: 'Tell customers about your brand or collection.',
    icon: BookOpen,
  },
  campaign: {
    label: 'Promotion',
    description: 'Create a promotional banner for a collection, festival or sale.',
    listText: 'Change the promotion banners shown here.',
    addTitle: 'Promotion',
    addText: 'Promote a collection, festival or offer.',
    icon: Megaphone,
  },
  trust: {
    label: 'Why Shop With Us',
    description: 'Show customers your shipping, returns and other benefits.',
    listText: 'Change the benefits shown to customers.',
    addTitle: 'Why Shop With Us',
    addText: 'Show your customer benefits.',
    icon: ShieldCheck,
  },
  brandMessage: {
    label: 'About the Brand',
    description: 'Share a short message about your brand.',
    listText: 'Change your brand message.',
    addTitle: 'About the Brand',
    addText: 'A short statement about who you are.',
    icon: Quote,
  },
};

/** The "every page" settings, named the same plain way. */
export const GLOBAL_META = {
  announcement: {
    label: 'Top Message',
    description: 'These messages move across the top of your website.',
  },
  header: {
    label: 'Menu Bar',
    description: 'Your logo and the menu links at the top of every page.',
  },
  footer: {
    label: 'Footer',
    description: 'The links, contact details and business details at the bottom of every page.',
  },
  seo: {
    label: 'Website & Social Sharing',
    description: 'How your homepage appears on Google and when it is shared.',
  },
};

/** Plain-language choices for where a product section's products come from. */
export const PRODUCT_SOURCE_CHOICES = [
  ['newArrivals', 'New arrivals', 'Show your latest products.'],
  ['onSale', 'Sale products', 'Show products currently on sale.'],
  ['featured', 'Featured products', 'Show products you have marked as featured.'],
  ['popular', 'Popular products', 'Show your most popular products.'],
  ['newest', 'Newest products', 'Show the most recently added products.'],
  ['category', 'Choose a category', 'Show products from one category.'],
  ['manual', 'Choose products yourself', 'Pick the exact products to display.'],
];

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;
const categoryById = (categories, id) => categories.find((category) => String(category._id) === String(id));

/** The categories a Shop by Category section shows, with names and pictures. */
export function categoryRailEntries(section, categories = []) {
  if (section.source !== 'manual') {
    return shoppableCategories(categories).map((c) => ({ key: c._id, name: c.name, url: c.image?.url || '', enabled: true }));
  }
  return (section.items || []).map((item, index) => {
    const category = categoryById(categories, item.categoryId);
    return {
      key: `${item.categoryId}-${index}`,
      name: item.title || category?.name || 'Category',
      url: item.image?.url || category?.image?.url || '',
      enabled: item.enabled !== false,
    };
  });
}

/**
 * The categories the automatic rail shows today, as an explicit list. Titles,
 * images and links stay empty so each one keeps using the category's own
 * name, picture and page — the homepage looks exactly the same.
 */
export function categoriesAsItems(categories = []) {
  return shoppableCategories(categories)
    .slice(0, STOREFRONT_LIMITS.categoryItems)
    .map((category) => ({ enabled: true, categoryId: String(category._id), title: '', subtitle: '', image: null, link: '' }));
}

/** The automatic promotion tiles the homepage shows today. */
export function automaticCampaignTiles(categories = []) {
  const seen = new Set();
  return CAMPAIGN_TILES.map((tile) => ({ tile, category: findShoppableCategory(categories, tile.categorySlugs) }))
    .filter(({ category }) => category && !seen.has(category._id) && seen.add(category._id))
    .map(({ tile, category }) => ({ title: tile.title, tone: tile.tone, url: category.image?.url || '' }));
}

/** The words that name one banner: its heading, or its image description. */
export function heroSlideTitle(slide) {
  if (!slide) return 'No banner yet';
  if (slide.mode === 'banner') {
    return slide.banner?.alt || (slide.banner?.desktopImage?.url ? 'Full Banner' : 'Full Banner · no image yet');
  }
  return [slide.structured?.heading, slide.structured?.accentText].filter(Boolean).join(' ') || 'No heading yet';
}

/**
 * A promotion's name and layout, like “Festive edit (Full Image)”. Full Image
 * artwork often carries its words in the picture, so its description stands in.
 */
function promotionName(item) {
  if (item.layout === 'fullImage') {
    const name = item.title || item.desktopImage?.alt;
    return name ? `${name} (Full Image)` : '';
  }
  return item.title ? `${item.title} (Split Layout)` : '';
}

/** The name on a section's card: its own title when it has one, like “New arrivals”. */
export function sectionTitle(section) {
  const own = {
    productCollection: section.title,
    productRail: section.title,
    editorial: section.heading,
    campaign: section.title,
    brandMessage: section.title,
  }[section.type];
  return (typeof own === 'string' && own.trim()) || SECTION_META[section.type]?.label || 'Section';
}

/** The section's current words, so the card reads like the homepage. */
export function sectionSummary(section, { categories = [] } = {}) {
  switch (section.type) {
    case 'hero': {
      const slides = heroSlides(section);
      const shown = slides.filter((slide) => slide.enabled !== false);
      if (slides.length < 2) return heroSlideTitle(slides[0]);
      const hidden = slides.length - shown.length;
      const timing = shown.length < 2
        ? 'Nothing changes automatically'
        : section.autoplay !== false
          ? `Auto changes every ${section.interval || 4} sec`
          : 'Customers change banners themselves';
      return `${plural(shown.length, 'banner', 'banners')}${hidden ? ` (${hidden} hidden)` : ''} · ${timing}`;
    }
    case 'categoryRail': {
      const names = categoryRailEntries(section, categories).filter((entry) => entry.enabled).map((entry) => entry.name);
      return names.length ? names.join(' | ') : 'No categories yet';
    }
    case 'productCollection':
    case 'productRail': {
      const choice = PRODUCT_SOURCE_CHOICES.find(([key]) => key === section.source);
      if (section.source === 'category') return `Showing: ${categoryById(categories, section.categoryId)?.name || 'no category chosen yet'}`;
      if (section.source === 'manual') return `Showing: ${plural((section.productIds || []).length, 'product you chose', 'products you chose')}`;
      return `Showing: ${choice ? choice[1] : 'Products'}`;
    }
    case 'editorial':
      return section.description || section.eyebrow || 'Story';
    case 'campaign':
      if (section.source === 'custom') {
        const titles = (section.items || []).filter((item) => item.enabled !== false).map(promotionName).filter(Boolean);
        return titles.length ? titles.join(' | ') : 'No promotions yet';
      }
      return automaticCampaignTiles(categories).map((tile) => tile.title).join(' | ') || 'Chosen automatically from your categories';
    case 'trust':
      return (section.items || []).filter((item) => item.enabled !== false).map((item) => item.title).join(' | ') || 'No benefits yet';
    case 'brandMessage':
      return section.description || 'No message yet';
    default:
      return '';
  }
}
