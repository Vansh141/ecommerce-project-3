import { useEffect, useRef, useState } from 'react';
import { storefrontApi } from '../api/endpoints';

/**
 * Storefront content is low-frequency data, so it is fetched once and reused.
 *
 * - One request per page load at most, shared by everything that asks for it.
 * - The last published content is kept in localStorage, so a returning visitor
 *   sees the current homepage immediately while it is revalidated quietly.
 * - A first-time visitor waits briefly for the content (the hero keeps its
 *   size with placeholders meanwhile). If the API is slow or down, the built-in
 *   homepage is shown instead and the content is kept for the next visit, so
 *   the page never swaps its hero in front of the shopper.
 */

const STORAGE_KEY = 'touch:storefront:v2';
/**
 * Content younger than this is not revalidated again. Kept short, together
 * with the API's 30-second cache, so a publish reaches visitors within about
 * a minute — which is what the admin panel tells the store owner.
 */
const FRESH_MS = 30 * 1000;
/** How long a first-time visitor waits before the built-in content is used. */
const WAIT_MS = 2500;

let memory = null;
let inflight = null;

function readStored() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return parsed && typeof parsed === 'object' && 'content' in parsed ? parsed : null;
  } catch {
    return null;
  }
}

function writeStored(entry) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entry));
  } catch {
    // Private browsing or a full quota: the in-memory copy still works.
  }
}

function fetchPublished() {
  if (!inflight) {
    inflight = storefrontApi
      .published()
      .then((data) => {
        const entry = { content: data?.content ?? null, version: data?.version ?? 0, fetchedAt: Date.now() };
        memory = entry;
        writeStored(entry);
        return entry;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/**
 * Published content for the storefront layout.
 * `status` is `loading` (first visit, still waiting), `ready` or `fallback`.
 * `content` is the published document, or `null` for "use the built-in homepage".
 */
export function usePublishedStorefront({ skip = false } = {}) {
  const [state, setState] = useState(() => {
    const cached = memory || readStored();
    if (cached) {
      memory = cached;
      return { status: 'ready', content: cached.content, version: cached.version };
    }
    return { status: 'loading', content: null, version: null };
  });
  const initial = useRef(state);

  useEffect(() => {
    if (skip) return undefined;

    const cached = memory;
    if (cached && Date.now() - (cached.fetchedAt || 0) < FRESH_MS) return undefined;

    let cancelled = false;
    let settled = initial.current.status !== 'loading';

    const timer = settled
      ? null
      : setTimeout(() => {
          if (cancelled || settled) return;
          settled = true;
          setState({ status: 'fallback', content: null, version: null });
        }, WAIT_MS);

    fetchPublished()
      .then((entry) => {
        if (cancelled) return;
        if (!settled) {
          settled = true;
          setState({ status: 'ready', content: entry.content, version: entry.version });
        } else if (initial.current.status === 'ready' && entry.version !== initial.current.version) {
          // Published again since the cached copy: show the current content.
          setState({ status: 'ready', content: entry.content, version: entry.version });
        }
      })
      .catch(() => {
        if (cancelled || settled) return;
        settled = true;
        setState({ status: 'fallback', content: null, version: null });
      })
      .finally(() => clearTimeout(timer));

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [skip]);

  return state;
}

/**
 * The saved draft, for the admin preview page only. The endpoint behind it
 * requires an admin session; `enabled` stays false until one is confirmed.
 */
export function useDraftStorefront(enabled) {
  const [state, setState] = useState({ status: 'loading', content: null, error: null });

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    storefrontApi
      .admin()
      .then((data) => {
        if (cancelled) return;
        setState({ status: 'ready', content: data?.draft ?? data?.published ?? null, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ status: 'fallback', content: null, error: err.friendlyMessage || 'The draft could not be loaded.' });
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return state;
}
