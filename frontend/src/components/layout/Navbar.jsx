import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Menu, X, Search, Heart, ShoppingBag, User, ChevronRight, LogOut,
  LayoutDashboard, Package, MapPin,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useClickOutside, useBodyScrollLock } from '../../hooks';
import { Button } from '../ui';

export default function Navbar({ categories = [] }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const { count: cartCount } = useCart();
  const { count: wishCount } = useWishlist();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState('');

  const accountRef = useRef(null);
  const searchInputRef = useRef(null);

  useClickOutside(accountRef, () => setAccountOpen(false), accountOpen);
  useBodyScrollLock(drawerOpen);

  // Any navigation closes every transient surface.
  useEffect(() => {
    setDrawerOpen(false);
    setAccountOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 40);
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setDrawerOpen(false); setSearchOpen(false); setAccountOpen(false); }
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

  const navCategories = categories.filter((c) => c.showInNav !== false).slice(0, 6);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const iconBtn =
    'relative flex h-10 w-10 items-center justify-center text-ink-soft transition-colors hover:text-ink';

  const CountBadge = ({ value }) =>
    value > 0 ? (
      <span
        className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full
                   bg-ink px-1 text-[10px] font-medium leading-none text-paper"
      >
        {value > 99 ? '99+' : value}
      </span>
    ) : null;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="shell">
          <div className="flex h-16 items-center justify-between gap-4">
            {/* ── Left ── */}
            <div className="flex flex-1 items-center gap-1">
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className={`${iconBtn} -ml-2 lg:hidden`}
                aria-label="Open menu"
                aria-expanded={drawerOpen}
              >
                <Menu size={20} />
              </button>

              <nav className="hidden items-center gap-7 lg:flex" aria-label="Main">
                <NavLink to="/shop" className="nav-link" data-active={location.pathname === '/shop'}>
                  Shop All
                </NavLink>
                {navCategories.map((c) => (
                  <NavLink
                    key={c._id}
                    to={`/shop?category=${c.slug}`}
                    className="nav-link"
                    data-active={location.search.includes(`category=${c.slug}`)}
                  >
                    {c.name}
                  </NavLink>
                ))}
              </nav>
            </div>

            {/* ── Logo ── */}
            <Link
              to="/"
              className="shrink-0 text-center transition-opacity hover:opacity-70"
              aria-label="TOUCH — home"
            >
              <span className="font-display text-xl font-medium uppercase tracking-luxe text-ink sm:text-2xl">
                Touch
              </span>
            </Link>

            {/* ── Right ── */}
            <div className="flex flex-1 items-center justify-end gap-0.5">
              <button
                type="button"
                onClick={() => setSearchOpen((v) => !v)}
                className={iconBtn}
                aria-label="Search products"
                aria-expanded={searchOpen}
              >
                <Search size={19} />
              </button>

              <Link to="/wishlist" className={`${iconBtn} hidden sm:flex`} aria-label={`Wishlist, ${wishCount} items`}>
                <Heart size={19} />
                <CountBadge value={wishCount} />
              </Link>

              {/* Account: hover-intent on desktop, tap on touch devices. */}
              <div ref={accountRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setAccountOpen((v) => !v)}
                  className={iconBtn}
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                >
                  <User size={19} />
                </button>

                {accountOpen && (
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
                            onClick={handleLogout}
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
                        <p className="mb-3 text-sm text-ink-muted">
                          Sign in to track orders and save favourites.
                        </p>
                        <Button to="/login" size="sm" fullWidth>Sign in</Button>
                        <Link
                          to="/register"
                          className="mt-2.5 block text-center text-xs text-ink-muted hover:text-ink"
                        >
                          Create an account
                        </Link>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Link to="/cart" className={`${iconBtn} -mr-2`} aria-label={`Bag, ${cartCount} items`}>
                <ShoppingBag size={19} />
                <CountBadge value={cartCount} />
              </Link>
            </div>
          </div>
        </div>

        {/* ── Search bar ── */}
        {searchOpen && (
          <div className="animate-fade-in border-t border-line bg-paper-raised">
            <div className="shell py-4">
              <form onSubmit={submitSearch} role="search" className="flex items-center gap-3">
                <Search size={18} className="shrink-0 text-ink-faint" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for dresses, linen, co-ords…"
                  aria-label="Search products"
                  className="flex-1 border-0 bg-transparent p-0 text-base text-ink
                             placeholder:text-ink-faint focus:outline-none focus:ring-0"
                />
                <Button type="submit" size="sm" disabled={!query.trim()}>Search</Button>
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  aria-label="Close search"
                  className="p-1 text-ink-faint hover:text-ink"
                >
                  <X size={18} />
                </button>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* ── Mobile drawer ── */}
      <div
        className={`fixed inset-0 z-[60] lg:hidden ${drawerOpen ? '' : 'pointer-events-none'}`}
        aria-hidden={!drawerOpen}
      >
        <div
          className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 ${
            drawerOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={() => setDrawerOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          className={`absolute inset-y-0 left-0 flex w-[86%] max-w-xs flex-col bg-paper-raised
                      shadow-pop transition-transform duration-300 ease-luxe ${
                        drawerOpen ? 'translate-x-0' : '-translate-x-full'
                      }`}
        >
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <span className="font-display text-lg uppercase tracking-luxe">Touch</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close menu"
              className="-mr-2 p-2 text-ink-faint hover:text-ink"
            >
              <X size={20} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Mobile">
            <p className="eyebrow px-3 pb-2">Shop</p>
            <Link
              to="/shop"
              className="flex items-center justify-between rounded-control px-3 py-3 text-sm
                         text-ink transition-colors hover:bg-paper-sunken"
            >
              All products
              <ChevronRight size={15} className="text-ink-faint" aria-hidden="true" />
            </Link>
            {categories.map((c) => (
              <Link
                key={c._id}
                to={`/shop?category=${c.slug}`}
                className="flex items-center justify-between rounded-control px-3 py-3 text-sm
                           text-ink-soft transition-colors hover:bg-paper-sunken hover:text-ink"
              >
                {c.name}
                <ChevronRight size={15} className="text-ink-faint" aria-hidden="true" />
              </Link>
            ))}

            <div className="my-4 h-px bg-line" />

            <p className="eyebrow px-3 pb-2">Account</p>
            {isAuthenticated ? (
              <>
                {[
                  { to: '/account', label: 'My account' },
                  { to: '/orders', label: 'Orders' },
                  { to: '/account/addresses', label: 'Addresses' },
                  { to: '/wishlist', label: `Wishlist${wishCount ? ` (${wishCount})` : ''}` },
                  ...(isAdmin ? [{ to: '/admin', label: 'Admin panel' }] : []),
                ].map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="block rounded-control px-3 py-3 text-sm text-ink-soft
                               transition-colors hover:bg-paper-sunken hover:text-ink"
                  >
                    {label}
                  </Link>
                ))}
              </>
            ) : (
              <div className="px-3 pt-1">
                <Button to="/login" size="sm" fullWidth>Sign in</Button>
                <Link to="/register" className="mt-2 block py-2 text-center text-xs text-ink-muted">
                  Create an account
                </Link>
              </div>
            )}
          </nav>

          {isAuthenticated && (
            <div className="border-t border-line p-4">
              <p className="mb-2.5 truncate text-xs text-ink-muted">{user.email}</p>
              <Button variant="ghost" size="sm" fullWidth onClick={handleLogout}>
                <LogOut size={14} aria-hidden="true" /> Sign out
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
