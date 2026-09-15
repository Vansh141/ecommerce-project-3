import ContentLink from './ContentLink';
import { STOREFRONT_ICONS } from './storefrontIcons';
import { visibleItems } from '../../config/storefront';

const COLUMNS = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 lg:grid-cols-4',
  5: 'grid-cols-2 lg:grid-cols-3',
  6: 'grid-cols-2 lg:grid-cols-3',
};

/**
 * Service messages, closing the homepage. Managed in Admin → Storefront
 * (`trust`); cash-on-delivery messages appear only while the payments config
 * reports COD available, whatever the content says.
 */
export default function TrustStrip({ trust, payments }) {
  if (!trust?.enabled) return null;
  const items = visibleItems(trust.items, payments);
  if (items.length === 0) return null;

  return (
    <section aria-label="Shopping with TOUCHH" className="shell pt-12 sm:pt-16 lg:pt-20">
      <ul
        className={`grid gap-x-4 gap-y-6 border-y border-line py-7 sm:gap-x-8 sm:py-9 ${
          COLUMNS[items.length] || COLUMNS[4]
        }`}
      >
        {items.map((item, index) => {
          const Icon = STOREFRONT_ICONS[item.icon];
          return (
            <li key={`${item.icon}-${index}`} className="flex items-start gap-3">
              {Icon && <Icon size={20} className="mt-0.5 shrink-0 text-clay-deep" aria-hidden="true" />}
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{item.title}</p>
                {item.description && item.link ? (
                  // 44px tall for touch; the negative margin keeps the visual rhythm.
                  <ContentLink
                    href={item.link}
                    className="-my-3.5 inline-flex min-h-[44px] items-center text-xs text-ink-muted underline
                               decoration-line-strong underline-offset-4 hover:text-ink"
                  >
                    {item.description}
                  </ContentLink>
                ) : (
                  item.description && <p className="mt-0.5 text-xs text-ink-muted">{item.description}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
