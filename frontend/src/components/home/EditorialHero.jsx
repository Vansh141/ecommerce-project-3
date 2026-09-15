import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import EditorialImage from './EditorialImage';
import { Button } from '../ui';
import { EDITORIAL_ALT, HERO } from '../../config/storefront';
import { findShoppableCategory } from '../../utils/categories';
import { contentLinkProps } from '../../utils/links';
import { RESPONSIVE_FRAMING_CLASS, responsiveFramingStyle, responsiveImage } from '../../utils/images';
import { heroShade, heroSize } from './heroLayout';

const BACKGROUND_WIDTHS = [480, 768, 1080, 1440, 1920, 2400];

/** A photograph slot that is not loaded yet — a banner still waiting its turn. */
function DeferredPhoto() {
  return <div className="editorial-slot h-full w-full" aria-hidden="true" />;
}

function Headline({ hero, loading, Title, titleId, descriptionClass, exploreTo, exploreLabel }) {
  const buttonLink = contentLinkProps(hero.primaryButtonLink);
  const showButton = Boolean(hero.primaryButtonText && buttonLink);
  const shortLabel = hero.primaryButtonShortText;

  if (loading) {
    // Placeholders the size of the real copy, so nothing moves when it lands.
    return (
      <>
        <Title id={titleId} className="sr-only">TOUCHH</Title>
        <div aria-hidden="true">
          <span className="skeleton block h-3 w-24" />
          <span className="skeleton mt-4 block h-7 w-4/5 sm:h-9" />
          <span className="skeleton mt-2 block h-7 w-3/5 sm:h-9" />
          <span className="skeleton mt-6 block h-11 w-32 rounded-full sm:w-44" />
        </div>
      </>
    );
  }

  return (
    <>
      {hero.eyebrow && (
        <p className="eyebrow-rule animate-rise whitespace-nowrap max-[374px]:gap-2 max-[374px]:tracking-[0.18em] max-[374px]:before:w-4">
          {hero.eyebrow}
        </p>
      )}

      <Title
        id={titleId}
        className={`animate-rise text-display-hero ${hero.eyebrow ? 'mt-3 sm:mt-4' : ''}`}
        style={{ animationDelay: '60ms' }}
      >
        <span className="block">{hero.heading}</span>
        {hero.accentText && <span className="block italic text-clay-deep">{hero.accentText}</span>}
      </Title>

      {hero.description && (
        <p
          className={`mt-3 max-w-[36ch] animate-rise text-sm leading-relaxed text-ink-muted ${descriptionClass}`}
          style={{ animationDelay: '120ms' }}
        >
          {hero.description}
        </p>
      )}

      {showButton && (
        <div
          className="mt-4 flex animate-rise flex-wrap items-center gap-x-5 gap-y-1 sm:mt-6"
          style={{ animationDelay: '180ms' }}
        >
          <Button {...buttonLink} size="sm" className="btn-pill h-11 max-w-full whitespace-nowrap sm:px-6">
            {shortLabel ? (
              // The full built-in label does not fit the narrow phone column.
              <>
                <span className="sm:hidden">{shortLabel}</span>
                <span className="hidden sm:inline">{hero.primaryButtonText}</span>
              </>
            ) : (
              <span className="truncate">{hero.primaryButtonText}</span>
            )}
            <ArrowRight size={14} aria-hidden="true" className="shrink-0" />
          </Button>
          {exploreTo && (
            <Link to={exploreTo} className="link-arrow hidden md:inline-flex lg:hidden">
              {exploreLabel}
            </Link>
          )}
        </div>
      )}
    </>
  );
}

/**
 * The admin's own photo filling the whole banner, with the words over a soft
 * light shade — from the bottom on phones, from the left on larger screens.
 * The banner has a fixed shape per screen size (see heroLayout) and the photo
 * is placed by its saved framing; long words make the banner taller rather
 * than being cut off. A phone image, when uploaded, is the only file phones load.
 */
