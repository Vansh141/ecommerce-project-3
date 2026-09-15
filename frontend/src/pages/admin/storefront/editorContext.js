import { createContext, useContext } from 'react';

/**
 * Shared state for the homepage builder: the content being edited, field
 * errors from the API, the update function, and lookups every editor needs.
 */
export const EditorContext = createContext(null);
export const useEditor = () => useContext(EditorContext);

export const getIn = (obj, path) => path.reduce((node, key) => (node == null ? undefined : node[key]), obj);

/** Immutable update at `path`, creating objects or arrays on the way. */
export function setIn(obj, [key, ...rest], value) {
  const current = obj == null ? (typeof key === 'number' ? [] : {}) : obj;
  const next = rest.length ? setIn(current[key], rest, value) : value;
  if (Array.isArray(current)) return current.map((item, index) => (index === key ? next : item));
  return { ...current, [key]: next };
}

export const LINK_HINT = 'A page on this site, like /shop or /shop?category=festive-wear, or a full https:// address.';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
