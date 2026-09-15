import ContentLink from './ContentLink';
import { responsiveImage } from '../../utils/images';

const AVATAR_WIDTHS = [96, 160, 240];

// Fluid on phones (68–76px) so part of the next circle always shows, hinting that the row scrolls.
const AVATAR_SIZE = 'h-[clamp(4.25rem,19vw,4.75rem)] w-[clamp(4.25rem,19vw,4.75rem)] sm:h-20 sm:w-20';

/**
 * Category discovery, straight after the hero.
 *
 * `items` are already resolved by the homepage renderer — either every
 * category that is active and holds products, in the order set in admin, or
 * the builder's own selection with custom titles, images and links. On phones
 * the row swipes edge to edge and snaps to each circle; from 768px it centres
 * itself, and still scrolls if a long list outgrows the width.
 *
 * The row keeps its height while categories load, so nothing below it jumps.
 */
export default function CategoryRail({ items = [], loaded = false, title = '', subtitle = '', sectionId = 'categories' }) {
  if (loaded && items.length === 0) return null;
  const titleId = title ? `${sectionId}-title` : undefined;

  return (
    <nav aria-label={title || 'Shop by category'} className="border-b border-line">
      <div className="shell py-3 md:py-4 lg:py-3">
        {title && (
          <div className="mb-2.5 text-center md:mb-4">
            <h2 id={titleId} className="font-display text-xl leading-tight text-ink sm:text-2xl">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-ink-muted sm:text-sm">{subtitle}</p>}
          </div>
        )}
        <ul
          // The 4px of vertical padding, cancelled by the negative margin, and
          // the md side padding give each link's focus ring room inside the
          // scroller, which would otherwise clip it.
          className="rail bleed -my-1 flex gap-3 py-1 sm:gap-6
                     md:mx-auto md:w-max md:max-w-full md:px-1 md:[--rail-pad:0.25rem] lg:gap-9"
        >
          {loaded
            ? items.map((item) => {
                const image = item.imageUrl
                  ? responsiveImage(item.imageUrl, { widths: AVATAR_WIDTHS, ratio: 1, faces: true })
                  : null;

                return (
                  <li key={item.key} className="shrink-0 snap-start">
                    <ContentLink
                      href={item.href}
                      className="group flex w-[clamp(4.25rem,19vw,4.75rem)] flex-col items-center gap-2 rounded-control
                                 sm:w-[5.25rem]"
                    >
                      <span
                        className={`block overflow-hidden rounded-full bg-paper-sunken ring-1 ring-line transition-shadow
                                    duration-300 can-hover:group-hover:ring-ink/40 ${AVATAR_SIZE}`}
                      >
                        {image ? (
                          <img
                            src={image.src}
                            srcSet={image.srcSet}
                            sizes={image.srcSet ? '(min-width: 640px) 80px, 76px' : undefined}
                            alt=""
                            width={96}
                            height={96}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover transition-transform duration-700 ease-luxe
                                       can-hover:group-hover:scale-105"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="flex h-full w-full items-center justify-center font-display text-xl text-clay-deep"
                          >
                            {item.title.charAt(0)}
                          </span>
                        )}
                      </span>
                      <span className="line-clamp-2 text-center text-xs leading-tight text-ink-soft transition-colors group-hover:text-ink">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="-mt-1.5 line-clamp-1 text-center text-2xs text-ink-faint">{item.subtitle}</span>
                      )}
                    </ContentLink>
                  </li>
                );
              })
            : Array.from({ length: 6 }).map((_, i) => (
                <li key={i} aria-hidden="true" className="flex shrink-0 flex-col items-center gap-2">
                  <span className={`skeleton block rounded-full ${AVATAR_SIZE}`} />
                  <span className="skeleton block h-3 w-12" />
                </li>
              ))}
        </ul>
      </div>
    </nav>
  );
}
