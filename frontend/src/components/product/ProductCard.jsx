import { forwardRef, memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { formatPrice, discountPercent, sortSizes } from '../../utils/format';
import { framingStyle, hasCustomFraming, responsiveImage } from '../../utils/images';
import { Skeleton, Stars } from '../ui';

/** Card image widths offered to the browser; the slot is always 3:4. */
const CARD_WIDTHS = [240, 320, 400, 480, 600, 720, 900];
const CARD_RATIO = 4 / 3;

/**
 * `sizes` for each layout, so each card downloads only what its slot needs.
 * Each value is the grid's own arithmetic: viewport, less the page gutters and
 * column gaps, divided by the columns at that breakpoint.
 */
export const CARD_SIZES = {
  default:
    '(min-width: 1440px) 280px, (min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) calc((100vw - 84px) / 2), calc((100vw - 52px) / 2)',
  three:
    '(min-width: 1440px) 430px, (min-width: 1024px) calc((100vw - 144px) / 3), (min-width: 768px) calc((100vw - 104px) / 3), (min-width: 640px) calc((100vw - 84px) / 2), calc((100vw - 52px) / 2)',
  wide:
    '(min-width: 1440px) 320px, (min-width: 1024px) calc((100vw - 168px) / 4), (min-width: 768px) calc((100vw - 104px) / 3), (min-width: 640px) calc((100vw - 84px) / 2), calc((100vw - 52px) / 2)',
  rail:
    '(min-width: 1440px) 250px, (min-width: 1280px) calc((100vw - 192px) / 5), (min-width: 1024px) calc((100vw - 168px) / 4), (min-width: 768px) calc((100vw - 104px) / 3), (min-width: 640px) calc((100vw - 64px) * 0.34), calc((100vw - 40px) * 0.42)',
};

/**
 * Product card.
 *
 * Everything shown here is real data from the database. There are deliberately
 * no invented delivery dates, age ranges or category labels, and ratings appear
 * only when a product has real reviews.
 *
 * Hover behaviour is pointer-only (`can-hover:`): a second photograph cross-
 * fades in where the product has one, otherwise the image draws slightly
 * closer. Touch devices get neither, and the wishlist control is always
 * visible.
 */
function ProductCard({ product, priority = false, sizes = CARD_SIZES.default }) {
  const { toggle, has } = useWishlist();

  const {
    _id, slug, name, price, mrp, images = [], totalStock = 0,
    isNewArrival, variants = [], ratingAverage = 0, ratingCount = 0,
  } = product;

  const wishlisted = has(_id);
  const discount = discountPercent(mrp, price);
  const outOfStock = totalStock <= 0;

  // Only sizes that are genuinely purchasable are advertised.
  const availableSizes = sortSizes(
    variants.filter((v) => v.isActive !== false && v.stock > 0).map((v) => v.size)
  );

  const primary = images[0];
  const secondary = images[1];
  // A framed photo is cropped by the browser, so the host must not crop it first.
  const cardSource = (image) => responsiveImage(image.url, {
    widths: CARD_WIDTHS,
    ratio: hasCustomFraming(image.framing) ? undefined : CARD_RATIO,
  });
  const primarySource = primary?.url ? cardSource(primary) : null;
  const secondarySource = secondary?.url ? cardSource(secondary) : null;

  const href = `/product/${slug}`;

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-card bg-paper-sunken">
        {/* The title link below is the one keyboard and screen-reader users
            reach; this image link duplicates it for pointer users only. */}
        <Link to={href} className="block aspect-[3/4] w-full" tabIndex={-1} aria-hidden="true">
          {primarySource ? (
            <>
              <img
                src={primarySource.src}
                srcSet={primarySource.srcSet}
                sizes={primarySource.srcSet ? sizes : undefined}
                alt={primary.alt || name}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
                width={600}
                height={800}
                style={framingStyle(primary.framing)}
                className={`h-full w-full object-cover transition-[transform,opacity] duration-700 ease-luxe
                            ${secondarySource ? 'can-hover:group-hover:opacity-0' : 'can-hover:group-hover:scale-[1.03]'}
                            ${outOfStock ? 'opacity-70' : ''}`}
              />
              {secondarySource && (
                <img
                  src={secondarySource.src}
                  srcSet={secondarySource.srcSet}
                  sizes={secondarySource.srcSet ? sizes : undefined}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  width={600}
                  height={800}
                  style={framingStyle(secondary.framing)}
                  // `hidden` keeps touch devices from downloading a photograph
                  // they can never see.
                  className="absolute inset-0 hidden h-full w-full object-cover opacity-0 transition-opacity
                             duration-700 ease-luxe can-hover:block can-hover:group-hover:opacity-100"
                />
              )}
            </>
          ) : (
            <span className="flex h-full w-full items-center justify-center text-xs text-ink-muted">
              No image
            </span>
          )}
        </Link>

        {/* Status tags — only rendered when the underlying fact is true. */}
        <div className="pointer-events-none absolute left-2 top-2 flex max-w-[calc(100%-3.5rem)] flex-col
                        items-start gap-1 sm:left-2.5 sm:top-2.5">
          {outOfStock ? (
            <span className="tag-soldout">Sold out</span>
          ) : (
            <>
              {isNewArrival && <span className="tag-new">New</span>}
              {discount > 0 && (
                <span className="tag-sale">
                  −{discount}%<span className="sr-only"> off</span>
                </span>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => toggle(product)}
          aria-label={wishlisted ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
          aria-pressed={wishlisted}
          // An inset ring: the card clips anything drawn outside this corner.
          className="absolute right-0.5 top-0.5 flex h-11 w-11 items-center justify-center rounded-full
                     focus-visible:ring-inset focus-visible:ring-offset-0 sm:right-1 sm:top-1"
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-paper-raised/90 shadow-card
                        transition-colors duration-200 ${
                          wishlisted ? 'text-rust' : 'text-ink-soft hover:text-ink'
                        }`}
          >
            <Heart size={15} className={wishlisted ? 'fill-current' : ''} aria-hidden="true" />
          </span>
        </button>

        {/* Size availability, for pointer users scanning a grid. */}
        {availableSizes.length > 0 && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-full
                       bg-paper-raised/95 px-3 py-2 backdrop-blur-sm transition-transform
                       duration-300 ease-luxe can-hover:block can-hover:group-hover:translate-y-0"
          >
            <p className="truncate text-2xs tracking-wide text-ink-soft">
              {availableSizes.slice(0, 7).join(' · ')}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-2.5 sm:pt-3">
        <h3 className="font-sans text-[0.8125rem] leading-snug text-ink sm:text-sm">
          <Link to={href} className="line-clamp-2 transition-colors hover:text-clay-deep">
            {name}
          </Link>
        </h3>

        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 tabular-nums">
          <span className="text-[0.8125rem] font-medium text-ink sm:text-sm">{formatPrice(price)}</span>
          {discount > 0 && (
            <span className="text-xs text-ink-faint line-through">
              <span className="sr-only">Original price </span>
              {formatPrice(mrp)}
            </span>
          )}
        </p>

        {ratingCount > 0 && (
          <p className="mt-1 flex items-center gap-1.5 text-2xs text-ink-muted">
            <Stars value={ratingAverage} size={11} />
            <span>({ratingCount})</span>
          </p>
        )}
      </div>
    </article>
  );
}

export default memo(ProductCard);

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-[3/4] w-full rounded-card" />
      <Skeleton className="mt-3 h-3.5 w-3/4" />
      <Skeleton className="mt-2 h-3.5 w-1/3" />
    </div>
  );
}

const GRID_COLUMNS = {
  /** Beside a filter sidebar (Shop). */
  default: 'grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 lg:grid-cols-3 xl:grid-cols-4',
  /** Full-width, three across on large screens (homepage collections). */
  three: 'grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:gap-x-6 lg:gap-y-12',
  /** Full-width pages (homepage, wishlist, related products). */
  wide: 'grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-12',
};

export function ProductGrid({
  products = [], loading = false, skeletonCount = 8, priorityCount = 4, columns = 'default',
}) {
  const gridClass = GRID_COLUMNS[columns] || GRID_COLUMNS.default;
  const sizes = CARD_SIZES[columns] || CARD_SIZES.default;

  if (loading) {
    return (
      <div className={gridClass}>
        {Array.from({ length: skeletonCount }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={gridClass}>
      {products.map((product, i) => (
        <ProductCard key={product._id} product={product} priority={i < priorityCount} sizes={sizes} />
      ))}
    </div>
  );
}

const RAIL_COLUMNS =
  'grid grid-flow-col auto-cols-[42%] gap-3 sm:auto-cols-[34%] sm:gap-4 md:auto-cols-[calc((100%-2.5rem)/3)] md:gap-5 lg:auto-cols-[calc((100%-4.5rem)/4)] lg:gap-6 xl:auto-cols-[calc((100%-6rem)/5)]';

/**
 * Horizontal product rail.
 *
 * Swipeable with snap on touch, showing a little of the next card so it reads
 * as scrollable. From 768px it shows whole cards (3, 4, then 5 across) with
 * previous/next controls that appear only when there is more to see.
 */
export function ProductRail({
  products = [], loading = false, priorityCount = 0, label = 'Products', skeletonCount = 5,
}) {
  const scrollerRef = useRef(null);
  const prevRef = useRef(null);
  const nextRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const updateEdges = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const start = el.scrollLeft <= 4;
    const end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    // Same object while nothing changes, so scrolling does not re-render.
    setEdges((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  // A button hides once its edge is reached. If it had keyboard focus, hand
  // focus to the opposite button rather than leaving it on an invisible one.
  useLayoutEffect(() => {
    const active = document.activeElement;
    if (edges.end && active === nextRef.current && !edges.start) prevRef.current?.focus({ preventScroll: true });
    if (edges.start && active === prevRef.current && !edges.end) nextRef.current?.focus({ preventScroll: true });
  }, [edges]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return undefined;
    updateEdges();
    el.addEventListener('scroll', updateEdges, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(updateEdges);
    observer?.observe(el);
    return () => {
      el.removeEventListener('scroll', updateEdges);
      observer?.disconnect();
    };
  }, [updateEdges, loading, products.length]);

  const page = (direction) => {
    const el = scrollerRef.current;
    if (!el) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: reduced ? 'auto' : 'smooth' });
  };

  if (!loading && products.length === 0) return null;

  // From lg the rail sits in the page column, with 6px of padding cancelled by
  // a matching negative margin so the first and last focus rings are not
  // clipped by the scroller. Column widths are unchanged.
  const railClass = `rail bleed lg:-mx-1.5 lg:px-1.5 lg:[--rail-pad:0.375rem] ${RAIL_COLUMNS}`;

  return (
    <div className="relative">
      {loading ? (
        <div className={railClass} aria-hidden="true">
          {Array.from({ length: skeletonCount }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <ul ref={scrollerRef} className={railClass} aria-label={label}>
          {products.slice(0, 8).map((product, i) => (
            <li key={product._id} className="snap-start">
              <ProductCard product={product} priority={i < priorityCount} sizes={CARD_SIZES.rail} />
            </li>
          ))}
        </ul>
      )}

      {!loading && (
        <>
          <RailButton ref={prevRef} direction={-1} hidden={edges.start} onClick={() => page(-1)} label={`Previous ${label}`} />
          <RailButton ref={nextRef} direction={1} hidden={edges.end} onClick={() => page(1)} label={`More ${label}`} />
        </>
      )}
    </div>
  );
}

/**
 * A hidden button is also `invisible`, which takes it out of the tab order
 * and the accessibility tree, so it is never announced as a control that
 * does nothing.
 */
const RailButton = forwardRef(function RailButton({ direction, hidden, onClick, label }, ref) {
  const Icon = direction < 0 ? ChevronLeft : ChevronRight;
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={label}
      tabIndex={hidden ? -1 : 0}
      className={`absolute top-[37%] z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center
                  rounded-full border border-line bg-paper-raised text-ink shadow-raised
                  transition-[opacity,visibility] duration-200 hover:border-ink md:flex ${
                    direction < 0 ? '-left-3 lg:-left-5' : '-right-3 lg:-right-5'
                  } ${hidden ? 'pointer-events-none invisible opacity-0' : 'visible opacity-100'}`}
    >
      <Icon size={18} aria-hidden="true" />
    </button>
  );
});
