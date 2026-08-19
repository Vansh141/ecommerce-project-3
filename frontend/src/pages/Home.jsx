import { Link, useOutletContext } from 'react-router-dom';
import { ArrowRight, Scissors, Leaf, PackageCheck } from 'lucide-react';
import { productApi } from '../api/endpoints';
import { useFetch, useDocumentMeta } from '../hooks';
import { ProductRail } from '../components/product/ProductCard';
import { Button, SectionHeading, Skeleton } from '../components/ui';

/**
 * Hero.
 *
 * Uses the first featured product's own photography as the backdrop, so the
 * homepage reflects real inventory instead of a stock image that has nothing
 * to do with what is for sale.
 */
function Hero({ product, loading }) {
  return (
    <section className="relative border-b border-line bg-paper-sunken">
      <div className="shell">
        <div className="grid items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16 lg:py-24">
          <div className="order-2 lg:order-1">
            <p className="eyebrow mb-4">New season</p>
            <h1 className="text-balance text-4xl leading-[1.1] sm:text-5xl lg:text-6xl">
              Clothes made to be
              <span className="block italic text-clay-deep">worn, not stored</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-ink-muted">
              Natural fabrics, quiet colour, and cuts that hold their shape.
              Designed in Mumbai and made in small runs.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Button to="/shop" size="lg">
                Shop the collection <ArrowRight size={15} aria-hidden="true" />
              </Button>
              <Button to="/shop?newArrival=true" variant="secondary" size="lg">
                New arrivals
              </Button>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            {loading ? (
              <Skeleton className="aspect-[4/5] w-full" />
            ) : product?.images?.[0]?.url ? (
              <Link to={`/product/${product.slug}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden bg-paper">
                  <img
                    src={product.images[0].url}
                    alt={product.images[0].alt || product.name}
                    // `fetchPriority` is intentionally omitted: React 18 does
                    // not recognise it and logs a warning for every render.
                    // `loading="eager"` gives the same above-the-fold benefit
                    // and is fully supported.
                    loading="eager"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-[1200ms]
                               ease-luxe group-hover:scale-[1.03]"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/55 to-transparent p-6">
                    <p className="text-2xs uppercase tracking-luxe text-paper/70">Featured</p>
                    <p className="mt-1 font-display text-lg text-paper">{product.name}</p>
                  </div>
                </div>
              </Link>
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-paper text-sm text-ink-faint">
                Add a featured product to fill this space
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function CategoryTiles({ categories }) {
  const shown = categories.filter((c) => c.image?.url).slice(0, 6);
  if (shown.length === 0) return null;

  return (
    <section className="shell py-16 sm:py-20">
      <SectionHeading eyebrow="Browse" title="Shop by category" />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
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
                loading={i < 2 ? 'eager' : 'lazy'}
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-700
                           ease-luxe group-hover:scale-[1.05]"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-ink/60 via-ink/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
              <div>
                <h3 className="font-display text-lg text-paper">{c.name}</h3>
                {c.productCount > 0 && (
                  <p className="mt-0.5 text-2xs uppercase tracking-wider2 text-paper/70">
                    {c.productCount} {c.productCount === 1 ? 'piece' : 'pieces'}
                  </p>
                )}
              </div>
              <ArrowRight
                size={17}
                className="shrink-0 text-paper transition-transform duration-300 group-hover:translate-x-1"
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
      <div className="shell py-14">
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

function Collection({ eyebrow, title, products, loading, to }) {
  if (!loading && (!products || products.length === 0)) return null;

  return (
    <section className="shell py-16 sm:py-20">
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

export default function Home() {
  const { categories = [] } = useOutletContext() || {};
  const { data, loading } = useFetch(() => productApi.homeCollections(), []);

  useDocumentMeta({
    title: 'Considered clothing, made in India',
    description:
      'TOUCH — linen, cotton and silk pieces designed in Mumbai and made in small runs. Shop dresses, tops, co-ords and more.',
  });

  const featured = data?.featured || [];
  const newArrivals = data?.newArrivals || [];
  const onSale = data?.onSale || [];
  const bestSellers = data?.bestSellers || [];

  return (
    <>
      <Hero product={featured[0] || newArrivals[0]} loading={loading} />

      <Collection
        eyebrow="Just in"
        title="New arrivals"
        products={newArrivals}
        loading={loading}
        to="/shop?newArrival=true"
      />

      <CategoryTiles categories={categories} />

      <ValueStrip />

      <Collection
        eyebrow="Curated"
        title="Featured pieces"
        products={featured}
        loading={loading}
        to="/shop?featured=true"
      />

      {/* Sale section only appears when something is genuinely marked down. */}
      {!loading && onSale.length > 0 && (
        <section className="border-y border-line bg-clay-faint">
          <div className="shell py-16 sm:py-20">
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

      <Collection
        eyebrow="Popular"
        title="Best sellers"
        products={bestSellers}
        loading={loading}
        to="/shop?sort=popular"
      />
    </>
  );
}
