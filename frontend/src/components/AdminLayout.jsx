import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Package, ShoppingBag, Users,
    ChevronRight, LogOut, Menu, X, Store, ExternalLink
} from 'lucide-react';

const NAV_ITEMS = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { to: '/admin/products', label: 'Products', icon: Package },
    { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
    { to: '/admin/users', label: 'Users', icon: Users },
];

const AdminLayout = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { userInfo, logout } = useAuth();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const isActive = (item) => {
        if (item.exact) return location.pathname === item.to;
        return location.pathname.startsWith(item.to);
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const SidebarContent = () => (
        <div className="flex flex-col h-full">
            {/* Brand */}
            <div className="px-6 py-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-touchPink/20 rounded-xl flex items-center justify-center">
                        <Store size={18} className="text-touchPink" />
                    </div>
                    <div>
                        <p className="font-serif text-white text-base tracking-wide leading-tight">TOUCH</p>
                        <p className="text-xs text-white/40 tracking-widest uppercase">Admin Panel</p>
                    </div>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-3 py-4 space-y-1">
                {NAV_ITEMS.map(({ to, label, icon: Icon, exact }) => {
                    const active = isActive({ to, exact });
                    return (
                        <Link
                            key={to}
                            to={to}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 group ${active
                                    ? 'bg-touchPink/20 text-touchPink shadow-inner'
                                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                                }`}
                        >
                            <Icon size={18} className={`shrink-0 transition-transform group-hover:scale-110 ${active ? 'text-touchPink' : ''}`} />
                            {label}
                            {active && <ChevronRight size={14} className="ml-auto text-touchPink" />}
                        </Link>
                    );
                })}
            </nav>

            {/* Footer */}
            <div className="px-4 pb-6 space-y-2 border-t border-white/10 pt-4">
                <Link
                    to="/"
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all"
                >
                    <ExternalLink size={15} /> View Store
                </Link>
                <div className="px-4 pt-2">
                    <p className="text-xs text-white/30 truncate mb-1">{userInfo?.email}</p>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-2 text-sm text-red-400/80 hover:text-red-400 transition-colors"
                    >
                        <LogOut size={14} /> Sign Out
                    </button>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-50/80 overflow-hidden">

            {/* Desktop Sidebar */}
            <aside className="hidden lg:flex flex-col w-64 bg-touchDark shrink-0 h-full">
                <SidebarContent />
            </aside>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                    <aside className="absolute left-0 top-0 h-full w-64 bg-touchDark flex flex-col shadow-xl">
                        <SidebarContent />
                    </aside>
                </div>
            )}

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">

                {/* Top Bar */}
                <header className="bg-white border-b border-touchPink/15 px-6 py-4 flex items-center justify-between shrink-0 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            className="lg:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors text-touchDark/70"
                            onClick={() => setSidebarOpen(true)}
                        >
                            <Menu size={20} />
                        </button>
                        <div>
                            <h1 className="font-serif text-touchDark text-xl tracking-wide">
                                {NAV_ITEMS.find(n => isActive(n))?.label || 'Admin'}
                            </h1>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex flex-col text-right">
                            <span className="text-sm font-medium text-touchDark">{userInfo?.name}</span>
                            <span className="text-xs text-touchDark/40 tracking-wide">Administrator</span>
                        </div>
                        <div className="w-9 h-9 bg-gradient-to-br from-touchPink to-touchSage rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-sm">
                            {userInfo?.name?.[0]?.toUpperCase() || 'A'}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
