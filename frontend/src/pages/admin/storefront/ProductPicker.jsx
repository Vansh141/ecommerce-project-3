import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, Search, X } from 'lucide-react';
import { productApi } from '../../../api/endpoints';
import { useDebounced } from '../../../hooks';
import { STOREFRONT_LIMITS } from '../../../config/storefront';
import { formatPrice } from '../../../utils/format';
import { Notice } from './EditorFields';
import { getIn, useEditor } from './editorContext';

/**
 * Hand-picked products for a product section.
 *
 * Searches the live catalogue (active products only) and stores product ids —
 * never copies of products — in the order chosen here. Products that are no
 * longer active are flagged, because the homepage hides them.
 */
export default function ProductPicker({ path }) {
  const { form, errors, modify } = useEditor();
  const ids = getIn(form, path) || [];
  const idsKey = ids.join(',');
  const max = STOREFRONT_LIMITS.productIds;

  const [query, setQuery] = useState('');
  const search = useDebounced(query.trim(), 350);
  const [results, setResults] = useState({ term: '', products: [], loading: false, error: null });
  const [known, setKnown] = useState({});
  const [active, setActive] = useState({ key: null, ids: new Set() });

  // Search results.
  useEffect(() => {
    if (!search) return undefined;
    let cancelled = false;
    productApi
      .list({ search, status: 'active', limit: 10 })
      .then(({ data }) => {
        if (cancelled) return;
        const products = data?.products || [];
        setResults({ term: search, products, loading: false, error: null });
        setKnown((current) => ({ ...current, ...Object.fromEntries(products.map((p) => [p._id, p])) }));
      })
      .catch((err) => {
        if (!cancelled) setResults({ term: search, products: [], loading: false, error: err.friendlyMessage || 'Search failed.' });
      });
    return () => {
      cancelled = true;
    };
  }, [search]);

  // Which selected products the homepage can actually show.
  useEffect(() => {
    if (!idsKey) return undefined;
    let cancelled = false;
    productApi
      .sections([{ id: 'picked', source: 'manual', products: idsKey.split(','), limit: 24 }])
      .then((data) => {
        if (cancelled) return;
        const found = data?.sections?.picked?.products || [];
        setKnown((current) => ({ ...current, ...Object.fromEntries(found.map((p) => [p._id, p])) }));
        setActive({ key: idsKey, ids: new Set(found.map((p) => p._id)) });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [idsKey]);

  const move = (from, to) =>
    modify(path, (current = []) => {
      if (to < 0 || to >= current.length) return current;
      const next = [...current];
      const [id] = next.splice(from, 1);
      next.splice(to, 0, id);
      return next;
    });

  const add = (productId) =>
    modify(path, (current = []) => (current.includes(productId) || current.length >= max ? current : [...current, productId]));

  const listError = errors[path.join('.')] || ids.map((_, i) => errors[`${path.join('.')}.${i}`]).find(Boolean);
  const showingResults = search && results.term === search;

  return (
    <div className="space-y-3">
      <span className="field-label">Products ({ids.length}/{max})</span>
      {listError && <p className="field-msg-error">{listError}</p>}

      {ids.length === 0 ? (
        <p className="rounded-control border border-dashed border-line-strong px-4 py-5 text-center text-sm text-ink-muted">
          No products chosen yet. Search below to add some.
        </p>
      ) : (
        <ol className="divide-y divide-line rounded-control border border-line bg-paper-raised">
          {ids.map((id, index) => {
            const product = known[id];
            const unavailable = active.key === idsKey && !active.ids.has(id);
            return (
              <li key={id} className="flex items-center gap-3 px-3 py-2">
                <div className="h-12 w-9 shrink-0 overflow-hidden bg-paper-sunken">
                  {product?.images?.[0]?.url && (
                    <img src={product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{product?.name || 'Loading product…'}</p>
                  {unavailable ? (
                    <p className="text-xs text-warning">Not available in your store, so it won’t show</p>
                  ) : (
                    product && <p className="text-xs text-ink-muted">{formatPrice(product.price)}</p>
                  )}
                </div>
                <div className="flex items-center">
                  <button type="button" className="icon-btn h-11 w-11 disabled:opacity-30" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move ${product?.name || 'product'} up`}>
                    <ArrowUp size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-btn h-11 w-11 disabled:opacity-30" onClick={() => move(index, index + 1)} disabled={index === ids.length - 1} aria-label={`Move ${product?.name || 'product'} down`}>
                    <ArrowDown size={15} aria-hidden="true" />
                  </button>
                  <button type="button" className="icon-btn h-11 w-11 text-danger" onClick={() => modify(path, (current = []) => current.filter((x) => x !== id))} aria-label={`Remove ${product?.name || 'product'}`}>
                    <X size={15} aria-hidden="true" />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products to add"
          aria-label="Search products to add"
          className="field py-2.5 pl-9 text-sm"
        />
      </div>

      {showingResults && results.error && <Notice>We couldn’t search your products right now. Please try again.</Notice>}
      {showingResults && !results.error && (
        results.products.length === 0 ? (
          <p className="text-sm text-ink-muted">No products in your store match “{search}”.</p>
        ) : (
          <ul className="divide-y divide-line rounded-control border border-line bg-paper-raised">
            {results.products.map((product) => {
              const chosen = ids.includes(product._id);
              return (
                <li key={product._id} className="flex items-center gap-3 px-3 py-2">
                  <div className="h-12 w-9 shrink-0 overflow-hidden bg-paper-sunken">
                    {product.images?.[0]?.url && (
                      <img src={product.images[0].url} alt="" loading="lazy" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{product.name}</p>
                    <p className="text-xs text-ink-muted">{formatPrice(product.price)}</p>
                  </div>
                  <button
                    type="button"
                    className="btn-ghost btn-sm min-h-[44px]"
                    onClick={() => add(product._id)}
                    disabled={chosen || ids.length >= max}
                  >
                    {chosen ? 'Added' : (<><Plus size={13} aria-hidden="true" /> Add</>)}
                  </button>
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