function BackgroundHero({ hero, headline, titleId, priority, deferImages, className }) {
  const image = hero.image?.url ? hero.image : hero.mobileImage;
  const mobile = hero.image?.url && hero.mobileImage?.url ? hero.mobileImage : null;
  const failedKey = `${image.url}|${mobile?.url || ''}`;
  const [failed, setFailed] = useState(null);

  const large = responsiveImage(image.url, { widths: BACKGROUND_WIDTHS });
  const phone = mobile ? responsiveImage(mobile.url, { widths: BACKGROUND_WIDTHS }) : null;

  return (
    <section
      aria-labelledby={titleId}
      className={`relative isolate grid grid-cols-[minmax(0,1fr)] border-b border-line bg-paper-sunken ${className}`}
    >
      {/* The chosen height lives on a spacer sharing one grid cell with the words, so the
          banner is at least that tall but grows when long words need more room. */}
      <div aria-hidden="true" className={`pointer-events-none w-full self-start [grid-area:1/1] ${heroSize(hero.size).height}`} />
      {!deferImages && failed !== failedKey && (
        <picture className="absolute inset-0 -z-10 block h-full w-full overflow-hidden">
          {phone && (
            <source media="(max-width: 767px)" srcSet={phone.srcSet || phone.src} sizes={phone.srcSet ? '100vw' : undefined} />
          )}
          <img
            src={large.src}
            srcSet={large.srcSet}
            sizes={large.srcSet ? '100vw' : undefined}
            alt={image.alt || ''}
            width={image.width || undefined}
            height={image.height || undefined}
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            // eslint-disable-next-line react/no-unknown-property
            fetchpriority={priority ? 'high' : undefined}
            onError={() => setFailed(failedKey)}
            style={responsiveFramingStyle(image.framing, mobile ? mobile.framing : image.framing)}
            className={`h-full w-full object-cover ${RESPONSIVE_FRAMING_CLASS}`}
          />
        </picture>
      )}
      {/* The admin's shade setting scales the whole light gradient behind the words. */}
      <div
        aria-hidden="true"
        style={{ opacity: heroShade(hero.shade) / 100 }}
        className="absolute inset-0 -z-10 bg-gradient-to-t from-paper via-paper/65 to-transparent
                   md:bg-gradient-to-r md:from-paper md:via-paper/55 md:to-transparent"
      />
      <div className="mx-auto flex w-full max-w-site items-end [grid-area:1/1] md:items-center">
        <div className="w-full max-w-[34rem] px-5 pb-6 pt-10 sm:px-8 sm:pb-8 md:py-8 lg:px-12">{headline}</div>
      </div>
    </section>
  );
}

/**
 * Compact editorial hero.
 *
 * With the website's own photographs it is a strip, like a spread in a fashion
 * magazine: the headline, the photography, a narrow embroidery detail and a
 * closing note — short enough that the categories and first products stay in
 * the first screen.
 *
 * With an uploaded photo, the photo fills the whole banner behind the words
 * (BackgroundHero); the close-up image and caption belong to the strip only.
 *
 * The headline is the page's only h1 and is live text, never baked into an
 * image. The main photograph is the one image that loads with high priority.
 */
