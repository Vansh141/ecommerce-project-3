import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { formatPrice, discountPercent, sortSizes } from '../../utils/format';
import { Skeleton } from '../ui';

/**
 * Product card.
 *
 * Everything shown here is real data from the database. There are deliberately
 * no invented delivery dates, age ranges or category labels — the previous
 * version fabricated all three, which is both misleading and a consumer-
 * protection risk.
 */
function ProductCard({ product, priority = false }) {
  const { toggle, has } = useWishlist();

  const {
    _id, slug, name, brand, price, mrp, images = [], totalStock = 0,
    isNewArrival, variants = [],
  } = product;

  const wishlisted = has(_id);
  const discount = discountPercent(mrp, price);
  const outOfStock = totalStock <= 0;

  // Only sizes that are genuinely purchasable are advertised.
  const availableSizes = sortSizes(
    variants.filter((v) => v.isActive !== false && v.stock > 0).map((v) => v.size)
  );
  const soldOutSizes = variants.length > 0 && availableSizes.length < variants.length;

  const image = images[0];

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden bg-paper-sunken">
        <Link
          to={`/product/${slug}`}
          className="block aspect-[3/4] w-full"
          aria-label={name}
        >
          {image?.url ? (
            <img
              src={image.url}
              alt={image.alt || name}
              loading={priority ? 'eager' : 'lazy'}
              decoding="async"
              width={image.width || 600}
              height={image.height || 800}
              className={`h-full w-full object-cover transition-transform duration-700 ease-luxe
                          group-hover:scale-[1.04] ${outOfStock ? 'opacity-60' : ''}`}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">
              No image
            </div>
          )}
        </Link>

        {/* Status badges — only rendered when the underlying fact is true. */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {outOfStock && <span className="badge-neutral bg-ink/85 text-paper">Sold out</span>}
          {!outOfStock && discount > 0 && <span className="badge-sale">−{discount}%</span>}
          {!outOfStock && discount === 0 && isNewArrival && <span className="badge-new">New</span>}
        </div>

        <button
          type="button"
          onClick={() => toggle(product)}
          aria-label={wishlisted ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
          aria-pressed={wishlisted}
          className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center
                     rounded-full bg-paper-raised/90 text-ink-soft backdrop-blur-sm
                     transition-all duration-200 hover:bg-paper-raised hover:text-ink
                     focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <Heart
            size={15}
            className={wishlisted ? 'fill-danger text-danger' : ''}
            aria-hidden="true"
          />
        </button>

        {/* Size availability appears on hover for desktop shoppers scanning a grid. */}
        {availableSizes.length > 0 && (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-full
                       bg-paper-raised/95 px-3 py-2.5 backdrop-blur-sm transition-transform
                       duration-300 ease-luxe group-hover:translate-y-0 sm:block"
          >
            <div className="flex flex-wrap items-center gap-1.5">
              {availableSizes.slice(0, 6).map((size) => (
                <span key={size} className="text-2xs font-medium tracking-wider2 text-ink-soft">
                  {size}
                </span>
              ))}
              {soldOutSizes && (
                <span className="text-2xs text-ink-faint">· some sizes sold out</span>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col pt-3.5">
        {brand && <p className="mb-1 text-2xs uppercase tracking-wider2 text-ink-faint">{brand}</p>}

        <h3 className="text-sm leading-snug">
          <Link to={`/product/${slug}`} className="transition-colors hover:text-clay-deep">
            {name}
          </Link>
        </h3>

        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="text-sm font-medium text-ink">{formatPrice(price)}</span>
          {discount > 0 && (
            <>
              <span className="text-xs text-ink-faint line-through">{formatPrice(mrp)}</span>
              <span className="text-xs font-medium text-danger">−{discount}%</span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

export default memo(ProductCard);

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col">
      <Skeleton className="aspect-[3/4] w-full" />
      <Skeleton className="mt-3.5 h-2.5 w-1/3" />
      <Skeleton className="mt-2 h-3.5 w-3/4" />
      <Skeleton className="mt-2.5 h-3.5 w-1/4" />
    </div>
  );
}

export function ProductGrid({ products = [], loading = false, skeletonCount = 8, priorityCount = 4 }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, i) => (
           
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-9 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product, i) => (
        <ProductCard key={product._id} product={product} priority={i < priorityCount} />
      ))}
    </div>
  );
}

/** Horizontal rail used on the homepage; scrolls with a thumb on mobile. */
export function ProductRail({ products = [], loading = false }) {
  if (loading) {
    return (
      <div className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 sm:-mx-8 sm:px-8 lg:mx-0 lg:px-0">
        {Array.from({ length: 4 }).map((_, i) => (
           
          <div key={i} className="w-[46vw] shrink-0 sm:w-64 lg:w-auto lg:flex-1">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) return null;

  return (
    <div
      className="no-scrollbar -mx-5 flex gap-4 overflow-x-auto px-5 pb-1 sm:-mx-8 sm:px-8
                 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0"
    >
      {products.slice(0, 8).map((product, i) => (
        <div key={product._id} className="w-[46vw] shrink-0 sm:w-64 lg:w-auto">
          <ProductCard product={product} priority={i < 4} />
        </div>
      ))}
    </div>
  );
}
