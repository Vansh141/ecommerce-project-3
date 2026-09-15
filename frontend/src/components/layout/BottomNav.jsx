import { Link, useLocation } from 'react-router-dom';
import { Home, LayoutGrid, Heart, User } from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';

/**
 * Mobile and tablet bottom navigation.
 *
 * Mounted only inside the storefront layout — never in admin — and hidden on
 * the cart and checkout, which own the bottom of the screen. The bag stays in
 * the header, where it is always visible.
 *
 * Account links to /account for everyone: a signed-out shopper is sent to
 * sign in by the existing route guard, with a redirect back.
 */
const ITEMS = [
  { to: '/', label: 'Home', icon: Home, isActive: (path) => path === '/' },
  {
    to: '/shop',
    label: 'Shop',
    icon: LayoutGrid,
    isActive: (path) => path.startsWith('/shop') || path.startsWith('/product/'),
  },
  { to: '/wishlist', label: 'Wishlist', icon: Heart, isActive: (path) => path.startsWith('/wishlist') },
  {
    to: '/account',
    label: 'Account',
    icon: User,
    isActive: (path) =>
      /^\/(account|orders|order-confirmed|login|register|forgot-password|reset-password)(\/|$)/.test(path),
  },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const { count: wishCount } = useWishlist();

  return (
    <nav
      aria-label="Primary"
      className="bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper-raised lg:hidden"
    >
      <ul className="mx-auto grid h-14 max-w-lg grid-cols-4">
        {ITEMS.map(({ to, label, icon: Icon, isActive }) => {
          const active = isActive(pathname);
          const badge = to === '/wishlist' && wishCount > 0 ? wishCount : 0;
          const accessibleLabel = badge
            ? `${label}, ${badge} ${badge === 1 ? 'item' : 'items'}`
            : undefined;

          return (
            <li key={to}>
              <Link
                to={to}
                aria-label={accessibleLabel}
                // "page" only for the exact destination; a product page inside
                // Shop, or sign-in under Account, is marked as part of the section.
                aria-current={pathname === to ? 'page' : active ? 'true' : undefined}
                onClick={() => {
                  // Tapping the tab you are already on returns to the top.
                  if (pathname !== to) return;
                  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
                  window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
                }}
                className={`relative flex h-full flex-col items-center justify-center gap-1 text-[0.6875rem]
                            leading-none transition-colors duration-200 ${
                              active ? 'font-medium text-ink' : 'text-ink-muted hover:text-ink'
                            }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute inset-x-6 top-0 h-0.5 bg-ink transition-opacity duration-300 ${
                    active ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <span className="relative flex items-center justify-center">
                  <Icon size={20} aria-hidden="true" />
                  {badge > 0 && (
                    <span
                      aria-hidden="true"
                      className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center
                                 rounded-full bg-ink px-1 text-[10px] font-medium leading-none tabular-nums
                                 text-paper ring-2 ring-paper-raised"
                    >
                      {badge > 99 ? '99+' : badge}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
