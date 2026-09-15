import { useEffect, useMemo, useState } from 'react';
import { productApi } from '../api/endpoints';

/**
 * Products for the homepage's product sections, in one request.
 *
 * Sections describe where their products come from; the API resolves them all
 * together. Results are kept for a short time in memory only — never in
 * localStorage — so prices and stock stay current, while moving between pages
 * does not repeat the request.
 */

const CACHE_MS = 30 * 1000;
/** The API resolves at most this many sections per request. */
const BATCH = 12;
const cache = new Map();

/** Extra products fetched for a section that skips ones already shown above it. */
const requestLimit = (section) =>
  Math.min(24, (Number(section.limit) || 8) + (section.skipShownProducts ? 8 : 0));

function requestFor(section) {
  const request = { id: section.id, source: section.source, limit: requestLimit(section) };
  if (section.source === 'category') request.category = section.categoryId;
  if (section.source === 'manual') request.products = section.productIds || [];
  if (section.fallbackToNewest) request.fallbackToNewest = true;
  return request;
}

const isRequestable = (request) =>
  (request.source !== 'category' || /^[a-f0-9]{24}$/i.test(request.category || '')) &&
  (request.source !== 'manual' || request.products.length > 0);

function load(key) {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.promise;

  const requests = JSON.parse(key);
  const batches = [];
  for (let i = 0; i < requests.length; i += BATCH) batches.push(requests.slice(i, i + BATCH));

  const promise = Promise.all(batches.map((batch) => productApi.sections(batch))).then((responses) =>
    Object.assign({}, ...responses.map((response) => response?.sections || {}))
  );
  cache.set(key, { at: Date.now(), promise });
  promise.catch(() => cache.delete(key));
  return promise;
}

/**
 * @param {object[]} sections product sections, in page order
 * @returns {{ data: object|null, loading: boolean, error: string|null }}
 *   `data` maps a section id to `{ products, total, source, categorySlug? }`.
 */
export function useSectionProducts(sections, { enabled = true } = {}) {
  const key = useMemo(() => JSON.stringify(sections.map(requestFor).filter(isRequestable)), [sections]);
  const [state, setState] = useState({ key: null, data: null, error: null });
  const empty = key === '[]';

  useEffect(() => {
    if (!enabled || empty) return undefined;
    let cancelled = false;

    load(key)
      .then((data) => {
        if (!cancelled) setState({ key, data, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ key, data: null, error: err.friendlyMessage || 'We could not load these products.' });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, empty, key]);

  if (empty) return { data: {}, loading: false, error: null };
  const current = state.key === key;
  return {
    data: current ? state.data : null,
    loading: !current,
    error: current ? state.error : null,
  };
}
