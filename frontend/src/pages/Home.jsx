import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, Scissors, Leaf, PackageCheck } from 'lucide-react';
import { productApi } from '../api/endpoints';
import { useFetch, useDocumentMeta } from '../hooks';
import { ProductGrid, ProductRail } from '../components/product/ProductCard';
import { Button, SectionHeading, Skeleton, EmptyState, Alert } from '../components/ui';

/**
 * The homepage is product-first.
 *
 * A customer arriving on any device sees real, buyable stock in the first
 * viewport — no hero, no promotional banner and no category showcase above it.
 * The brand story still exists, but it earns its place further down the page
 * rather than standing between a shopper and the catalogue.
 */

/** How many pieces the opening grid asks the server for. */
const OPENING_GRID_SIZE = 12;

/* ═══════════════════════ Opening catalogue ══════════════════════════════ */

/**
 * Compact toolbar above the grid.
 *
 * Deliberately minimal: a title, one line of context, and the category links
 * the header already loaded. Anything heavier here would reintroduce the
 * problem this layout exists to solve. The full filter and sort controls live
 * on /shop, which every one of these links leads into.
 */
function CatalogueToolbar({ categories, total }) {
  const shown = categories.filter((c) => c.isActive !== false).slice(0, 8);

  return (
    <div className="mb-6 sm:mb-8">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <p className="eyebrow mb-2">The collection</p>
          {/* The page's only h1. The brand headline further down is an h2. */}
          <h1 className="text-display-2">Shop new in</h1>
        </div>

        <Link
          to="/shop"
          className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium uppercase
                     tracking-wider2 text-ink-soft transition-colors hover:text-ink"
        >
          {typeof total === 'number' && total > 0 ? `All ${total} pieces` : 'View all'}
          <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </div>

      {shown.length > 0 && (
        // Bleeds to the screen edge on a phone so the last chip is never
        // clipped mid-word; a plain wrapped row from `sm` upward.
        <nav
          aria-label="Shop by category"
          className="no-scrollbar -mx-5 mt-5 flex gap-2 overflow-x-auto px-5 pb-1
                     sm:-mx-0 sm:mt-6 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0"
        >
          <Link
            to="/shop"
            className="shrink-0 whitespace-nowrap rounded-control border border-ink bg-ink px-3.5
                       py-2 text-2xs font-medium uppercase tracking-wider2 text-paper
                       transition-colors hover:bg-ink-soft"
          >
            All
          </Link>
          {shown.map((c) => (
            <Link
              key={c._id}
              to={`/shop?category=${c.slug}`}
              className="shrink-0 whitespace-nowrap rounded-control border border-line px-3.5 py-2
                         text-2xs font-medium uppercase tracking-wider2 text-ink-soft
                         transition-colors hover:border-ink hover:text-ink"
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}

/* ═══════════════════════ Brand story (moved below) ══════════════════════ */

/**
 * Formerly the hero at the top of the page.
 *
 * Same copy and the same featured-product photography — it now sits beneath
 * the catalogue, and its headline is an h2 because the shop heading above owns
 * the h1. The vertical padding is smaller than the old hero's: down here it is
 * a section of the page, not the whole first screen.
 */
function BrandStory({ product, loading }) {
  return (
    <section className="border-y border-line bg-paper-sunken">
      <div className="shell">
        <div className="grid items-center gap-8 py-12 sm:gap-10 sm:py-14 lg:grid-cols-2 lg:gap-16 lg:py-16">
          <div className="lg:order-1">
            <p className="eyebrow mb-3 sm:mb-4">New season</p>
            <h2 className="text-display-2 text-balance">
              Clothes made to be
              <span className="block italic text-clay-deep">worn, not stored</span>
            </h2>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-ink-muted sm:mt-6 sm:text-base">
              Natural fabrics, quiet colour, and cuts that hold their shape.
              Designed in Mumbai and made in small runs.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center">
              <Button to="/shop" size="lg">
                Shop the collection <ArrowRight size={15} aria-hidden="true" />
              </Button>
              <Button to="/about" variant="secondary" size="lg">
                Our story
              </Button>
            </div>
          </div>

          <div className="lg:order-2">
            {loading ? (
              <Skeleton className="aspect-[4/5] w-full" />
            ) : product?.images?.[0]?.url ? (
              <Link to={`/product/${product.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-paper">
                  <img
                    src={product.images[0].url}
                    alt={product.images[0].alt || product.name}
                    // Below the fold now that products lead the page, so this
                    // no longer competes with the grid for early bandwidth.
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[1200ms]
                               ease-luxe group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/55 to-transparent p-4 sm:p-6">
                    <p className="text-2xs uppercase tracking-luxe text-paper/70">Featured</p>
                    <p className="mt-1 line-clamp-2 font-display text-base text-paper sm:text-lg">
                      {product.name}
                    </p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-paper px-6 text-center text-sm text-ink-faint">
                Add a featured product to fill this space
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════════════ Supporting sections ════════════════════════════ */

function CategoryTiles({ categories }) {
  const shown = categories.filter((c) => c.image?.url).slice(0, 6);
  if (shown.length === 0) return null;

  return (
    <section className="shell section">
      <SectionHeading eyebrow="Browse" title="Shop by category" />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        {shown.map((c, i) => (
          <Link
            key={c._id}
            to={`/shop?category=${c.slug}`}
            className="group relative block overflow-hidden bg-paper-sunken"
          >
            <div className={`${i === 0 ? 'aspect-[4/5] lg:aspect-[4/3]' : 'aspect-[4/5]'}`}>
              <img
                src={c.image.url}
                alt={c.image.alt || c.name}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700
                           ease-luxe group-hover:scale-[1.05]"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0">
                <h3 className="font-display text-base leading-snug text-paper sm:text-lg">{c.name}</h3>
                {c.productCount > 0 && (
                  <p className="mt-0.5 text-2xs uppercase tracking-wider2 text-paper/70">
                    {c.productCount} {c.productCount === 1 ? 'piece' : 'pieces'}
                  </p>
                )}
              </div>
              <ArrowRight
                size={17}
                className="hidden shrink-0 text-paper transition-transform duration-300 group-hover:translate-x-1 sm:block"
                aria-hidden="true"
              />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/** Brand values. Each claim maps to something the store actually does. */
function ValueStrip() {
  const values = [
    { icon: Scissors, title: 'Made in small runs', body: 'Produced in limited quantities with makers we work with directly.' },
    { icon: Leaf, title: 'Natural fabrics', body: 'Linen, cotton and silk chosen to wear well and age gracefully.' },
    { icon: PackageCheck, title: 'Straightforward returns', body: 'Seven days to return an unworn piece in its original condition.' },
  ];

  return (
    <section className="border-y border-line bg-paper-raised">
      <div className="shell section-tight">
        <div className="grid gap-10 sm:grid-cols-3 sm:gap-8">
          {values.map(({ icon: Icon, title, body }) => (
            <div key={title} className="text-center sm:text-left">
              <Icon size={20} className="mx-auto mb-4 text-clay sm:mx-0" aria-hidden="true" />
              <h3 className="mb-2 text-base">{title}</h3>
              <p className="text-sm leading-relaxed text-ink-muted">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Collection({ eyebrow, title, products, loading, to, className = 'shell section' }) {
  if (!loading && (!products || products.length === 0)) return null;

  return (
    <section className={className}>
      <SectionHeading
        eyebrow={eyebrow}
        title={title}
        action={
          to && (
            <Link
              to={to}
              className="hidden shrink-0 items-center gap-1.5 text-xs font-medium uppercase
                         tracking-wider2 text-ink-soft transition-colors hover:text-ink sm:flex"
            >
              View all <ArrowRight size={13} aria-hidden="true" />
            </Link>
          )
        }
      />
      <ProductRail products={products} loading={loading} />
    </section>
  );
}

/* ═══════════════════════════════ Page ═══════════════════════════════════ */

export default function Home() {
  const { categories = [] } = useOutletContext() || {};

  /**
   * The opening grid asks the catalogue endpoint for one page of the newest
   * stock — the same server-paginated, server-sorted route /shop uses, with a
   * `limit` so the whole catalogue is never downloaded. The curated rails
   * further down still come from the single collections request, so the page
   * makes two requests in total and neither of them is unbounded.
   */
  const {
    data: latest,
    meta: latestMeta,
    loading: latestLoading,
    error: latestError,
  } = useFetch(() => productApi.list({ limit: OPENING_GRID_SIZE, sort: 'newest' }), []);

  const { data: collections, loading: collectionsLoading } = useFetch(
    () => productApi.homeCollections(),
    []
  );

  useDocumentMeta({
    title: 'Considered clothing, made in India',
    description:
      'TOUCH — linen, cotton and silk pieces designed in Mumbai and made in small runs. Shop dresses, tops, co-ords and more.',
  });

  const products = latest?.products || [];
  const featured = collections?.featured || [];
  const newArrivals = collections?.newArrivals || [];
  const onSale = collections?.onSale || [];
  const bestSellers = collections?.bestSellers || [];

  return (
    <>
      {/* ── 1. Catalogue — the first thing on the page, on every device ── */}
      <section className="shell pb-12 pt-6 sm:pb-14 sm:pt-8 lg:pb-16 lg:pt-10">
        <CatalogueToolbar categories={categories} total={latestMeta?.total} />

        {latestError ? (
          <Alert tone="error" title="We could not load the collection">
            {latestError}
          </Alert>
        ) : !latestLoading && products.length === 0 ? (
          <EmptyState
            title="Nothing here yet"
            description="The collection is being prepared. Please check back shortly."
            action={<Button to="/contact" variant="secondary">Get in touch</Button>}
          />
        ) : (
          <>
            <ProductGrid
              products={products}
              loading={latestLoading}
              skeletonCount={OPENING_GRID_SIZE}
              priorityCount={4}
            />

            {/* Only worth offering when there is more to see than we showed. */}
            {!latestLoading && latestMeta?.total > products.length && (
              <div className="mt-10 flex justify-center sm:mt-12">
                <Button to="/shop" variant="secondary" size="lg">
                  View all {latestMeta.total} pieces
                  <ArrowRight size={15} aria-hidden="true" />
                </Button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── 2. More products: genuine markdowns only ── */}
      {!collectionsLoading && onSale.length > 0 && (
        <section className="border-y border-line bg-clay-faint">
          <div className="shell section">
            <SectionHeading
              eyebrow="Reduced"
              title="On sale"
              action={
                <Link
                  to="/shop?onSale=true"
                  className="hidden shrink-0 items-center gap-1.5 text-xs font-medium uppercase
                             tracking-wider2 text-ink-soft transition-colors hover:text-ink sm:flex"
                >
                  View all <ArrowRight size={13} aria-hidden="true" />
                </Link>
              }
            />
            <ProductRail products={onSale} />
          </div>
        </section>
      )}

      {/* ── 3. Brand story — the old hero, now below the shopping ── */}
      <BrandStory product={featured[0] || newArrivals[0]} loading={collectionsLoading} />

      {/* ── 4. Category showcase ── */}
      <CategoryTiles categories={categories} />

      {/* ── 5–6. Curated rails ── */}
      <Collection
        eyebrow="Curated"
        title="Featured pieces"
        products={featured}
        loading={collectionsLoading}
        to="/shop?featured=true"
      />

      <Collection
        eyebrow="Popular"
        title="Best sellers"
        products={bestSellers}
        loading={collectionsLoading}
        to="/shop?sort=popular"
      />

      {/* ── 7. Why buy here ── */}
      <ValueStrip />
    </>
  );
}
