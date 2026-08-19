import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Data fetching with cancellation.
 *
 * `seq` guards against a slow earlier request resolving after a faster later
 * one and overwriting fresh data with stale data — the classic filter-flicker
 * bug on a product listing.
 */
export function useFetch(fetcher, deps = [], { skip = false } = {}) {
  const [data, setData] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState(null);
  const seq = useRef(0);

  const run = useCallback(async () => {
    const current = seq.current + 1;
    seq.current = current;

    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (seq.current !== current) return;

      // Endpoints that paginate return { data, meta }.
      if (result && typeof result === 'object' && 'data' in result && 'meta' in result) {
        setData(result.data);
        setMeta(result.meta);
      } else {
        setData(result);
        setMeta(null);
      }
    } catch (err) {
      if (seq.current !== current) return;
      setError(err.friendlyMessage || 'Something went wrong.');
    } finally {
      if (seq.current === current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (skip) { setLoading(false); return; }
    run();
     
  }, [run, skip]);

  return { data, meta, loading, error, refetch: run, setData };
}

/** Delays a rapidly-changing value — used so typing in search issues one request. */
export function useDebounced(value, delay = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);

  return debounced;
}

/** Closes menus/drawers when the user clicks or taps outside them. */
export function useClickOutside(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;

    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener, { passive: true });
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, active]);
}

/** Locks background scroll while a drawer or modal is open. */
export function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = original; };
  }, [locked]);
}

/**
 * SPA metadata.
 *
 * This is real, useful SEO for crawlers that execute JavaScript and for link
 * previews — but it is not equivalent to server-side rendering, and is not
 * presented as such.
 */
export function useDocumentMeta({ title, description, image, canonical, noIndex = false }) {
  useEffect(() => {
    const siteName = 'TOUCH';
    const fullTitle = title ? `${title} — ${siteName}` : `${siteName} — Considered clothing`;
    document.title = fullTitle;

    const setMeta = (selector, attr, key, content) => {
      if (!content) return;
      let el = document.head.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[property="og:title"]', 'property', 'og:title', fullTitle);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:image"]', 'property', 'og:image', image);
    setMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', fullTitle);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);
    setMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image);
    setMeta('meta[name="robots"]', 'name', 'robots', noIndex ? 'noindex,nofollow' : 'index,follow');

    const href = canonical || window.location.href.split('?')[0];
    let link = document.head.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }, [title, description, image, canonical, noIndex]);
}

/** Media query hook used to branch layout behaviour, not just styling. */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
