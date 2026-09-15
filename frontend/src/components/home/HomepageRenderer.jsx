import { useMemo } from 'react';
import CategoryRail from './CategoryRail';
import EditorialStory from './EditorialStory';
import CampaignTiles from './CampaignTiles';
import TrustStrip from './TrustStrip';
import BrandMessage from './BrandMessage';
import SectionBoundary from './SectionBoundary';
import HeroCarousel from './HeroCarousel';
import { ProductCollectionSection, ProductRailSection } from './ProductSections';
import { Button, EmptyState } from '../ui';
import { useSectionProducts } from '../../hooks/useSectionProducts';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { shoppableCategories } from '../../utils/categories';
import {
  PRODUCT_SECTION_TYPES, STORY, defaultStorefrontContent, sourceShopLink,
} from '../../config/storefront';

/**
 * Renders the homepage from its sections, in their published order.
 *
 * The content controls which sections appear, in what order, and what they
 * say; every section is drawn by the site's own components, so layout, type,
 * spacing and breakpoints stay the design system's. Each section renders
 * inside its own boundary — one malformed section drops out on its own and
 * the rest of the page carries on.
 *
 * Phones are product-first: the Story is not shown there at all, and other
 * large blocks never come before the first products (see `phoneSectionOrder`).
 * From 768px every section shows, in the published order.
 *
 * Products for every product section arrive in one request, resolved by the
 * API from each section's source.
 */

const PHONE_QUERY = '(max-width: 767px)';

/** Section types not shown on phones. */
export const PHONE_HIDDEN_TYPES = ['editorial'];

/** Section types that, on phones, wait until after the first product section. */
export const PHONE_DEFERRED_TYPES = ['campaign', 'brandMessage'];

const isProductSection = (section) => PRODUCT_SECTION_TYPES.includes(section.type);
const waitsForProductsOnPhones = (section) => PHONE_DEFERRED_TYPES.includes(section.type);

/**
 * The phone reading order. Hidden types are left out; deferred sections placed
 * above the first product section move to directly after it, keeping their own
 * order; every other section — hero and category rail included — keeps its
 * place. Sections are moved, never copied, so the rendered DOM and tab order
 * follow this order.
 */
export function phoneSectionOrder(allSections) {
  const sections = allSections.filter((section) => !PHONE_HIDDEN_TYPES.includes(section.type));
  const firstProduct = sections.findIndex(isProductSection);
  if (firstProduct <= 0) return sections;

  const above = sections.slice(0, firstProduct);
  const deferred = above.filter(waitsForProductsOnPhones);
  if (deferred.length === 0) return sections;

  return [
    ...above.filter((section) => !waitsForProductsOnPhones(section)),
    sections[firstProduct],
    ...deferred,
    ...sections.slice(firstProduct + 1),
  ];
}

function categoryRailItems(section, categories) {
  if (section.source !== 'manual') {
    return shoppableCategories(categories).map((category) => ({
      key: category._id,
      title: category.name,
      subtitle: '',
      href: `/shop?category=${category.slug}`,
      imageUrl: category.image?.url || '',
    }));
  }

  // Only categories the store still offers publicly; a deleted or hidden one drops out.
  const byId = new Map(categories.map((category) => [String(category._id), category]));
  return (section.items || [])
    .filter((item) => item && item.enabled !== false)
    .map((item, index) => {
      const category = byId.get(String(item.categoryId));
      if (!category || category.isActive === false) return null;
      return {
        key: `${item.categoryId}-${index}`,
        title: item.title || category.name,
        subtitle: item.subtitle || '',
        href: item.link || `/shop?category=${category.slug}`,
        imageUrl: item.image?.url || category.image?.url || '',
      };
    })
    .filter(Boolean);
}

