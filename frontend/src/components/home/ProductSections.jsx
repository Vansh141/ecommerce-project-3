import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ProductGrid, ProductRail } from '../product/ProductCard';
import { Alert, Button, SectionHeading } from '../ui';
import { contentLinkProps } from '../../utils/links';

/**
 * Homepage product sections. Both reuse the catalogue's own ProductCard, grid
 * and rail, so every product looks and behaves exactly as it does in the shop.
 */

function ViewAll({ href, children }) {
  const props = contentLinkProps(href);
  if (!props || !children) return null;
  const content = (
    <>
      {children}
      <ArrowRight size={14} aria-hidden="true" />
    </>
  );
  return props.to ? (
    <Link to={props.to} className="link-arrow">{content}</Link>
  ) : (
    <a {...props} className="link-arrow">{content}</a>
  );
}

function Heading({ section, titleId, description, viewAllHref }) {
  if (!section.title) return null;
  return (
    <SectionHeading
      id={titleId}
      size="md"
      title={section.title}
      description={section.subtitle || description}
      action={<ViewAll href={viewAllHref}>{section.viewAllText}</ViewAll>}
    />
  );
}

// The first section sits tight under the category rail on phones; its heading row already carries a 44px "View all" target.
const sectionPadding = (priority) => (priority ? 'pt-4 md:pt-7 lg:pt-6' : 'pt-10 sm:pt-14 lg:pt-16');

export function ProductRailSection({ section, products, loading, error, priority, viewAllHref }) {
  if (!loading && !error && products.length < section.minItems) return null;
  const titleId = `${section.id}-title`;

  return (
    <section
      aria-labelledby={section.title ? titleId : undefined}
      aria-label={section.title ? undefined : 'Products'}
      className={`shell ${sectionPadding(priority)}`}
    >
      <Heading section={section} titleId={titleId} viewAllHref={viewAllHref} />
      {error ? (
        <Alert tone="error" title="We could not load these products">{error}</Alert>
      ) : (
        <ProductRail
          products={products}
          loading={loading}
          priorityCount={priority ? 4 : 0}
          label={section.title || 'Products'}
        />
      )}
    </section>
  );
}

export function ProductCollectionSection({ section, products, total, loading, error, priority, viewAllHref }) {
  if (!loading && !error && products.length < section.minItems) return null;
  const titleId = `${section.id}-title`;
  const countText = section.showCount && typeof total === 'number' && total > 0
    ? `${total} ${total === 1 ? 'piece' : 'pieces'}`
    : undefined;

  const grid = (
    <ProductGrid
      products={products}
      loading={loading}
      skeletonCount={Math.min(section.limit, 8)}
      priorityCount={priority ? 4 : 0}
      columns={Number(section.desktopColumns) === 3 ? 'three' : 'wide'}
    />
  );
  const rail = (
    <ProductRail products={products} loading={loading} priorityCount={0} label={section.title || 'Products'} />
  );

  let body = grid;
  if (section.layout === 'rail') body = rail;
  else if (section.mobileLayout === 'rail') {
    // A swipeable row on phones, the grid from tablet up.
    body = (
      <>
        <div className="md:hidden">{rail}</div>
        <div className="hidden md:block">{grid}</div>
      </>
    );
  }

  const moreLink = contentLinkProps(viewAllHref);
  const showMore = section.layout !== 'rail' && !loading && moreLink && typeof total === 'number' && total > products.length;

  return (
    <section
      aria-labelledby={section.title ? titleId : undefined}
      aria-label={section.title ? undefined : 'Products'}
      className={`shell ${sectionPadding(priority)}`}
    >
      <Heading section={section} titleId={titleId} description={countText} viewAllHref={viewAllHref} />
      {error ? <Alert tone="error" title="We could not load these products">{error}</Alert> : body}
      {showMore && (
        <div className="mt-10 flex justify-center sm:mt-12">
          <Button {...moreLink} variant="secondary" size="lg">
            View all {total} pieces
            <ArrowRight size={15} aria-hidden="true" />
          </Button>
        </div>
      )}
    </section>
  );
}
