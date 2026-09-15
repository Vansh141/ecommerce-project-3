import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Search, Heart, ShoppingBag, User, ChevronRight, ChevronDown, LogOut,
  LayoutDashboard, Package, MapPin, LayoutGrid, Sparkles, Tag, Truck, MessageCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import {
  useClickOutside, useBodyScrollLock, useFocusTrap, useInertWhen,
} from '../../hooks';
import { shoppableCategories } from '../../utils/categories';
import { Button } from '../ui';
import Wordmark from './Wordmark';

/* ══════════════════════════════ Nav overflow ═════════════════════════════ */

/**
 * Decides how many category links fit in the desktop header, and whether the
 * navigation can sit on the header's true centre.
 *
 * Category names are editable in the admin panel, so their widths are not
 * known in advance. The full row is rendered once into a hidden measuring
 * copy, and the real row shows as many categories as genuinely fit beside the
 * always-visible links; the rest move into a "More" menu. Nothing ever wraps,
 * compresses or collides.
 *
 * The measuring copy lists the fixed links first, then every category, then
 * the "More" trigger itself (marked `data-more`), so the space reserved for
 * "More" is its real rendered width rather than a guess.
 *
 * The space comes from the header row and the zones either side of the
 * navigation, never from the navigation itself: the navigation is only as
 * wide as the links it already shows, so measuring it could keep or shrink
 * the count but never let a category back in. On the true centre the
 * navigation may use the row less the wider side zone on both sides. If not
 * even the always-visible links fit that, or centring in the space between
 * the brand and the utilities would show more categories, it is centred in
 * that space instead.
 *
 * @param {object} options
 * @param {object} options.rowRef        Ref to the header row holding all three zones.
 * @param {object} options.brandRef      Ref to the brand zone.
 * @param {object} options.actionsRef    Ref to the utilities zone.
 * @param {object} options.measureRef    Ref to the hidden copy of the links.
 * @param {number} options.fixedCount    Leading measuring items that never move into "More".
 * @param {number} options.overflowCount Number of items that may move into "More".
 * @returns {{ visibleCount: number, centred: boolean }}
 */