export default function HomepageRenderer({ content, loading = false, categories = [], categoriesLoaded = false, payments = null }) {
  const phone = useMediaQuery(PHONE_QUERY);
  const sections = useMemo(() => {
    const enabled = (content.sections || []).filter((section) => section && section.enabled !== false);
    return phone ? phoneSectionOrder(enabled) : enabled;
  }, [content.sections, phone]);
  // In rendered order: the first of these is the priority section, and shown-product dedupe runs top to bottom.
  const productSections = useMemo(() => sections.filter(isProductSection), [sections]);
  const fallbackHero = useMemo(() => defaultStorefrontContent({ payments }).sections[0].structured, [payments]);

  const products = useSectionProducts(productSections, { enabled: !loading });
  const productsLoading = loading || products.loading;
  const firstProductSectionId = productSections[0]?.id;

  const catalogueEmpty =
    !productsLoading &&
    !products.error &&
    productSections.length > 0 &&
    productSections.every((section) => !products.data?.[section.id]?.products?.length);

  // The built-in story leads to featured pieces when there are any.
  const featuredCount = productSections
    .filter((section) => section.source === 'featured')
    .reduce((sum, section) => sum + (products.data?.[section.id]?.products?.length || 0), 0);

  const hasHero = sections.some((section) => section.type === 'hero');
  const shown = new Set();
  let emptyStateShown = false;

  const renderSection = (section) => {
    switch (section.type) {
      case 'hero':
        return (
          <HeroCarousel
            section={section}
            fromCms={content.fromCms}
            categories={categories}
            loading={loading}
            fallbackHero={fallbackHero}
          />
        );

      case 'categoryRail':
        return (
          <CategoryRail
            items={categoryRailItems(section, categories)}
            loaded={categoriesLoaded}
            title={section.title}
            subtitle={section.subtitle}
            sectionId={section.id}
          />
        );

      case 'productRail':
      case 'productCollection': {
        if (catalogueEmpty) {
          if (emptyStateShown) return null;
          emptyStateShown = true;
          return (
            <div className="shell">
              <EmptyState
                title="Nothing here yet"
                description="The collection is being prepared. Please check back shortly."
                action={<Button to="/contact" variant="secondary">Get in touch</Button>}
              />
            </div>
          );
        }

        const priority = section.id === firstProductSectionId;
        // Curated rails further down appear once their products are known,
        // so nothing below the fold is pushed around.
        if (!priority && section.type === 'productRail' && productsLoading) return null;
        if (!priority && products.error) return null;

        const result = products.data?.[section.id];
        let list = result?.products || [];
        if (section.skipShownProducts) {
          const fresh = list.filter((product) => !shown.has(product._id));
          list = fresh.length >= Math.min(4, section.limit) ? fresh : list;
        }
        list = list.slice(0, section.limit);
        list.forEach((product) => shown.add(product._id));

        const props = {
          section,
          products: list,
          total: result?.total,
          loading: productsLoading,
          error: priority ? products.error : null,
          priority,
          viewAllHref: section.viewAllLink || sourceShopLink(result?.source || section.source, result?.categorySlug),
        };
        return section.type === 'productRail'
          ? <ProductRailSection {...props} />
          : <ProductCollectionSection {...props} />;
      }

      case 'editorial':
        return (
          <EditorialStory
            story={section}
            // The built-in story leads to featured pieces — also after the
            // homepage is first saved, until its button is changed.
            to={section.id === 'default-story' && (!content.fromCms || (section.buttonText === STORY.cta && section.buttonLink === '/shop'))
              ? (featuredCount > 0 ? '/shop?featured=true' : '/shop')
              : undefined}
            loading={loading}
          />
        );

      case 'campaign':
        return loading ? null : <CampaignTiles campaign={section} categories={categories} />;

      case 'trust':
        return loading ? null : <TrustStrip trust={section} payments={payments} />;

      case 'brandMessage':
        return <BrandMessage section={section} />;

      default:
        return null;
    }
  };

  return (
    <>
      {!hasHero && <h1 className="sr-only">TOUCHH — ethnic wear for every moment</h1>}
      {sections.map((section) => {
        const node = renderSection(section);
        return node ? (
          <SectionBoundary
            key={section.id}
            name={section.type}
            fallback={section.type === 'hero' ? <h1 className="sr-only">TOUCHH — ethnic wear for every moment</h1> : null}
          >
            {node}
          </SectionBoundary>
        ) : null;
      })}
    </>
  );
}
