import { useState } from 'react';
import {
  RESPONSIVE_FRAMING_CLASS, hasCustomFraming, responsiveFramingStyle, responsiveImage,
} from '../../utils/images';

/**
 * Editorial photograph.
 *
 * Two sources, in order:
 *  1. `image` / `mobileImage` — uploaded in Admin → Storefront. When both are
 *     set, one `<picture>` picks the right file for the viewport, so a phone
 *     never downloads the desktop crop as well.
 *  2. `slot` — the bundled photographs produced by `npm run assets:editorial`
 *     from `touch-assets/`, named `<slot>-<width>x<height>.<avif|webp>` and
 *     discovered at build time.
 *
 * An uploaded image that fails to load falls back to the bundled photograph,
 * and a slot with no files renders a quiet placeholder — never a broken image.
 */
import { SLOTS } from './editorialSlots';

const toSrcSet = (files) => files.map((f) => `${f.url} ${f.width}w`).join(', ');

/** Widths offered for uploaded images; resizable hosts serve only what is needed. */
const MANAGED_WIDTHS = [360, 540, 720, 960, 1280, 1600];
const DESKTOP_MEDIA = '(min-width: 768px)';

export const hasEditorialImage = (slot) => Boolean(SLOTS[slot]?.webp.length);

export default function EditorialImage({
  slot, image, mobileImage, alt = '', sizes, priority = false, position, className = '',
}) {
  const managedKey = `${image?.url || ''}|${mobileImage?.url || ''}`;
  const [failedKey, setFailedKey] = useState(null);
  const managedFailed = failedKey === managedKey;

  const desktop = !managedFailed && image?.url ? image : null;
  const mobile = !managedFailed && mobileImage?.url ? mobileImage : null;

  if (desktop || mobile) {
    const small = mobile || desktop;
    const smallSource = responsiveImage(small.url, { widths: MANAGED_WIDTHS });
    const desktopSource = desktop && mobile && desktop.url !== mobile.url
      ? responsiveImage(desktop.url, { widths: MANAGED_WIDTHS })
      : null;
    // Framing saved in the admin image editor wins over the design's default position.
    const largeFraming = (desktop || mobile).framing;
    const phoneFraming = mobile ? mobile.framing : largeFraming;
    const framed = hasCustomFraming(largeFraming) || hasCustomFraming(phoneFraming);

    return (
      <picture className={`absolute inset-0 block h-full w-full ${className}`}>
        {desktopSource && (
          <source
            media={DESKTOP_MEDIA}
            srcSet={desktopSource.srcSet || desktopSource.src}
            sizes={desktopSource.srcSet ? sizes : undefined}
          />
        )}
        <img
          src={smallSource.src}
          srcSet={smallSource.srcSet}
          sizes={smallSource.srcSet ? sizes : undefined}
          alt={(desktop || mobile).alt || alt}
          width={small.width || undefined}
          height={small.height || undefined}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          // eslint-disable-next-line react/no-unknown-property
          fetchpriority={priority ? 'high' : undefined}
          style={framed ? responsiveFramingStyle(largeFraming, phoneFraming) : position ? { objectPosition: position } : undefined}
          className={`h-full w-full object-cover ${framed ? RESPONSIVE_FRAMING_CLASS : ''}`}
          onError={() => setFailedKey(managedKey)}
        />
      </picture>
    );
  }

  const entry = SLOTS[slot];

  if (!entry?.webp.length) {
    return (
      <div className={`editorial-slot ${className}`} aria-hidden="true">
        {import.meta.env.DEV && slot && (
          <span className="absolute bottom-2 left-2 rounded-control bg-paper-raised/90 px-1.5 py-1 font-mono text-[10px] text-ink-muted">
            touch-assets/{slot}
          </span>
        )}
      </div>
    );
  }

  const largest = entry.webp[entry.webp.length - 1];
  const fallback = entry.webp[Math.min(1, entry.webp.length - 1)];

  return (
    <picture className={`block h-full w-full ${className}`}>
      {entry.avif.length > 0 && <source type="image/avif" srcSet={toSrcSet(entry.avif)} sizes={sizes} />}
      <source type="image/webp" srcSet={toSrcSet(entry.webp)} sizes={sizes} />
      <img
        src={fallback.url}
        alt={alt}
        width={largest.width}
        height={largest.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        // All-lowercase on purpose: React 18 drops the camelCase prop with a
        // warning but passes an unknown lowercase attribute through.
        // eslint-disable-next-line react/no-unknown-property
        fetchpriority={priority ? 'high' : undefined}
        style={position ? { objectPosition: position } : undefined}
        className="h-full w-full object-cover"
      />
    </picture>
  );
}
