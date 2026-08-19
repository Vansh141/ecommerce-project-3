import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useOutletContext } from 'react-router-dom';
import { SlidersHorizontal, X, Search, PackageSearch } from 'lucide-react';
import { productApi } from '../api/endpoints';
import { useFetch, useDebounced, useDocumentMeta, useBodyScrollLock } from '../hooks';
import { ProductGrid } from '../components/product/ProductCard';
import { Button, EmptyState, Pagination, Select, Alert, Skeleton } from '../components/ui';
import { formatPrice, sortSizes } from '../utils/format';

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'popular', label: 'Best selling' },
  { value: 'rating', label: 'Top rated' },
];

/**
 * Filter panel.
 *
 * Every option is derived from the database — price bounds and sizes come from
 * the /products/facets endpoint, categories from /categories. Nothing here is
 * hardcoded, so a filter can never offer a size or band that no product has.
 */
function Filters({ params, setParam, clearAll, categories, facets, facetsLoading, activeCount }) {
  const priceBands = useMemo(() => {
    const max = facets?.priceRange?.max ?? 0;
    if (max <= 0) return [];

    // Bands are generated from the real catalogue range rather than fixed
    // dollar buckets that never matched rupee pricing.
    const step = Math.max(500, Math.ceil(max / 4 / 500) * 500);
    return [
      { label: `Under ${formatPrice(step)}`, min: '', max: step },
      { label: `${formatPrice(step)} – ${formatPrice(step * 2)}`, min: step, max: step * 2 },
      { label: `${formatPrice(step * 2)} – ${formatPrice(step * 3)}`, min: step * 2, max: step * 3 },
      { label: `${formatPrice(step * 3)} +`, min: step * 3, max: '' },
    ];
  }, [facets]);

  const selectedSizes = (params.sizes || '').split(',').filter(Boolean);

  const toggleSize = (size) => {
    const next = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    setParam('sizes', next.join(','));
  };

  const activePriceBand = priceBands.findIndex(
    (b) => String(b.min) === (params.minPrice || '') && String(b.max) === (params.maxPrice || '')
  );

  return (
    <div className="space-y-8">
      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-muted
                     underline underline-offset-4 transition-colors hover:text-ink"
        >
          <X size={12} aria-hidden="true" /> Clear all filters ({activeCount})
        </button>
      )}

      <fieldset>
        <legend className="eyebrow mb-3.5">Category</legend>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setParam('category', '')}
            className={`block w-full text-left text-sm transition-colors ${
              !params.category ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'
            }`}
          >
            All products
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => setParam('category', c.slug)}
              className={`flex w-full items-center justify-between gap-2 text-left text-sm
                          transition-colors ${
                            params.category === c.slug
                              ? 'font-medium text-ink'
                              : 'text-ink-muted hover:text-ink'
                          }`}
            >
              <span>{c.name}</span>
              {c.productCount > 0 && (
                <span className="text-2xs text-ink-faint">{c.productCount}</span>
              )}
            </button>
          ))}
        </div>
      </fieldset>

      {priceBands.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-3.5">Price</legend>
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => { setParam('minPrice', ''); setParam('maxPrice', ''); }}
              className={`block w-full text-left text-sm transition-colors ${
                activePriceBand === -1 ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'
              }`}
            >
              Any price
            </button>
            {priceBands.map((band, i) => (
              <button
                key={band.label}
                type="button"
                onClick={() => { setParam('minPrice', band.min); setParam('maxPrice', band.max); }}
                className={`block w-full text-left text-sm transition-colors ${
                  activePriceBand === i ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'
                }`}
              >
                {band.label}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="eyebrow mb-3.5">Size</legend>
        {facetsLoading ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
               
              <Skeleton key={i} className="h-10 w-12" />
            ))}
          </div>
        ) : facets?.sizes?.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {sortSizes(facets.sizes.map((s) => s.size)).map((size) => {
              const facet = facets.sizes.find((s) => s.size === size);
              const selected = selectedSizes.includes(size);
              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => toggleSize(size)}
                  disabled={!facet?.inStock}
                  aria-pressed={selected}
                  className={`h-10 min-w-[3rem] rounded-control border px-3 text-xs font-medium
                              transition-all disabled:cursor-not-allowed disabled:opacity-35
                              disabled:line-through ${
                                selected
                                  ? 'border-ink bg-ink text-paper'
                                  : 'border-line text-ink-soft hover:border-ink hover:text-ink'
                              }`}
                >
                  {size}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-ink-faint">No sizes available</p>
        )}
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-3.5">Availability</legend>
        <div className="space-y-2.5">
          {[
            { key: 'inStock', label: 'In stock only' },
            { key: 'onSale', label: 'On sale' },
            { key: 'newArrival', label: 'New arrivals' },
          ].map(({ key, label }) => (
            <label key={key} className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                checked={params[key] === 'true'}
                onChange={(e) => setParam(key, e.target.checked ? 'true' : '')}
                className="h-4 w-4 rounded-none border-line-strong accent-ink"
              />
              <span className="text-sm text-ink-soft">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

export default function Shop() {
  const { categories = [] } = useOutletContext() || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  useBodyScrollLock(mobileFiltersOpen);

  const params = useMemo(() => Object.fromEntries(searchParams.entries()), [searchParams]);
  const debouncedSearch = useDebounced(searchInput, 400);

  // Typing in the inline search box updates the URL, which drives the query.
  useEffect(() => {
    const current = searchParams.get('search') || '';
    if (debouncedSearch === current) return;

    const next = new URLSearchParams(searchParams);
    if (debouncedSearch) next.set('search', debouncedSearch);
    else next.delete('search');
    next.delete('page');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const setParam = useCallback(
    (key, value) => {
      const next = new URLSearchParams(searchParams);
      if (value === '' || value === null || value === undefined) next.delete(key);
      else next.set(key, String(value));
      next.delete('page'); // any filter change returns to page one
      setSearchParams(next);
    },
    [searchParams, setSearchParams]
  );

  const clearAll = useCallback(() => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  const page = Number(params.page) || 1;

  const query = useMemo(
    () => ({
      page,
      limit: 12,
      search: params.search,
      category: params.category,
      minPrice: params.minPrice,
      maxPrice: params.maxPrice,
      sizes: params.sizes,
      sort: params.sort || 'newest',
      inStock: params.inStock,
      onSale: params.onSale,
      newArrival: params.newArrival,
      featured: params.featured,
    }),
    [page, params]
  );

  // All filtering happens on the server. The browser never downloads the
  // whole catalogue to filter it locally.
  const { data, meta, loading, error } = useFetch(
    () => productApi.list(query),
    [JSON.stringify(query)]
  );

  const { data: facets, loading: facetsLoading } = useFetch(
    () => productApi.facets({ category: params.category }),
    [params.category]
  );

  const activeCategory = categories.find((c) => c.slug === params.category);

  const activeCount = [
    params.category, params.minPrice || params.maxPrice, params.sizes,
    params.inStock, params.onSale, params.newArrival,
  ].filter(Boolean).length;

  const title = activeCategory ? activeCategory.name : params.search ? `“${params.search}”` : 'Shop all';

  useDocumentMeta({
    title: activeCategory ? activeCategory.name : 'Shop all',
    description:
      activeCategory?.metaDescription ||
      'Browse the full TOUCH collection — dresses, tops, co-ords, ethnic wear and accessories.',
  });

  const products = data?.products || [];
  const total = meta?.total ?? 0;

  const filterProps = {
    params, setParam, clearAll, categories, facets, facetsLoading, activeCount,
  };

  return (
    <div className="shell py-10 sm:py-14">
      <header className="mb-9">
        <h1 className="text-3xl sm:text-4xl">{title}</h1>
        {activeCategory?.description && (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-ink-muted">
            {activeCategory.description}
          </p>
        )}
        {!loading && (
          <p className="mt-3 text-sm text-ink-muted">
            {total} {total === 1 ? 'piece' : 'pieces'}
          </p>
        )}
      </header>

      {/* ── Toolbar ── */}
      <div className="mb-8 flex flex-col gap-3 border-y border-line py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search this collection"
            aria-label="Search products"
            className="field py-2.5 pl-9 text-sm"
          />
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setMobileFiltersOpen(true)}
          >
            <SlidersHorizontal size={14} aria-hidden="true" />
            Filters{activeCount > 0 && ` (${activeCount})`}
          </Button>

          <Select
            value={params.sort || 'newest'}
            onChange={(e) => setParam('sort', e.target.value)}
            aria-label="Sort products"
            className="w-full sm:w-52"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex gap-10">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <Filters {...filterProps} />
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {error ? (
            <Alert tone="error" title="Could not load products">{error}</Alert>
          ) : !loading && products.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="Nothing matches those filters"
              description="Try removing a filter or searching for something else."
              action={activeCount > 0 && <Button onClick={clearAll} variant="secondary">Clear filters</Button>}
            />
          ) : (
            <>
              <ProductGrid products={products} loading={loading} skeletonCount={12} />

              {meta?.totalPages > 1 && (
                <Pagination
                  page={page}
                  totalPages={meta.totalPages}
                  onChange={(p) => {
                    setSearchParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('page', String(p));
                      return next;
                    });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="mt-14"
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Mobile filter drawer ── */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-ink/40"
            onClick={() => setMobileFiltersOpen(false)}
            aria-hidden="true"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className="absolute inset-y-0 right-0 flex w-[88%] max-w-sm animate-slide-in-right
                       flex-col bg-paper-raised shadow-pop"
          >
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-base">Filters</h2>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                aria-label="Close filters"
                className="-mr-2 p-2 text-ink-faint hover:text-ink"
              >
                <X size={19} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <Filters {...filterProps} />
            </div>

            <div className="border-t border-line p-4">
              <Button fullWidth onClick={() => setMobileFiltersOpen(false)}>
                Show {total} {total === 1 ? 'result' : 'results'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
