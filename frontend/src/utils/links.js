/**
 * Links that come from admin-managed content.
 *
 * The API only accepts a same-site path (`/shop?category=festive-wear`) or a
 * full `https://` address. These helpers apply the same rule again at render
 * time: a site path is handed to the router, an https link opens in a new tab
 * without access to this window, and anything else is not rendered as a link.
 */
const SITE_PATH = /^\/(?![/\\])\S*$/;
const HTTPS_URL = /^https:\/\/\S+$/i;

/** Props for a `Button` or anchor, or `null` when the link is unusable. */
export function contentLinkProps(href) {
  if (typeof href !== 'string') return null;
  if (SITE_PATH.test(href)) return { to: href };
  if (HTTPS_URL.test(href)) return { href, target: '_blank', rel: 'noopener noreferrer' };
  return null;
}