export default function EditorialHero({
  hero, builtIn = false, categories = [], loading = false,
  titleId = 'hero-title', titleAs: Title = 'h1', priority = true, deferImages = false, className = '',
}) {
  const exploreCategory = findShoppableCategory(categories, HERO.exploreCategorySlugs);
  const exploreTo = exploreCategory ? `/shop?category=${exploreCategory.slug}` : '/shop';
  const exploreLabel = exploreCategory ? `Explore ${exploreCategory.name.toLowerCase()}` : 'Explore the collection';

  const managedImage = Boolean(hero.image?.url || hero.mobileImage?.url);
  // A banner waiting its turn in the Main Banner keeps its layout but loads no photographs yet.
  const Photo = deferImages ? DeferredPhoto : EditorialImage;

  if (managedImage && !loading) {
    return (
      <BackgroundHero
        hero={hero}
        titleId={titleId}
        priority={priority}
        deferImages={deferImages}
        className={className}
        headline={
          <Headline hero={hero} Title={Title} titleId={titleId} descriptionClass="hidden sm:block" />
        }
      />
    );
  }

  return (
    <section
      aria-labelledby={titleId}
      aria-busy={loading || undefined}
      className={`border-b border-line bg-paper-sunken ${className}`}
    >
      <div
        // Minimum heights, not fixed ones: the strip stays compact, but a
        // headline that needs more room grows the row instead of spilling out.
        className="mx-auto grid h-full min-h-[clamp(14rem,62vw,17.5rem)] max-w-site grid-cols-[minmax(0,1.12fr)_minmax(0,0.88fr)]
                   sm:min-h-[19rem] md:min-h-80 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)_minmax(0,0.75fr)]
                   lg:min-h-[clamp(20rem,22vw,23rem)]
                   lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.85fr)_minmax(0,0.85fr)_minmax(0,0.55fr)_minmax(0,0.95fr)]"
      >
        {/* ── Headline ── */}
        <div className="flex min-w-0 flex-col justify-center py-5 pl-5 pr-3 sm:py-8 sm:pl-8 sm:pr-6 lg:py-6 lg:pl-12 lg:pr-8 xl:pr-12">
          <Headline
            hero={hero}
            loading={loading}
            Title={Title}
            titleId={titleId}
            descriptionClass="hidden sm:block lg:hidden xl:block"
            exploreTo={exploreTo}
            exploreLabel={exploreLabel}
          />
        </div>

        {loading ? (
          <>
            <div className="editorial-slot min-w-0" aria-hidden="true" />
            <div className="editorial-slot hidden min-w-0 border-l-[3px] border-paper md:block" aria-hidden="true" />
            <div className="editorial-slot hidden min-w-0 border-l-[3px] border-paper lg:block" aria-hidden="true" />
          </>
        ) : (
          <>
            {/* ── Portrait: the LCP image on every layout ── */}
            <div className="relative min-w-0 overflow-hidden">
              <Photo
                slot="hero-portrait"
                alt={EDITORIAL_ALT['hero-portrait']}
                priority={priority}
                position="center 20%"
                sizes="(min-width: 1440px) 255px, (min-width: 1024px) 18vw, (min-width: 768px) 27vw, 44vw"
              />
            </div>

            {/* ── Full look: tablets and up ── */}
            <div className="relative hidden min-w-0 overflow-hidden border-l-[3px] border-paper md:block">
              <Photo
                slot="hero-full-length"
                alt={EDITORIAL_ALT['hero-full-length']}
                position="center 15%"
                sizes="(min-width: 1440px) 255px, (min-width: 1024px) 18vw, 27vw"
              />
            </div>

            {/* ── Embroidery detail: desktop ── */}
            <div className="relative hidden min-w-0 overflow-hidden border-l-[3px] border-paper lg:block">
              <Photo
                image={hero.detailImage}
                slot="hero-detail"
                alt={EDITORIAL_ALT['hero-detail']}
                sizes="(min-width: 1440px) 165px, 12vw"
              />
            </div>
          </>
        )}

        {/* ── Closing note: desktop ── */}
        <div className="hidden min-w-0 flex-col justify-center border-l border-line px-7 lg:flex xl:px-10">
          {builtIn ? (
            <p className="font-display text-[1.5rem] leading-tight text-ink xl:text-[1.75rem]">
              {HERO.note.lead}
              <span className="block italic text-clay-deep">{HERO.note.accent}</span>
            </p>
          ) : (
            hero.detailCaption && (
              <p className="font-display text-[1.5rem] leading-tight text-ink xl:text-[1.75rem]">{hero.detailCaption}</p>
            )
          )}
          <span aria-hidden="true" className="mt-5 h-px w-10 bg-gold" />
          <Link to={exploreTo} className="link-arrow mt-2 self-start">
            {exploreLabel}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
