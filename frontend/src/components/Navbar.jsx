import React, { useState, useRef, useEffect } from 'react';
import {
    Search, Heart, ShoppingCart, User, Package,
    Menu, X, LayoutDashboard, ChevronRight, MoreVertical, LogOut
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';

const NAV_LINKS = [
    { label: 'Collections', to: '/search' },
    { label: 'New Arrivals', to: '/search?q=New Arrivals' },
    { label: 'Dresses', to: '/search?q=Dresses' },
    { label: 'Accessories', to: '/search?q=Accessories' },
    { label: 'Sale', to: '/search?q=Sale', accent: true },
    { label: 'Track My Order', to: '/orders' },
];

const Navbar = () => {
    const { cartCount } = useCart();
    const { wishlistCount } = useWishlist();
    const { userInfo, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [searchQuery, setSearchQuery] = useState('');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [dotsOpen, setDotsOpen] = useState(false);

    const drawerRef = useRef(null);
    const dotsRef = useRef(null);

    useEffect(() => { setDrawerOpen(false); setDotsOpen(false); }, [location.pathname]);

    useEffect(() => {
        if (!drawerOpen) return;
        const fn = (e) => { if (drawerRef.current && !drawerRef.current.contains(e.target)) setDrawerOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, [drawerOpen]);

    useEffect(() => {
        if (!dotsOpen) return;
        const fn = (e) => { if (dotsRef.current && !dotsRef.current.contains(e.target)) setDotsOpen(false); };
        document.addEventListener('mousedown', fn);
        return () => document.removeEventListener('mousedown', fn);
    }, [dotsOpen]);

    const handleSearch = (e) => {
        if (e) e.preventDefault();
        if (searchQuery.trim()) navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    };

    /* ── Shared icon button style ─────────────────────────────────────── */
    const iconBtn = 'relative flex items-center justify-center w-10 h-10 rounded-full text-touchDark/65 hover:text-touchSage hover:bg-touchSage/10 transition-all duration-200';
    const iconBtnPink = 'relative flex items-center justify-center w-10 h-10 rounded-full text-touchDark/65 hover:text-touchPink hover:bg-touchPink/10 transition-all duration-200';

    return (
        <>
            {/* ═══════════════════════ HEADER ══════════════════════════════ */}
            <header className="bg-touchCream/90 backdrop-blur-xl border-b border-touchPink/20 sticky top-0 z-50 shadow-sm">

                {/* ══ Desktop: 3-section row  ══════════════════════════════════ */}
                <div className="hidden sm:flex container mx-auto px-4 h-16 items-center gap-4">

                    {/* LEFT — ☰ + Logo */}
                    <div className="flex items-center gap-2 flex-1">
                        <button
                            onClick={() => setDrawerOpen(v => !v)}
                            className={`${iconBtn} shrink-0`}
                            aria-label="Open menu"
                        >
                            <Menu size={22} />
                        </button>
                        <Link to="/" className="shrink-0 flex items-center group" aria-label="Home">
                            <img
                                src="/logo.jpg"
                                alt="TOUCH"
                                className="h-11 w-auto object-contain rounded-xl mix-blend-multiply drop-shadow-sm group-hover:drop-shadow transition-all duration-300"
                            />
                        </Link>
                    </div>

                    {/* CENTER — Search bar (fixed max-width, truly centered) */}
                    <div className="flex justify-center w-full max-w-lg xl:max-w-xl shrink-0">
                        <form
                            onSubmit={handleSearch}
                            className="flex w-full border border-touchPink/30 rounded-full overflow-hidden bg-white focus-within:ring-2 focus-within:ring-touchPink/40 focus-within:border-touchPink transition-all shadow-sm"
                        >
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="flex-1 px-5 py-2 outline-none text-sm bg-transparent text-touchDark placeholder-gray-400 font-light tracking-wide min-w-0"
                            />
                            <button
                                type="submit"
                                className="bg-touchPink text-touchDark px-5 py-2 text-sm hover:bg-touchSage hover:text-white transition-colors shrink-0 flex items-center"
                            >
                                <Search size={15} />
                            </button>
                        </form>
                    </div>

                    {/* RIGHT — Icons (flex-1 so it balances the left, icons pushed to edge) */}
                    <div className="flex items-center gap-1 flex-1 justify-end">

                        {/* Orders — desktop only, logged-in only */}
                        {userInfo && (
                            <Link to="/orders" title="My Orders" className={`${iconBtn} hidden sm:flex`}>
                                <Package size={22} />
                            </Link>
                        )}

                        {/* Wishlist — desktop only */}
                        <Link to="/wishlist" className={`${iconBtnPink} hidden sm:flex`}>
                            <Heart size={22} className={wishlistCount > 0 ? 'text-touchPink fill-touchPink' : ''} />
                            {wishlistCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 bg-touchDark text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold leading-none">
                                    {wishlistCount}
                                </span>
                            )}
                        </Link>

                        {/* Cart — always visible */}
                        <Link to="/cart" className={iconBtn}>
                            <ShoppingCart size={22} />
                            {cartCount > 0 && (
                                <span className="absolute top-0.5 right-0.5 bg-touchPink text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold leading-none">
                                    {cartCount}
                                </span>
                            )}
                        </Link>

                        {/* User — desktop dropdown / hidden on mobile (inside dots) */}
                        <div className="relative group/user hidden sm:block">
                            <button className={iconBtn}>
                                <User size={22} />
                            </button>
                            {/* Dropdown */}
                            <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-touchPink/20 rounded-2xl shadow-xl opacity-0 invisible group-hover/user:opacity-100 group-hover/user:visible transition-all duration-200 origin-top-right scale-95 group-hover/user:scale-100 z-50 overflow-hidden">
                                {userInfo ? (
                                    <>
                                        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                                            <p className="text-sm font-medium text-touchDark truncate">{userInfo.name}</p>
                                            <p className="text-xs text-touchDark/50 truncate">{userInfo.email}</p>
                                        </div>
                                        <div className="p-2">
                                            <Link to="/profile" className="block px-3 py-2 text-sm text-touchDark/70 hover:text-touchPink hover:bg-touchPink/5 rounded-xl transition-colors">My Profile</Link>
                                            <Link to="/orders" className="block px-3 py-2 text-sm text-touchDark/70 hover:text-touchPink hover:bg-touchPink/5 rounded-xl transition-colors">Order History</Link>
                                            {userInfo.isAdmin && (
                                                <>
                                                    <div className="h-px bg-gray-100 my-1 mx-2" />
                                                    <Link to="/admin" className="flex items-center gap-2 px-3 py-2 text-sm text-touchSage font-medium hover:bg-touchSage hover:text-white rounded-xl transition-colors">
                                                        <LayoutDashboard size={14} /> Admin Panel
                                                    </Link>
                                                </>
                                            )}
                                            <div className="h-px bg-gray-100 my-1 mx-2" />
                                            <button onClick={() => { logout(); navigate('/login'); }} className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                                                Sign Out
                                            </button>
                                        </div>
                                    </>
                                ) : (
                                    <div className="p-2">
                                        <Link to="/login" className="block px-3 py-2 text-sm font-medium text-touchDark hover:bg-touchCream rounded-xl transition-colors">Sign In</Link>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* ⋮ Three-dot — mobile only */}
                        <div ref={dotsRef} className="relative sm:hidden">
                            <button
                                onClick={() => setDotsOpen(v => !v)}
                                className={iconBtn}
                                aria-label="More"
                            >
                                <MoreVertical size={22} />
                            </button>

                            <div className={`absolute right-0 top-full mt-2 w-56 bg-white border border-touchPink/15 rounded-2xl shadow-2xl z-50 overflow-hidden transition-all duration-200 origin-top-right
                                ${dotsOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>

                                {/* Mobile search */}
                                <div className="px-3 pt-3 pb-2">
                                    <form onSubmit={(e) => { handleSearch(e); setDotsOpen(false); }} className="flex border border-touchPink/25 rounded-xl overflow-hidden bg-gray-50">
                                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..."
                                            className="flex-1 px-3 py-2 text-sm outline-none bg-transparent text-touchDark placeholder-gray-400" />
                                        <button type="submit" className="px-3 text-touchPink hover:text-touchSage transition-colors"><Search size={15} /></button>
                                    </form>
                                </div>

                                <div className="px-2 pb-2 space-y-0.5">
                                    <Link to="/wishlist" onClick={() => setDotsOpen(false)} className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-touchDark/70 hover:bg-touchPink/5 hover:text-touchPink transition-colors">
                                        <span className="flex items-center gap-2.5"><Heart size={16} /> Wishlist</span>
                                        {wishlistCount > 0 && <span className="text-xs bg-touchPink text-white px-1.5 py-0.5 rounded-full font-bold">{wishlistCount}</span>}
                                    </Link>
                                    {userInfo ? (
                                        <>
                                            <Link to="/orders" onClick={() => setDotsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-touchDark/70 hover:bg-touchSage/5 hover:text-touchSage transition-colors"><Package size={16} /> My Orders</Link>
                                            <Link to="/profile" onClick={() => setDotsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-touchDark/70 hover:bg-touchSage/5 hover:text-touchSage transition-colors"><User size={16} /> My Profile</Link>
                                            {userInfo.isAdmin && (
                                                <Link to="/admin" onClick={() => setDotsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-touchSage font-medium hover:bg-touchSage/10 transition-colors"><LayoutDashboard size={16} /> Admin Panel</Link>
                                            )}
                                            <div className="h-px bg-gray-100 mx-2 my-1" />
                                            <div className="px-3 py-2 flex items-center gap-2.5">
                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-touchPink/30 to-touchSage/30 flex items-center justify-center text-[11px] font-bold text-touchDark shrink-0">
                                                    {userInfo.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-semibold text-touchDark truncate">{userInfo.name}</p>
                                                    <p className="text-[10px] text-touchDark/40 truncate">{userInfo.email}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => { logout(); navigate('/login'); setDotsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors">
                                                <LogOut size={16} /> Sign Out
                                            </button>
                                        </>
                                    ) : (
                                        <Link to="/login" onClick={() => setDotsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-touchDark font-medium hover:bg-touchCream transition-colors"><User size={16} /> Sign In</Link>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* ══ Mobile: single row ════════════════════════════════════════ */}
                <div className="flex sm:hidden container mx-auto px-3 h-14 items-center gap-2">
                    {/* ☰ */}
                    <button onClick={() => setDrawerOpen(v => !v)} className={`${iconBtn} shrink-0`} aria-label="Open menu">
                        <Menu size={22} />
                    </button>
                    {/* Logo centered */}
                    <Link to="/" className="flex-1 flex justify-center">
                        <img src="/logo.jpg" alt="TOUCH" className="h-9 w-auto object-contain rounded-lg mix-blend-multiply" />
                    </Link>
                    {/* Cart */}
                    <Link to="/cart" className={`${iconBtn} shrink-0`}>
                        <ShoppingCart size={22} />
                        {cartCount > 0 && (
                            <span className="absolute top-0.5 right-0.5 bg-touchPink text-white text-[10px] w-4 h-4 flex items-center justify-center rounded-full font-bold">{cartCount}</span>
                        )}
                    </Link>
                    {/* ⋮ */}
                    <div ref={dotsRef} className="relative shrink-0">
                        <button onClick={() => setDotsOpen(v => !v)} className={iconBtn} aria-label="More">
                            <MoreVertical size={22} />
                        </button>
                        <div className={`absolute right-0 top-full mt-2 w-56 bg-white border border-touchPink/15 rounded-2xl shadow-2xl z-50 overflow-hidden transition-all duration-200 origin-top-right ${dotsOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                            <div className="px-3 pt-3 pb-2">
                                <form onSubmit={(e) => { handleSearch(e); setDotsOpen(false); }} className="flex border border-touchPink/25 rounded-xl overflow-hidden bg-gray-50">
                                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search..." className="flex-1 px-3 py-2 text-sm outline-none bg-transparent text-touchDark placeholder-gray-400" />
                                    <button type="submit" className="px-3 text-touchPink hover:text-touchSage transition-colors"><Search size={15} /></button>
                                </form>
                            </div>
                            <div className="px-2 pb-2 space-y-0.5">
                                <Link to="/wishlist" onClick={() => setDotsOpen(false)} className="flex items-center justify-between px-3 py-2.5 rounded-xl text-sm text-touchDark/70 hover:bg-touchPink/5 hover:text-touchPink transition-colors">
                                    <span className="flex items-center gap-2.5"><Heart size={16} /> Wishlist</span>
                                    {wishlistCount > 0 && <span className="text-xs bg-touchPink text-white px-1.5 py-0.5 rounded-full font-bold">{wishlistCount}</span>}
                                </Link>
                                {userInfo ? (
                                    <>
                                        <Link to="/orders" onClick={() => setDotsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-touchDark/70 hover:bg-touchSage/5 hover:text-touchSage transition-colors"><Package size={16} /> My Orders</Link>
                                        <Link to="/profile" onClick={() => setDotsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-touchDark/70 hover:bg-touchSage/5 hover:text-touchSage transition-colors"><User size={16} /> My Profile</Link>
                                        {userInfo.isAdmin && <Link to="/admin" onClick={() => setDotsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-touchSage font-medium hover:bg-touchSage/10 transition-colors"><LayoutDashboard size={16} /> Admin Panel</Link>}
                                        <div className="h-px bg-gray-100 mx-2 my-1" />
                                        <div className="px-3 py-2 flex items-center gap-2.5">
                                            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-touchPink/30 to-touchSage/30 flex items-center justify-center text-[11px] font-bold text-touchDark shrink-0">
                                                {userInfo.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-semibold text-touchDark truncate">{userInfo.name}</p>
                                                <p className="text-[10px] text-touchDark/40 truncate">{userInfo.email}</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { logout(); navigate('/login'); setDotsOpen(false); }} className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-red-500 hover:bg-red-50 transition-colors"><LogOut size={16} /> Sign Out</button>
                                    </>
                                ) : (
                                    <Link to="/login" onClick={() => setDotsOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-touchDark font-medium hover:bg-touchCream transition-colors"><User size={16} /> Sign In</Link>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

            </header>

            {/* ═══════════════  SIDE DRAWER (☰)  ═════════════════════════════ */}
            <div
                className={`fixed inset-0 bg-touchDark/25 backdrop-blur-sm z-40 transition-all duration-300 ${drawerOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
                onClick={() => setDrawerOpen(false)}
            />
            <div
                ref={drawerRef}
                className={`fixed top-0 left-0 h-full w-72 bg-white z-50 shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-touchPink/15 bg-touchCream/60">
                    <Link to="/" onClick={() => setDrawerOpen(false)}>
                        <img src="/logo.jpg" alt="TOUCH" className="h-10 w-auto object-contain rounded-lg mix-blend-multiply" />
                    </Link>
                    <button onClick={() => setDrawerOpen(false)} className="p-2 rounded-xl text-touchDark/50 hover:bg-touchPink/10 transition-all">
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto py-4 px-3">
                    <p className="text-[10px] text-touchDark/30 font-bold uppercase tracking-[0.2em] px-3 mb-2">Browse</p>
                    {NAV_LINKS.map(link => (
                        <Link key={link.label} to={link.to} onClick={() => setDrawerOpen(false)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium mb-1 group transition-all
                                ${link.accent ? 'text-touchPink hover:bg-touchPink/8' : 'text-touchDark/70 hover:text-touchDark hover:bg-touchCream/80'}`}>
                            {link.label}
                            <ChevronRight size={15} className="text-touchDark/20 group-hover:translate-x-0.5 transition-transform" />
                        </Link>
                    ))}

                    {userInfo && (
                        <>
                            <div className="h-px bg-touchPink/10 mx-3 my-4" />
                            <p className="text-[10px] text-touchDark/30 font-bold uppercase tracking-[0.2em] px-3 mb-2">Account</p>
                            {[
                                { label: 'My Profile', to: '/profile' },
                                { label: 'My Orders', to: '/orders' },
                                ...(userInfo.isAdmin ? [{ label: 'Admin Panel', to: '/admin', sage: true }] : []),
                            ].map(link => (
                                <Link key={link.label} to={link.to} onClick={() => setDrawerOpen(false)}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium mb-1 transition-all
                                        ${link.sage ? 'text-touchSage hover:bg-touchSage/10' : 'text-touchDark/70 hover:text-touchDark hover:bg-touchCream/80'}`}>
                                    {link.label} <ChevronRight size={15} className="text-touchDark/20" />
                                </Link>
                            ))}
                        </>
                    )}
                </nav>

                <div className="px-5 py-5 border-t border-touchPink/15">
                    {userInfo ? (
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-touchPink/30 to-touchSage/30 flex items-center justify-center font-bold text-sm text-touchDark shrink-0">
                                    {userInfo.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium text-touchDark truncate">{userInfo.name}</p>
                                    <p className="text-xs text-touchDark/40 truncate">{userInfo.email}</p>
                                </div>
                            </div>
                            <button onClick={() => { logout(); navigate('/login'); setDrawerOpen(false); }}
                                className="w-full py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 border border-red-100 transition-all">
                                Sign Out
                            </button>
                        </div>
                    ) : (
                        <Link to="/login" onClick={() => setDrawerOpen(false)}
                            className="block w-full text-center py-3 bg-touchDark text-white rounded-xl text-sm font-medium hover:bg-touchDark/85 transition-all">
                            Sign In
                        </Link>
                    )}
                    <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-touchDark/40 font-medium">English, INR</span>
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs text-touchDark/40">Ship to:</span>
                            <img src="https://flagcdn.com/w20/in.png" alt="IN" className="w-4 h-3 rounded-sm shadow-sm" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Navbar;
