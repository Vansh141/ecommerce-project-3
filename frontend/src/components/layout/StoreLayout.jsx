import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import { categoryApi } from '../../api/endpoints';
import { useMediaQuery } from '../../hooks';
import { FREE_SHIPPING_THRESHOLD, RETURN_WINDOW_DAYS } from '../../config/store';
import { formatPrice } from '../../utils/format';

/**
 * Announcement bar.
 *
 * These three statements are configuration-backed facts, not marketing
 * invention: free shipping above the configured threshold, the published
 * returns window, and the fact that payment is handled by a verified gateway.
 * The two numbers come from `config/store`, which mirrors what the API
 * actually enforces, so the strip can never contradict the checkout.
 *
 * Layout: on a tablet and up all three sit on one line, evenly spaced and
 * separated by a hairline rule. Below that there is not enough width for three
 * legible items, so rather than shrink them or wrap onto a second line the
 * strip becomes a ticker showing one statement at a time — the bar keeps a
 * fixed height, nothing is truncated, and nothing is hidden from the customer.
 */
const ANNOUNCEMENTS = [
  { icon: Truck, text: `Free shipping over ${formatPrice(FREE_SHIPPING_THRESHOLD)}` },
  { icon: RotateCcw, text: `${RETURN_WINDOW_DAYS}-day returns` },
  { icon: ShieldCheck, text: 'Secure checkout' },
];

const TICKER_INTERVAL = 4000;

function AnnouncementBar() {
  const [index, setIndex] = useState(0);
  const isCompact = useMediaQuery('(max-width: 639px)');
  const { icon: CurrentIcon, text: currentText } = ANNOUNCEMENTS[index];

  // The interval only exists while the ticker is the layout in use.
  useEffect(() => {
    if (!isCompact) return undefined;
    const id = setInterval(
      () => setIndex((i) => (i + 1) % ANNOUNCEMENTS.length),
      TICKER_INTERVAL
    );
    return () => clearInterval(id);
  }, [isCompact]);

  return (
    <div className="border-b border-ink-soft/30 bg-ink text-paper">
      <div className="shell">
        {/* ── Phone: one statement at a time ── */}
        <div className="relative flex h-9 items-center justify-center sm:hidden">
          <p key={currentText} className="announce-item animate-fade-in" aria-hidden="true">
            <CurrentIcon size={13} className="shrink-0 opacity-70" aria-hidden="true" />
            {currentText}
          </p>

          {/* The rotation is decorative; assistive tech gets the full list once
              rather than an announcement every four seconds. */}
          <ul className="sr-only">
            {ANNOUNCEMENTS.map(({ text }) => <li key={text}>{text}</li>)}
          </ul>
        </div>

        {/* ── Tablet and up: all three, evenly spaced ── */}
        <ul className="hidden h-10 items-center justify-center sm:flex">
          {ANNOUNCEMENTS.map(({ icon: Icon, text }, i) => (
            <li key={text} className="flex items-center">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className="mx-6 h-3 w-px bg-paper/25 lg:mx-10"
                />
              )}
              <span className="announce-item">
                <Icon size={13} className="shrink-0 opacity-70" aria-hidden="true" />
                {text}
              </span>
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