function useNavLayout({ rowRef, brandRef, actionsRef, measureRef, fixedCount, overflowCount }) {
  const [visible, setVisible] = useState(overflowCount);
  const [centred, setCentred] = useState(true);

  const measure = useCallback(() => {
    const row = rowRef.current;
    const brand = brandRef.current;
    const actions = actionsRef.current;
    const ghost = measureRef.current;
    if (!row || !brand || !actions || !ghost) return;

    const children = Array.from(ghost.children);
    const moreTrigger = children.find((child) => child.hasAttribute('data-more'));
    const widths = children
      .filter((child) => child !== moreTrigger)
      .map((child) => child.getBoundingClientRect().width);
    const moreWidth = moreTrigger ? moreTrigger.getBoundingClientRect().width : 84;
    const gap = parseFloat(getComputedStyle(ghost).columnGap || '0') || 0;

    const fixedWidth = widths
      .slice(0, fixedCount)
      .reduce((sum, w, i) => sum + w + (i > 0 ? gap : 0), 0);
    const narrowest = fixedWidth + (widths.length > fixedCount ? gap + moreWidth : 0);

    const rowWidth = row.getBoundingClientRect().width;
    const zoneGap = parseFloat(getComputedStyle(row).columnGap || '0') || 0;
    const brandWidth = brand.getBoundingClientRect().width;
    const actionsWidth = actions.getBoundingClientRect().width;
    const onCentre = rowWidth - 2 * Math.max(brandWidth, actionsWidth) - 2 * zoneGap;
    const between = rowWidth - brandWidth - actionsWidth - 2 * zoneGap;

    // The always-visible links are spent first; only what is left over is
    // available to the categories.
    const countWithin = (available) => {
      let used = fixedWidth;
      let fits = 0;
      for (let i = fixedCount; i < widths.length; i += 1) {
        const next = used + gap + widths[i];
        // Every item but the last must also leave room for the "More" trigger.
        const needsMore = i < widths.length - 1;
        if (next + (needsMore ? gap + moreWidth : 0) > available) break;
        used = next;
        fits += 1;
      }
      return fits;
    };

    // The true centre wins unless centring between the zones shows more categories
    // (on wide screens the open search field makes the side zones very unequal).
    const onCentreCount = narrowest <= onCentre ? countWithin(onCentre) : -1;
    const betweenCount = countWithin(between);
    const useCentre = onCentreCount >= betweenCount;

    setVisible(useCentre ? onCentreCount : betweenCount);
    setCentred(useCentre);
  }, [rowRef, brandRef, actionsRef, measureRef, fixedCount]);

  useLayoutEffect(() => {
    measure();

    // The window listener catches plain resizes; the observer catches the row
    // or a side zone changing width for reasons the window never sees (the
    // inline search appearing, the wordmark resizing), and the measuring copy
    // changing width when a web font swaps in. None of these depend on the
    // count, so a measurement never triggers another.
    window.addEventListener('resize', measure);

    const observer =
      typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    if (observer) {
      [rowRef, brandRef, actionsRef, measureRef].forEach((ref) => {
        if (ref.current) observer.observe(ref.current);
      });
    }

    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [measure, rowRef, brandRef, actionsRef, measureRef, overflowCount]);

  // Web fonts land after first paint and change every link's width.
  useEffect(() => {
    document.fonts?.ready?.then(measure).catch(() => {});
  }, [measure]);

  return { visibleCount: Math.min(visible, overflowCount), centred };
}

/* ══════════════════════════════ Pieces ═══════════════════════════════════ */

function CountBadge({ value }) {
  if (!value || value <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center
                 rounded-full bg-ink px-1 text-[10px] font-medium leading-none tabular-nums
                 text-paper ring-2 ring-paper"
    >
      {value > 99 ? '99+' : value}
    </span>
  );
}

const countLabel = (label, count, noun) =>
  count > 0 ? `${label}, ${count} ${count === 1 ? noun : `${noun}s`}` : label;

/** Icon control with a consistent target, focus ring and desktop tooltip. */
function IconControl({ as: Tag = 'button', label, tip = label, badge, children, className = '', ...rest }) {
  return (
    <div className="has-tip">
      <Tag className={`icon-btn ${className}`} aria-label={label} {...rest}>
        <span className="relative flex items-center justify-center">
          {children}
          <CountBadge value={badge} />
        </span>
      </Tag>
      <span className="tip" aria-hidden="true">{tip}</span>
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
                className="flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm
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
                  className="flex items-center gap-2.5 rounded-control px-3 py-2.5 text-sm
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
              className="flex w-full items-center gap-2.5 rounded-control px-3 py-2.5
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
            className="mt-2 flex min-h-[44px] items-center justify-center rounded-control text-sm
                       text-ink-muted hover:text-ink"
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
  const [inlineQuery, setInlineQuery] = useState('');

  const accountRef = useRef(null);
  const moreRef = useRef(null);
  const searchInputRef = useRef(null);
  const drawerRef = useRef(null);
  const drawerPanelRef = useRef(null);
  const headerRowRef = useRef(null);
  const brandRef = useRef(null);
  const actionsRef = useRef(null);
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

  const runSearch = (raw) => {
    const term = raw.trim();
    if (!term) return false;
    navigate(`/shop?search=${encodeURIComponent(term)}`);
    return true;
  };

  const submitSearch = (e) => {
    e.preventDefault();
    if (!runSearch(query)) return;
    setQuery('');
    setSearchOpen(false);
  };

  const submitInlineSearch = (e) => {
    e.preventDefault();
    if (runSearch(inlineQuery)) setInlineQuery('');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Only categories that are active, allowed in navigation and hold products.
  const navCategories = useMemo(() => shoppableCategories(categories), [categories]);

  /**
   * Three links are always one click away: Shop all, New arrivals and Sale.
   * New arrivals and Sale are filters on the catalogue rather than categories,
   * so they work whatever categories exist. Every category may move into
   * "More" when space runs out.
   */
  const FIXED_LINKS = 3;
  const { visibleCount, centred: navCentred } = useNavLayout({
    rowRef: headerRowRef,
    brandRef,
    actionsRef,
    measureRef: navGhostRef,
    fixedCount: FIXED_LINKS,
    overflowCount: navCategories.length,
  });
  const shown = navCategories.slice(0, visibleCount);
  const hidden = navCategories.slice(visibleCount);

  const params = new URLSearchParams(location.search);
  const onShop = location.pathname === '/shop';
  const isCategoryActive = (slug) => onShop && params.get('category') === slug;
  const onShopAll = onShop && !location.search;
  const onNewArrivals = onShop && params.get('newArrival') === 'true';
  const onSale = onShop && params.get('onSale') === 'true';

  const accountMenuProps = { user, isAuthenticated, isAdmin, onLogout: handleLogout };
  const wishLabel = countLabel('Wishlist', wishCount, 'item');
  const bagLabel = countLabel('Bag', cartCount, 'item');

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-paper/95 backdrop-blur-md">
        <div className="shell max-[374px]:px-4">
          {/* Phones and tablets: a three-column grid, so the wordmark sits on
              the true optical centre whatever is beside it. Desktop: brand,
              navigation and utilities as three zones, the navigation on the
              header's true centre whenever the wider side zone leaves room
              (see useNavLayout). The side columns never shrink below their
              content, so a momentarily stale count clips the navigation
              rather than running it into the wordmark or the icons. */}
          <div
            ref={headerRowRef}
            data-nav={navCentred ? 'centre' : 'between'}
            className="grid h-14 grid-cols-[1fr_auto_1fr] items-center lg:h-[4.5rem] lg:gap-x-8
                       lg:grid-cols-[minmax(max-content,1fr)_auto_minmax(max-content,1fr)]
                       lg:data-[nav=between]:grid-cols-[max-content_minmax(0,1fr)_max-content]"
          >
            <div className="flex min-w-0 items-center lg:hidden">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="icon-btn -ml-3"
                aria-label="Open menu"
                aria-expanded={drawerOpen}
                aria-controls="mobile-nav"
              >
                <Menu size={20} aria-hidden="true" />
              </button>
            </div>

            <Link
              ref={brandRef}
              to="/"
              className="justify-self-center rounded-control px-1 transition-opacity hover:opacity-70 lg:justify-self-start"
              aria-label="TOUCHH — home"
            >
              <Wordmark className="text-[1.0625rem] min-[375px]:text-[1.1875rem] sm:text-2xl lg:text-[1.625rem]" />
            </Link>

            <nav
              className="relative hidden h-full min-w-0 max-w-full items-center justify-self-center gap-x-4
                         lg:flex xl:gap-x-6 2xl:gap-x-7"
              aria-label="Main"
            >
              {/* The clip is a safety net, not the layout mechanism: the
                  measurement above is what decides how many links render. If
                  it is ever momentarily stale — a font swapping in between
                  measure and paint — a surplus link is clipped rather than
                  allowed to widen the page. */}
              <div className="flex min-w-0 items-center gap-x-4 overflow-hidden xl:gap-x-6 2xl:gap-x-7">
                <Link
                  to="/shop"
                  className="nav-link shrink-0 focus-visible:ring-inset focus-visible:ring-offset-0"
                  data-active={onShopAll}
                  aria-current={onShopAll ? 'page' : undefined}
                >
                  Shop all
                </Link>
                <Link
                  to="/shop?newArrival=true"
                  className="nav-link shrink-0 focus-visible:ring-inset focus-visible:ring-offset-0"
                  data-active={onNewArrivals}
                  aria-current={onNewArrivals ? 'page' : undefined}
                >
                  New arrivals
                </Link>

                {shown.map((c) => (
                  <Link
                    key={c._id}
                    to={`/shop?category=${c.slug}`}
                    className="nav-link shrink-0 focus-visible:ring-inset focus-visible:ring-offset-0"
                    data-active={isCategoryActive(c.slug)}
                    aria-current={isCategoryActive(c.slug) ? 'page' : undefined}
                  >
                    {c.name}
                  </Link>
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
                          className="block rounded-control px-3 py-2.5 text-sm text-ink-soft
                                     transition-colors hover:bg-paper-sunken hover:text-ink"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Link
                to="/shop?onSale=true"
                className="nav-link nav-link-sale shrink-0"
                data-active={onSale}
                aria-current={onSale ? 'page' : undefined}
              >
                Sale
              </Link>

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
                  // w-max: an absolutely positioned flex row is otherwise capped
                  // at its container's width, which shrinks every item and
                  // under-measures them — letting one category too many in.
                  className="invisible absolute left-0 top-0 flex w-max gap-x-4 xl:gap-x-6 2xl:gap-x-7"
                >
                  <span className="nav-link">Shop all</span>
                  <span className="nav-link">New arrivals</span>
                  <span className="nav-link nav-link-sale">Sale</span>
                  {navCategories.map((c) => (
                    <span key={c._id} className="nav-link">{c.name}</span>
                  ))}
                  <span data-more="" className="nav-link flex items-center gap-1">
                    More <ChevronDown size={13} />
                  </span>
                </div>
              </div>
            </nav>

            {/* justify-self-end keeps this zone as wide as its icons, which is
                the width the navigation measurement relies on. */}
            <div ref={actionsRef} className="flex items-center justify-end lg:justify-self-end">
              {/* Wide desktops: search stays open in the header. Narrower, the
                  field would take the room the centred navigation needs. */}
              <form
                onSubmit={submitInlineSearch}
                role="search"
                className="relative mr-2 hidden 2xl:block"
              >
                <label htmlFor="header-search" className="sr-only">Search products</label>
                <Search
                  size={15}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-muted"
                  aria-hidden="true"
                />
                <input
                  id="header-search"
                  type="search"
                  value={inlineQuery}
                  onChange={(e) => setInlineQuery(e.target.value)}
                  placeholder="Search products"
                  className="h-10 w-44 rounded-full border border-line-strong bg-paper-raised pl-10 pr-4
                             text-sm text-ink transition-colors placeholder:text-ink-faint
                             focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
                />
              </form>

              <IconControl
                label="Search"
                onClick={() => setSearchOpen((v) => !v)}
                aria-expanded={searchOpen}
                type="button"
                className="2xl:hidden"
              >
                <Search size={19} aria-hidden="true" />
              </IconControl>

              <IconControl as={Link} to="/wishlist" label={wishLabel} tip="Wishlist" badge={wishCount}>
                <Heart size={19} aria-hidden="true" />
              </IconControl>

              {/* On phones and tablets the account lives in the bottom navigation. */}
              <div ref={accountRef} className="relative hidden lg:block">
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

              <IconControl as={Link} to="/cart" label={bagLabel} tip="Bag" badge={cartCount} className="-mr-3">
                <ShoppingBag size={19} aria-hidden="true" />
              </IconControl>
            </div>
          </div>
        </div>

        {/* ── Search panel (everything below wide desktops) ── */}
        {searchOpen && (
          <div className="animate-fade-in border-t border-line bg-paper-raised">
            <div className="shell py-3 sm:py-4">
              <form onSubmit={submitSearch} role="search" className="flex items-center gap-2 sm:gap-3">
                <Search size={18} className="hidden shrink-0 text-ink-muted sm:block" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search the collection"
                  aria-label="Search products"
                  className="min-w-0 flex-1 rounded-control border-0 bg-transparent px-1 py-2 text-base text-ink
                             placeholder:text-ink-faint focus:outline-none focus:ring-1 focus:ring-ink"
                />
                <Button type="submit" size="sm" disabled={!query.trim()} className="shrink-0">
                  Search
                </Button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="icon-btn -mr-3 shrink-0 text-ink-muted"
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
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-5">
            <Wordmark className="text-lg" />
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="icon-btn -mr-3"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto overscroll-contain px-3 py-4" aria-label="Mobile">
            <ul className="space-y-0.5">
              <li><DrawerLink to="/shop" icon={LayoutGrid} emphasis>Shop all</DrawerLink></li>
              <li><DrawerLink to="/shop?newArrival=true" icon={Sparkles} emphasis>New arrivals</DrawerLink></li>
              <li><DrawerLink to="/shop?onSale=true" icon={Tag} emphasis>Sale</DrawerLink></li>
            </ul>

            {navCategories.length > 0 && (
              <>
                <p className="px-3 pb-1.5 pt-6 text-xs font-medium text-ink-muted">Categories</p>
                <ul className="space-y-0.5">
                  {navCategories.map((c) => (
                    <li key={c._id}>
                      <DrawerLink to={`/shop?category=${c.slug}`}>{c.name}</DrawerLink>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <p className="px-3 pb-1.5 pt-6 text-xs font-medium text-ink-muted">Account</p>
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
                    className="mt-1 flex min-h-[44px] items-center justify-center rounded-control text-sm
                               text-ink-muted hover:text-ink"
                  >
                    Create an account
                  </Link>
                </div>
              </>
            )}

            <p className="px-3 pb-1.5 pt-6 text-xs font-medium text-ink-muted">Help</p>
            <ul className="space-y-0.5">
              <li><DrawerLink to="/shipping-returns" icon={Truck}>Shipping &amp; returns</DrawerLink></li>
              <li><DrawerLink to="/contact" icon={MessageCircle}>Contact us</DrawerLink></li>
            </ul>
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
      {Icon && <Icon size={16} className="shrink-0 text-ink-muted" aria-hidden="true" />}
      <span className="min-w-0 flex-1">{children}</span>
      <ChevronRight size={15} className="shrink-0 text-ink-faint" aria-hidden="true" />
    </Link>
  );
}
