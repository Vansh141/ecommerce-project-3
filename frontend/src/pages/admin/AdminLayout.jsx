import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Package, FolderTree, Boxes, ShoppingBag, Users, Ticket,
  Menu, X, ExternalLink, LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useBodyScrollLock, useFocusTrap } from '../../hooks';
import { initialsOf } from '../../utils/format';

const NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/inventory', label: 'Inventory', icon: Boxes },
  { to: '/admin/categories', label: 'Categories', icon: FolderTree },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/coupons', label: 'Coupons', icon: Ticket },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const drawerRef = useRef(null);

  useBodyScrollLock(sidebarOpen);
  useFocusTrap(drawerRef, sidebarOpen);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setSidebarOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const SidebarContent = ({ onClose }) => (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-white/10 px-6 py-5">
        <Link to="/admin" className="block">
          <span className="font-display text-lg uppercase tracking-luxe text-white">Touch</span>
          <span className="mt-0.5 block text-2xs uppercase tracking-wider2 text-white/40">
            Store admin
          </span>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="icon-btn-sm -mr-2 -mt-1 text-white/60 hover:text-white"
          >
            <X size={19} aria-hidden="true" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3" aria-label="Admin">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-control px-3.5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-white/10 font-medium text-white'
                  : 'text-white/55 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={16} aria-hidden="true" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 rounded-control px-3.5 py-2.5 text-sm
                     text-white/55 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ExternalLink size={15} aria-hidden="true" /> View store
        </Link>

        <div className="flex items-center gap-3 px-3.5 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full
                          bg-white/10 text-2xs font-medium text-white">
            {initialsOf(user?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">{user?.name}</p>
            <p className="truncate text-2xs text-white/40">{user?.email}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-control px-3.5 py-2.5 text-sm
                     text-white/55 transition-colors hover:bg-white/5 hover:text-white"
        >
          <LogOut size={15} aria-hidden="true" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="hidden w-60 shrink-0 bg-ink lg:block">
        <div className="sticky top-0 h-screen"><SidebarContent /></div>
      </aside>

      {sidebarOpen && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div
            className="absolute inset-0 animate-fade-in bg-ink/50"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
          <aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            tabIndex={-1}
            className="absolute inset-y-0 left-0 w-[17rem] max-w-[85%] animate-slide-in-left bg-ink"
          >
            <SidebarContent onClose={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 border-b border-line bg-paper-raised">
          <div className="flex h-14 items-center gap-2 px-4 sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
              aria-expanded={sidebarOpen}
              className="icon-btn -ml-3 lg:hidden"
            >
              <Menu size={19} aria-hidden="true" />
            </button>
            <span className="font-display text-base uppercase tracking-wider2 lg:hidden">Touch</span>
            <div className="ml-auto">
              <Link
                to="/"
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap text-xs text-ink-muted hover:text-ink"
              >
                View store ↗
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
