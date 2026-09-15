import { useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useDocumentMeta } from '../hooks';
import { Alert } from '../components/ui';
import HomepageRenderer from '../components/home/HomepageRenderer';
import { resolveStorefront } from '../config/storefront';

/**
 * The homepage.
 *
 * Its sections — hero, categories, product rails and collections, editorial,
 * campaigns, brand messages and service messages — are managed in Admin →
 * Storefront → Homepage and arrive through the layout, already merged with the
 * built-in homepage. Without published content the built-in homepage is the
 * page: brand, then categories, then products, quickly.
 */
export default function Home() {
  const {
    categories = [], categoriesLoaded = false, payments = null, storefront = null,
  } = useOutletContext() || {};

  const content = useMemo(
    () => storefront?.content || resolveStorefront(null, { payments }),
    [storefront, payments]
  );
  const preview = Boolean(storefront?.preview);

  useDocumentMeta({
    title: content.seo.title,
    description: content.seo.description,
    // Crawlers that run JavaScript read this; link previews that do not keep
    // the static image declared in index.html.
    image: content.seo.socialImage?.url || `${window.location.origin}/og-image.jpg`,
    noIndex: preview,
  });

  return (
    <>
      {preview && storefront?.error && (
        <div className="shell pt-4">
          <Alert tone="error" title="The draft could not be loaded">
            {storefront.error} The built-in homepage is shown instead.
          </Alert>
        </div>
      )}

      <HomepageRenderer
        content={content}
        loading={storefront?.status === 'loading'}
        categories={categories}
        categoriesLoaded={categoriesLoaded}
        payments={payments}
      />
    </>
  );
}
