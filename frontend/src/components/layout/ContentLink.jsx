import { Link } from 'react-router-dom';

/**
 * Links the store owner writes in Admin → Storefront.
 *
 * A link is either a page on this site (`/shop`, `/shop?category=sarees`) or a
 * full `https://` address — the API accepts nothing else. A site path is routed
 * by the app; an outside address opens in a new tab, so a shopper never loses
 * the store.
 */

export const isExternalLink = (to) => /^https?:\/\//i.test(String(to || ''));

export default function ContentLink({ to, children, ...rest }) {
  if (isExternalLink(to)) {
    return (
      <a href={to} target="_blank" rel="noopener noreferrer" {...rest}>
        {children}
      </a>
    );
  }
  return <Link to={to} {...rest}>{children}</Link>;
}

/**
 * Whether a link points at the page being viewed, so it can be marked as the
 * current page. A link with no filters — `/shop` — is current only on that
 * page with nothing filtered, which is why "Shop all" stops being highlighted
 * once a category or the sale filter is on.
 */
export function isCurrentLink(to, location) {
  if (!to || isExternalLink(to)) return false;
  const [path, query = ''] = String(to).split('?');
  if (path !== location.pathname) return false;
  const target = [...new URLSearchParams(query)];
  const current = new URLSearchParams(location.search);
  if (target.length === 0) return !location.search;
  return target.every(([key, value]) => current.get(key) === value);
}

/** The links of an edited list that are switched on and actually filled in. */
export const usableLinks = (links) =>
  (Array.isArray(links) ? links : []).filter((link) => link && link.enabled !== false && link.label && link.link);
