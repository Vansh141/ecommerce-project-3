import ContentLink from './ContentLink';
import OverlayContent, { hasOverlayWords } from './OverlayContent';
import { contentLinkProps } from '../../utils/links';
import { responsiveImage } from '../../utils/images';

/**
 * Full Banner: one uploaded image that is the whole hero.
 *
 * - The image covers the complete banner area. The banner's height comes from
 *   the design system — phones and larger screens each have their own
 *   controlled height — never from the picture, so a very tall or very wide
 *   upload cannot change the size of the homepage hero.
 * - Desktop and phone artwork are separate files. One `<picture>` picks the
 *   right one for the viewport, so a phone downloads only its own image; with
 *   no phone image, phones use the desktop image.
 * - Optional words and a button sit over the image (left, centre or right),
 *   with light, medium or dark shading behind them. With no words, the image
 *   is shown untouched and its description is the heading for screen readers.
 * - The whole banner is one link when it has a destination and no button of
 *   its own (links cannot contain links).
 *
 * In the Main Banner rotation a banner can be rendered before its turn with
 * `deferImage`: it keeps its size, but no image is requested yet.
 */

const DESKTOP_WIDTHS = [768, 1024, 1280, 1600, 1920, 2400];
const MOBILE_WIDTHS = [480, 720, 1080, 1440];

export default function FullBannerHero({
  banner, onError, titleId = 'hero-title', titleAs: Title = 'h1', priority = true, deferImage = false, className = '',
}) {
  const desktop = banner.desktopImage;
  const mobile = banner.mobileImage?.url ? banner.mobileImage : null;
  const desktopSource = responsiveImage(desktop.url, { widths: DESKTOP_WIDTHS });
  const mobileSource = mobile ? responsiveImage(mobile.url, { widths: MOBILE_WIDTHS }) : null;
  const description = banner.alt || 'Featured collection';

  const words = {
    eyebrow: banner.eyebrow,
    heading: banner.heading,
    accentText: banner.accentText,
    description: banner.description,
    buttonText: banner.buttonText,
    link: banner.buttonLink,
  };
  const visibleHeading = Boolean(banner.heading || banner.accentText);
  const hasButton = Boolean(banner.buttonText && contentLinkProps(banner.buttonLink));
  const wholeLink = !hasButton && contentLinkProps(banner.link) ? banner.link : null;

  const picture = deferImage ? null : (
    <picture className="absolute inset-0 block h-full w-full">
      {mobileSource && (
        <source
          media="(max-width: 767px)"
          srcSet={mobileSource.srcSet || mobileSource.src}
          sizes={mobileSource.srcSet ? '100vw' : undefined}
        />
      )}
      <img
        src={desktopSource.src}
        srcSet={desktopSource.srcSet}
        sizes={desktopSource.srcSet ? '(min-width: 1920px) 1920px, 100vw' : undefined}
        alt={description}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        // eslint-disable-next-line react/no-unknown-property
        fetchpriority={priority ? 'high' : undefined}
        onError={onError}
        className="h-full w-full object-cover object-center"
      />
    </picture>
  );

  return (
    <section aria-labelledby={titleId} className={`flex flex-col justify-center border-b border-line bg-paper-sunken ${className}`}>
      {!visibleHeading && <Title id={titleId} className="sr-only">{description}</Title>}
      <div className="relative mx-auto h-[clamp(26rem,122vw,34rem)] w-full max-w-[1920px] overflow-hidden md:h-[clamp(20rem,38vw,38rem)]">
        {wholeLink ? (
          <ContentLink
            href={wholeLink}
            aria-label={description}
            className="absolute inset-0 block focus-visible:ring-inset focus-visible:ring-offset-0"
          >
            {picture}
          </ContentLink>
        ) : (
          picture
        )}
        {hasOverlayWords(words) && (
          <OverlayContent
            content={words}
            position={banner.textPosition}
            overlay={banner.overlay}
            titleId={titleId}
            titleAs={Title}
            size="hero"
          />
        )}
      </div>
    </section>
  );
}
