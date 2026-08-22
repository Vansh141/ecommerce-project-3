import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Search, Heart, ShoppingBag, User, ChevronRight, ChevronDown, LogOut,
  LayoutDashboard, Package, MapPin, LayoutGrid,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import {
  useClickOutside, useBodyScrollLock, useFocusTrap, useInertWhen,
} from '../../hooks';
import { Button } from '../ui';

/* ══════════════════════════════ Nav overflow ═════════════════════════════ */

/**
 * Decides how many category links fit on one line.
 *
 * Category names are editable in the admin panel, so their widths are not
 * known in advance — a fixed "show four links above 1280px" rule breaks the
 * moment someone renames a category. Instead the full row is rendered once
 * into a hidden measuring copy, and the real row shows as many links as
 * genuinely fit beside the logo; the rest move into a "More" menu. Nothing
 * ever wraps, compresses or collides.
 *
 * @param {object} railRef       Ref to the element the links must fit inside.
 * @param {object} measureRef    Ref to the hidden copy of the same links.
 * @param {number} fixedCount    Leading items that never move into "More".
 * @param {number} overflowCount Number of items that may move into "More".
 * @param {number} moreWidth     Width to reserve for the "More" trigger.
 */
function useVisibleCount(railRef, measureRef, fixedCount, overflowCount, moreWidth = 84) {
  const [visible, setVisible] = useState(overflowCount);

  const measure = useCallback(() => {
    const rail = railRef.current;
    const ghost = measureRef.current;
    if (!rail || !ghost) return;

    const available = rail.clientWidth;
    const widths = Array.from(ghost.children).map((child) => child.getBoundingClientRect().width);
    const gap = parseFloat(getComputedStyle(ghost).columnGap || '0') || 0;

    // The always-visible entry points are spent first; only what is left over
    // is available to the categories.
    let used = widths
      .slice(0, fixedCount)
      .reduce((sum, w, i) => sum + w + (i > 0 ? gap : 0), 0);

    let fits = 0;
    for (let i = fixedCount; i < widths.length; i += 1) {
      const next = used + gap + widths[i];
      // Every item but the last must also leave room for the "More" trigger.
      const needsMore = i < widths.length - 1;
      if (next + (needsMore ? gap + moreWidth : 0) > available) break;
      used = next;
      fits += 1;
    }

    setVisible(fits);
  }, [railRef, measureRef, fixedCount, moreWidth]);

  useLayoutEffect(() => {
    measure();

    // Both signals are needed. The observer catches the rail changing width
    // for reasons the window never sees (a scrollbar appearing, a zoom
    // change); the window listener catches the cases where the rail's own box
    // is remeasured without the observer being notified.
    window.addEventListener('resize', measure);

    const rail = railRef.current;
    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (rail && observer) observer.observe(rail);

    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [measure, railRef, overflowCount]);

  // Web fonts land after first paint and change every link's width.
  useEffect(() => {
    document.fonts?.ready?.then(measure).catch(() => {});
  }, [measure]);

  return Math.min(visible, overflowCount);
}

/* ══════════════════════════════ Pieces ═══════════════════════════════════ */

function CountBadge({ value }) {
  if (!value || value <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -right-0.5 -top-0.5 flex h-[1.125rem] min-w-[1.125rem] items-center
                 justify-center rounded-full bg-ink px-1 text-[10px] font-medium leading-none
                 text-paper ring-2 ring-paper"
    >
      {value > 99 ? '99+' : value}
    </span>
  );
}

/** Icon control with a consistent target, focus ring and desktop tooltip. */
function IconControl({ as: Tag = 'button', label, badge, children, className = '', ...rest }) {
  return (
    <div className="has-tip">
      <Tag className={`icon-btn ${className}`} aria-label={label} {...rest}>
        <span className="relative flex items-center justify-center">
          {children}
          <CountBadge value={badge} />
        </span>
      </Tag>
      <span className="tip" aria-hidden="true">{label}</span>
    </div>
  );
}


/** The signed-in / signed-out menu behind the account icon. */
function AccountMenu({ user, isAuthenticated, isAdmin, onLogout }) {
  return (
    <div
      role="menu"
      className="absolute right-0 top-full z-50 mt-2 w-60 animate-fade-up overflow-hidden
                 rounded-card border border-line bg-paper-raised shadow-pop"
    >
      {isAuthenticated ? (
        <>
          <div className="border-b border-line bg-paper-sunken px-4 py-3">
            <p className="truncate text-sm font-medium text-ink">{user.name}</p>
            <p className="truncate text-xs text-ink-muted">{user.email}</p>
          </div>
          <div className="p-1.5">
            {[
              { to: '/account', label: 'My account', icon: User },
              { to: '/orders', label: 'Orders', icon: Package },
              { to: '/account/addresses', label: 'Addresses', icon: MapPin },
              { to: '/wishlist', label: 'Wishlist', icon: Heart },
            ].map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                role="menuitem"
                className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm
                           text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
              >
                <Icon size={15} aria-hidden="true" />
                {label}
              </Link>
            ))}

            {isAdmin && (
              <>
                <div className="my-1.5 h-px bg-line" />
                <Link
                  to="/admin"
                  role="menuitem"
                  className="flex items-center gap-2.5 rounded-control px-3 py-2 text-sm
                             font-medium text-clay-deep transition-colors hover:bg-clay-faint"
                >
                  <LayoutDashboard size={15} aria-hidden="true" />
                  Admin panel
                </Link>
              </>
            )}

            <div className="my-1.5 h-px bg-line" />
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-2.5 rounded-control px-3 py-2
                         text-left text-sm text-danger transition-colors hover:bg-danger-faint"
            >
              <LogOut size={15} aria-hidden="true" />
              Sign out
            </button>
          </div>
        </>
      ) : (
        <div className="p-4">
          <p className="mb-3 text-sm leading-relaxed text-ink-muted">
            Sign in to track orders and save favourites.
          </p>
          <Button to="/login" size="sm" fullWidth>Sign in</Button>
          <Link
            to="/register"
            className="mt-2.5 block rounded-control py-1 text-center text-xs text-ink-muted hover:text-ink"
          >
            Create an account
          </Link>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════ Navbar ═══════════════════════════════════ */

export default function Navbar({ categories = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [query, setQuery] = useState('');

  const accountRef = useRef(null);
  const moreRef = useRef(null);
  const searchInputRef = useRef(null);
  const drawerRef = useRef(null);
  const drawerPanelRef = useRef(null);
  const navRailRef = useRef(null);
  const navGhostRef = useRef(null);

  useClickOutside(accountRef, () => setAccountOpen(false), accountOpen);
  useClickOutside(moreRef, () => setMoreOpen(false), moreOpen);
  useBodyScrollLock(drawerOpen);
  useFocusTrap(drawerPanelRef, drawerOpen);
  useInertWhen(drawerRef, !drawerOpen);

  // Any navigation closes every transient surface.
  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
    setSearchOpen(false);
    setMoreOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 40);
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setDrawerOpen(false);
      setSearchOpen(false);
      setAccountOpen(false);
      setMoreOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const submitSearch = (e) => {
    e.preventDefault();
    const term = query.trim();
    if (!term) return;
    navigate(`/shop?search=${encodeURIComponent(term)}`);
    setQuery('');
    setSearchOpen(false);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navCategories = useMemo(
    () => categories.filter((c) => c.showInNav !== false).slice(0, 8),
    [categories]
  );

  /**
   * "Shop all" is the one entry point that must always be reachable in a
   * single click; every category after it may move into "More". New arrivals,
   * dresses and the rest are real categories from the API, so none of them is
   * hardcoded here.
   */
  const overflowable = navCategories;
  const visibleCount = useVisibleCount(navRailRef, navGhostRef, 1, overflowable.length);
  const shown = overflowable.slice(0, visibleCount);
  const hidden = overflowable.slice(visibleCount);

  const isCategoryActive = (slug) =>
    location.pathname === '/shop' && new URLSearchParams(location.search).get('category') === slug;

  const onShopAll = location.pathname === '/shop' && !location.search;

  const accountMenuProps = { user, isAuthenticated, isAdmin, onLogout: handleLogout };

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-md">
        {/* Tier one. A three-column grid rather than two flexible halves: the
            centre column is exactly as wide as the wordmark, so the logo sits
            on the true optical centre whatever is beside it. */}
        <div className="shell">
          <div className="grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-3 lg:h-[4.5rem]">
            <div className="flex min-w-0 items-center">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="icon-btn -ml-3 lg:hidden"
                aria-label="Open menu"
                aria-expanded={drawerOpen}
                aria-controls="mobile-nav"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
            </div>

            <Link
              to="/"
              className="justify-self-center rounded-control px-1 transition-opacity hover:opacity-70"
              aria-label="TOUCH — home"
            >
              <span className="font-display text-xl font-medium uppercase leading-none tracking-luxe text-ink sm:text-2xl lg:text-[1.75rem]">
                Touch
              </span>
            </Link>

            <div className="flex items-center justify-end gap-0.5 sm:gap-1">
              <IconControl
                label="Search"
                onClick={() => setSearchOpen((v) => !v)}
                aria-expanded={searchOpen}
                type="button"
              >
                <Search size={19} aria-hidden="true" />
              </IconControl>

              <IconControl
                as={Link}
                to="/wishlist"
                label="Wishlist"
                badge={wishCount}
                className="hidden sm:inline-flex"
              >
                <Heart size={19} aria-hidden="true" />
              </IconControl>

              <div ref={accountRef} className="relative hidden sm:block">
                <IconControl
                  label="Account"
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <User size={19} aria-hidden="true" />
                </IconControl>

                {accountOpen && <AccountMenu {...accountMenuProps} />}
              </div>

              <IconControl as={Link} to="/cart" label="Bag" badge={cartCount} className="-mr-3">
                <ShoppingBag size={19} aria-hidden="true" />
              </IconControl>
            </div>
          </div>
        </div>

        {/* Tier two. Giving the categories their own full-width row is what
            keeps them on one line at laptop widths — beside a centred logo the
            nav is capped at half the header, which forces perfectly ordinary
            category names into an overflow menu. */}
        <div className="hidden border-t border-line/70 lg:block">
          <div className="shell">
            <nav
              ref={navRailRef}
              className="relative flex h-12 items-center justify-center gap-x-8 xl:gap-x-10"
              aria-label="Main"
            >
              {/* The clip is a safety net, not the layout mechanism: the
                  measurement above is what decides how many links render. If
                  it is ever momentarily stale — a font swapping in between
                  measure and paint — a surplus link is clipped rather than
                  allowed to widen the page. */}
              <div className="flex min-w-0 items-center gap-x-8 overflow-hidden xl:gap-x-10">
                <NavLink to="/shop" className="nav-link shrink-0" data-active={onShopAll}>
                  Shop all
                </NavLink>

                {shown.map((c) => (
                  <NavLink
                    key={c._id}
                    to={`/shop?category=${c.slug}`}
                    className="nav-link shrink-0"
                    data-active={isCategoryActive(c.slug)}
                  >
                    {c.name}
                  </NavLink>
                ))}
              </div>

              {hidden.length > 0 && (
                <div ref={moreRef} className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setMoreOpen((v) => !v)}
                    className="nav-link flex items-center gap-1"
                    aria-expanded={moreOpen}
                    aria-haspopup="menu"
                    data-active={hidden.some((c) => isCategoryActive(c.slug))}
                  >
                    More
                    <ChevronDown
                      size={13}
                      aria-hidden="true"
                      className={`transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {moreOpen && (
                    <div
                      role="menu"
                      className="absolute left-1/2 top-full z-50 mt-3 w-56 -translate-x-1/2 animate-fade-up
                                 rounded-card border border-line bg-paper-raised p-1.5 shadow-pop"
                    >
                      {hidden.map((c) => (
                        <Link
                          key={c._id}
                          to={`/shop?category=${c.slug}`}
                          role="menuitem"
                          className="block rounded-control px-3 py-2 text-xs font-medium uppercase
                                     tracking-wider2 text-ink-soft transition-colors
                                     hover:bg-paper-sunken hover:text-ink"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Hidden measuring copy — same typography, never painted. The
                  clipping wrapper matters: an unclipped ghost wider than the
                  nav would itself widen the document and cause exactly the
                  sideways scroll this component exists to prevent. Clipping
                  affects painting only, so the measured widths stay true. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 overflow-hidden"
              >
                <div
                  ref={navGhostRef}
                  className="invisible absolute left-0 top-0 flex gap-x-8 xl:gap-x-10"
                >
                  <span className="nav-link">Shop all</span>
                  {overflowable.map((c) => (
                    <span key={c._id} className="nav-link">{c.name}</span>
                  ))}
                </div>
              </div>
            </nav>
          </div>
        </div>

        {/* ── Search panel ── */}
        {searchOpen && (
          <div className="animate-fade-in border-t border-line bg-paper-raised">
            <div className="shell py-3.5 sm:py-4">
              <form onSubmit={submitSearch} role="search" className="flex items-center gap-2 sm:gap-3">
                <Search size={18} className="hidden shrink-0 text-ink-faint sm:block" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search dresses, linen, co-ords…"
                  aria-label="Search products"
                  className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink
                             placeholder:text-ink-faint focus:outline-none focus:ring-0"
                />
                <Button type="submit" size="sm" disabled={!query.trim()} className="shrink-0">
                  Search
                </Button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="icon-btn-sm -mr-2 shrink-0 text-ink-faint"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile navigation drawer ── */}
      <div
        ref={drawerRef}
        id="mobile-nav"
        className={`fixed inset-0 z-[60] lg:hidden ${drawerOpen ? '' : 'pointer-events-none'}`}
      >
        <div
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
        <div
          ref={drawerPanelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          tabIndex={-1}
          className={`absolute inset-y-0 left-0 flex w-[88%] max-w-[20rem] flex-col bg-paper-raised
                      shadow-pop transition-transform duration-300 ease-luxe ${
                        drawerOpen ? 'translate-x-0' : '-translate-x-full'
                      }`}
        >
          <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-5">
            <span className="font-display text-lg uppercase leading-none tracking-luxe">Touch</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="icon-btn -mr-3"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-5" aria-label="Mobile">
            <ul className="space-y-0.5">
              <li>
                <DrawerLink to="/shop" icon={LayoutGrid} emphasis>Shop all</DrawerLink>
              </li>
            </ul>

            {categories.length > 0 && (
              <>
                <p className="eyebrow px-3 pb-2 pt-6">Categories</p>
                <ul className="space-y-0.5">
                  {categories.map((c) => (
                    <li key={c._id}>
                      <DrawerLink to={`/shop?category=${c.slug}`}>{c.name}</DrawerLink>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="eyebrow px-3 pb-2 pt-6">Account</p>
            {isAuthenticated ? (
              <ul className="space-y-0.5">
                {[
                  { to: '/account', label: 'My account', icon: User },
                  { to: '/orders', label: 'Orders', icon: Package },
                  { to: '/account/addresses', label: 'Addresses', icon: MapPin },
                  {
                    to: '/wishlist',
                    label: `Wishlist${wishCount ? ` (${wishCount})` : ''}`,
                    icon: Heart,
                  },
                  ...(isAdmin ? [{ to: '/admin', label: 'Admin panel', icon: LayoutDashboard }] : []),
                ].map(({ to, label, icon }) => (
                  <li key={to}>
                    <DrawerLink to={to} icon={icon}>{label}</DrawerLink>
                  </li>
                ))}
              </ul>
            ) : (
              <>
                <ul className="space-y-0.5">
                  <li>
                    <DrawerLink to="/wishlist" icon={Heart}>
                      {`Wishlist${wishCount ? ` (${wishCount})` : ''}`}
                    </DrawerLink>
                  </li>
                  <li>
                    <DrawerLink to="/orders" icon={Package}>Orders</DrawerLink>
                  </li>
                </ul>
                <div className="px-3 pt-4">
                  <Button to="/login" fullWidth>Sign in</Button>
                  <Link
                    to="/register"
                    className="mt-2 block rounded-control py-2 text-center text-xs text-ink-muted hover:text-ink"
                  >
                    Create an account
                  </Link>
                </div>
              </>
            )}
          </nav>

          {isAuthenticated && (
            <div className="shrink-0 border-t border-line p-4 pb-safe">
              <p className="mb-2.5 truncate text-xs text-ink-muted">{user.email}</p>
              <Button variant="ghost" fullWidth onClick={handleLogout}>
                <LogOut size={14} aria-hidden="true" /> Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/** One row inside the mobile drawer — consistent height, target and chevron. */
function DrawerLink({ to, icon: Icon, emphasis = false, children }) {
  return (
    <Link
      to={to}
      className={`flex min-h-[44px] items-center gap-3 rounded-control px-3 py-2.5 text-sm
                  transition-colors hover:bg-paper-sunken ${
                    emphasis ? 'font-medium text-ink' : 'text-ink-soft hover:text-ink'
                  }`}
    >
      {Icon && <Icon size={16} className="shrink-0 text-ink-faint" aria-hidden="true" />}
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight size={15} className="shrink-0 text-ink-faint" aria-hidden="true" />
    </Link>
  );
}
