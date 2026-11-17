import { Suspense, useEffect, useMemo, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Eye } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';
import BottomNav from './BottomNav';
import { categoryApi, paymentApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { usePublishedStorefront, useDraftStorefront } from '../../hooks/useStorefront';
import { PageLoader } from '../ui';
import { resolveStorefront } from '../../config/storefront';
import AnnouncementBar from './AnnouncementBar';

/**
 * The cart has its own fixed checkout bar and checkout is a focused task, so
 * on those routes the bottom of the screen belongs to them.
 */
const HIDE_BOTTOM_NAV = /^\/(cart|checkout)(\/|$)/;

/** The admin-only page that renders the homepage from the saved draft. */
const PREVIEW_PATH = '/storefront-preview';

function PreviewBanner({ error }) {
  return (
    <div role="status" className="border-b border-warning/30 bg-warning-faint text-warning">
      <div className="shell flex min-h-10 flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2 text-xs">
        <p className="flex items-center gap-2 font-medium uppercase tracking-wide">
          <Eye size={14} aria-hidden="true" />
          {error
            ? 'The preview isn’t available right now. Please go back to the editor and try again.'
            : 'Preview — these changes are not live yet'}
        </p>
        <span className="flex flex-wrap items-center gap-x-5">
          <Link to="/admin/storefront" className="inline-flex min-h-[44px] items-center underline underline-offset-4">
            ← Back to Editor
          </Link>
          {!error && (
            <Link to="/admin/storefront?publish=1" className="inline-flex min-h-[44px] items-center font-medium underline underline-offset-4">
              Publish Changes
            </Link>
          )}
        </span>
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
  const { pathname } = useLocation();
  const { isAdmin, initialising } = useAuth();
  const [categories, setCategories] = useState([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [payments, setPayments] = useState(null);

  // Fetched once at the layout level and shared with nav, footer and pages,
  // rather than each component issuing its own request.
  useEffect(() => {
    let cancelled = false;
    categoryApi
      .list()
      .then((data) => { if (!cancelled) setCategories(data.categories || []); })
      .catch(() => { if (!cancelled) setCategories([]); })
      .finally(() => { if (!cancelled) setCategoriesLoaded(true); });
    return () => { cancelled = true; };
  }, []);

  // Public payments config — the only source for what the storefront says
  // about cash on delivery. A failure simply means COD is not mentioned.
  useEffect(() => {
    let cancelled = false;
    paymentApi
      .config()
      .then((data) => { if (!cancelled) setPayments(data || null); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Storefront content: one cached request for the published version, or the
  // saved draft on the admin preview page once an admin session is confirmed.
  const isPreview = pathname === PREVIEW_PATH;
  const published = usePublishedStorefront({ skip: isPreview });
  const draft = useDraftStorefront(isPreview && !initialising && isAdmin);
  const source = isPreview ? draft : published;

  const storefront = useMemo(
    () => ({
      status: source.status,
      content: resolveStorefront(source.content, { payments }),
      preview: isPreview,
      error: source.error || null,
    }),
    [source.status, source.content, source.error, payments, isPreview]
  );

  const showBottomNav = !HIDE_BOTTOM_NAV.test(pathname);

  // Toasts are rendered outside this layout, so they learn about the bottom
  // navigation from an attribute on <html> and lift themselves above it.
  useEffect(() => {
    const root = document.documentElement;
    if (showBottomNav) root.dataset.bottomNav = '';
    else delete root.dataset.bottomNav;
    return () => { delete root.dataset.bottomNav; };
  }, [showBottomNav]);

  return (
    <div className={`flex min-h-screen flex-col ${showBottomNav ? 'pb-bottom-nav' : ''}`}>
      <ScrollToTop />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100]
                   focus:rounded-control focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>

      {isPreview && isAdmin && <PreviewBanner error={storefront.error} />}

      <AnnouncementBar
        announcement={storefront.content.announcement}
        payments={payments}
        loading={storefront.status === 'loading'}
      />
      <Navbar categories={categories} header={storefront.content.header} />

      <main id="main" className="flex-1">
        {/* Keeps the header and footer on screen while a page's code loads. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet context={{ categories, categoriesLoaded, payments, storefront }} />
        </Suspense>
      </main>

      <Footer
        categories={categories}
        content={storefront.content.footer}
        logo={storefront.content.header?.logo || null}
      />

      {showBottomNav && <BottomNav />}
    </div>
  );
}
