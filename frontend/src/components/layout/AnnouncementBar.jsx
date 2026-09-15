import { useEffect, useRef, useState } from 'react';
import { STOREFRONT_ICONS } from '../home/storefrontIcons';
import { visibleItems } from '../../config/storefront';

/**
 * Top Message — the dark bar above the navigation on every storefront page.
 *
 * Messages come from Admin → Storefront, plain text only. Cash-on-delivery
 * messages render only while the payments config reports COD available.
 *
 * Moving (the default): the messages travel across the bar like a train, one
 * after another with generous space between them. The strip holds the
 * messages once, spread to at least the width of the screen, followed by an
 * identical copy; it moves by exactly one copy, so the loop never jumps. The
 * duration follows the strip's measured width, so Slow, Normal and Fast keep
 * the same pace however many messages there are. The movement itself is a CSS
 * animation that stops while it is pointed at or focused. Customers who ask
 * for reduced motion get the still bar instead.
 *
 * Still: phones show the first two messages at a glance (below 375px, one);
 * larger screens show them side by side.
 *
 * Both keep the same height, and while content is loading the bar keeps its
 * height with nothing in it, so nothing below moves.
 */

/** How fast the messages travel, in pixels per second. */
const PIXELS_PER_SECOND = { slow: 45, normal: 70, fast: 110 };

function StillMessages({ items, className = '' }) {
  return (
    <div className={`shell ${className}`}>
      <ul className="flex h-8 items-center justify-center sm:hidden" aria-label="Store information">
        {items.slice(0, 2).map((item, i) => (
          <li
            key={`${i}-${item.text}`}
            className={`flex min-w-0 items-center ${i > 0 ? 'max-[374px]:hidden' : ''}`}
          >
            {i > 0 && <span aria-hidden="true" className="mx-3 h-2.5 w-px shrink-0 bg-paper/30" />}
            {/* `block` so a long message ends in an ellipsis instead of spilling past the edges. */}
            <span className="announce-item block min-w-0 truncate text-[0.625rem] leading-8 tracking-[0.1em]">
              {item.text}
            </span>
          </li>
        ))}
      </ul>

      <ul className="hidden h-9 items-center justify-center sm:flex" aria-label="Store information">
        {items.map((item, i) => {
          const Icon = STOREFRONT_ICONS[item.icon];
          return (
            // A fourth message only fits beside the others from 1024px.
            <li key={`${i}-${item.text}`} className={`min-w-0 items-center ${i >= 3 ? 'hidden lg:flex' : 'flex'}`}>
              {i > 0 && <span aria-hidden="true" className="mx-4 h-3 w-px shrink-0 bg-paper/25 lg:mx-8" />}
              <span className="announce-item min-w-0">
                {Icon && <Icon size={13} className="shrink-0 text-gold-soft" aria-hidden="true" />}
                <span className="min-w-0 truncate leading-9">{item.text}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MovingMessages({ items, direction, speed, className = '' }) {
  const firstCopy = useRef(null);
  const [duration, setDuration] = useState(null);
  const pace = PIXELS_PER_SECOND[speed] || PIXELS_PER_SECOND.normal;
  const signature = items.map((item) => `${item.icon}:${item.text}`).join('|');

  useEffect(() => {
    const copy = firstCopy.current;
    if (!copy) return undefined;
    const measure = () => {
      const width = copy.getBoundingClientRect().width;
      if (width > 0) setDuration(Math.round((width / pace) * 10) / 10);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(measure);
    observer.observe(copy);
    return () => observer.disconnect();
  }, [pace, signature]);

  const strip = (copy) => (
    <ul
      ref={copy === 0 ? firstCopy : undefined}
      // At least a screen wide, with the messages spread evenly across it.
      className="flex min-w-[100vw] shrink-0 items-center justify-around"
      aria-hidden={copy > 0 ? 'true' : undefined}
    >
      {items.flatMap((item, i) => {
        const Icon = STOREFRONT_ICONS[item.icon];
        return [
          <li key={`${copy}-m${i}`} className="flex shrink-0 items-center px-8 sm:px-12 lg:px-16">
            <span className="announce-item">
              {Icon && <Icon size={13} className="hidden shrink-0 text-gold-soft sm:block" aria-hidden="true" />}
              <span className="leading-8 sm:leading-9">{item.text}</span>
            </span>
          </li>,
          <li key={`${copy}-s${i}`} aria-hidden="true" className="flex shrink-0 items-center">
            <span className="block h-2.5 w-px bg-paper/30 sm:h-3" />
          </li>,
        ];
      })}
    </ul>
  );

  return (
    <div
      // Focusable so keyboard users can stop it too; it holds no links, so focus is never trapped.
      tabIndex={0}
      role="region"
      aria-label="Store information"
      className={`marquee relative h-8 overflow-hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-paper/50 sm:h-9 ${className}`}
      style={{ '--marquee-duration': `${duration ?? items.length * 8}s` }}
    >
      <div className={`marquee-track flex w-max ${direction === 'ltr' ? 'marquee-ltr' : ''}`}>
        {strip(0)}
        {strip(1)}
      </div>
    </div>
  );
}

export default function AnnouncementBar({ announcement, payments, loading = false }) {
  const items = loading ? [] : visibleItems(announcement?.items, payments);
  if (!loading && (!announcement?.enabled || items.length === 0)) return null;

  const moving = !loading && announcement?.motion !== 'still';

  return (
    <div className="bg-ink text-paper" aria-busy={loading || undefined}>
      {moving ? (
        <>
          <MovingMessages items={items} direction={announcement.direction} speed={announcement.speed} className="motion-reduce:hidden" />
          <StillMessages items={items} className="hidden motion-reduce:block" />
        </>
      ) : (
        <StillMessages items={items} />
      )}
    </div>
  );
}
