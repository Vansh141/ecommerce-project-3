import { Suspense, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PageLoader } from '../ui';

/**
 * The frame for sign in, account creation, password and email pages.
 *
 * These are focused tasks, so they leave out the storefront's announcement
 * bar, navigation, footer and bottom bar; each page carries its own brand
 * photograph, TOUCH wordmark and a way back to shopping. One header and one
 * main landmark, never two.
 */
export default function AuthLayout() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname]);

  return (
    <div className="min-h-screen bg-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100]
                   focus:rounded-control focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>
      <Suspense fallback={<PageLoader />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
