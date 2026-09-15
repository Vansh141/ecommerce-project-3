import { useCallback, useSyncExternalStore } from 'react';

const supported = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/**
 * Whether a media query matches, for layout decisions CSS cannot make — such
 * as the order sections are rendered in.
 *
 * Read synchronously during render, so the first paint already has the right
 * answer, and kept current as the viewport changes.
 */
export function useMediaQuery(query) {
  const subscribe = useCallback(
    (notify) => {
      if (!supported()) return () => {};
      const list = window.matchMedia(query);
      list.addEventListener?.('change', notify);
      return () => list.removeEventListener?.('change', notify);
    },
    [query]
  );
  const getSnapshot = () => supported() && window.matchMedia(query).matches;

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

export default useMediaQuery;
