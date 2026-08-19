import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { categoryApi } from '../../api/endpoints';

/**
 * Announcement bar.
 *
 * These three statements are configuration-backed facts, not marketing
 * invention: free shipping above the configured threshold, the published
 * returns window, and the fact that payment is handled by a verified gateway.
 * Nothing here promises a delivery time the business has not committed to.
 */
function AnnouncementBar() {
  const items = [
    { icon: Truck, text: 'Free shipping over ₹1,499' },
    { icon: RotateCcw, text: '7-day returns' },
    { icon: ShieldCheck, text: 'Secure checkout' },
  ];

  return (
    <div className="border-b border-line bg-ink text-paper">
      <div className="shell">
        <ul className="flex items-center justify-center gap-6 py-2.5 sm:gap-10">
          {items.map(({ icon: Icon, text }, i) => (
            <li
              key={text}
              className={`flex items-center gap-2 text-2xs uppercase tracking-wider2
                          ${i > 0 ? 'hidden sm:flex' : ''}`}
            >
              <Icon size={13} className="shrink-0 opacity-70" aria-hidden="true" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);
  return null;
}

export default function StoreLayout() {
  const [categories, setCategories] = useState([]);

  // Fetched once at the layout level and shared with nav + footer, rather than
  // each component issuing its own request.
  useEffect(() => {
    let cancelled = false;
    categoryApi
      .list()
      .then((data) => { if (!cancelled) setCategories(data.categories || []); })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <ScrollToTop />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100]
                   focus:rounded-control focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>

      <AnnouncementBar />
      <Navbar categories={categories} />

      <main id="main" className="flex-1">
        <Outlet context={{ categories }} />
      </main>

      <Footer categories={categories} />
    </div>
  );
}
