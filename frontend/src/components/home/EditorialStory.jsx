import { ArrowRight } from 'lucide-react';
import EditorialImage from './EditorialImage';
import { Button } from '../ui';
import { EDITORIAL_ALT } from '../../config/storefront';
import { contentLinkProps } from '../../utils/links';
import OverlayContent from './OverlayContent';
import { heroShade } from './heroLayout';

/**
 * Editorial panel — "Style your story" by default.
 *
 * A split panel rather than a full-bleed banner, so a photograph around
 * 1,000px wide still looks sharp. Copy, image, side and background come from
 * the homepage builder; the proportions, type and spacing stay the design's.
 * `to` overrides the link for the built-in content, which leads to featured
 * pieces when there are any.
 */

const THEMES = {
  umber: { panel: 'bg-umber', eyebrow: 'text-gold-soft', heading: 'text-paper', body: 'text-paper/75', rule: 'bg-gold', button: 'outline-light' },
  maroon: { panel: 'bg-maroon', eyebrow: 'text-gold-soft', heading: 'text-paper', body: 'text-paper/75', rule: 'bg-gold', button: 'outline-light' },
  olive: { panel: 'bg-olive', eyebrow: 'text-gold-soft', heading: 'text-paper', body: 'text-paper/75', rule: 'bg-gold', button: 'outline-light' },
  sand: { panel: 'bg-paper-sunken', eyebrow: 'text-clay-deep', heading: 'text-ink', body: 'text-ink-muted', rule: 'bg-clay', button: 'secondary' },
};

/**
 * Full Image: the photograph fills the whole panel and the words sit over it.
 * The panel's height comes from the design, never from the picture, and the
 * photograph covers it — phones use the phone image when there is one.
 */
function FullImageStory({ story, to, loading }) {
  const titleId = `${story.id || 'story'}-title`;
  return (
    <section aria-labelledby={titleId} aria-busy={loading || undefined} className="shell pt-10 sm:pt-14 lg:pt-16">
      <div className="relative isolate h-[clamp(26rem,112vw,32rem)] overflow-hidden rounded-card bg-umber sm:h-[28rem] lg:h-[34rem]">
        <div className="absolute inset-0">
          {loading ? (
            <div className="editorial-slot h-full w-full" aria-hidden="true" />
          ) : (
            <EditorialImage
              image={story.image}
              mobileImage={story.mobileImage}
              slot="story"
              alt={EDITORIAL_ALT.story}
              position="center 30%"
              sizes="(min-width: 1440px) 1344px, 100vw"
            />
          )}
        </div>
        <OverlayContent
          content={{
            eyebrow: story.eyebrow,
            heading: story.heading,
            description: story.description,
            buttonText: story.buttonText,
            buttonShortText: story.buttonShortText,
            link: to || story.buttonLink,
          }}
          position={story.textPosition}
          overlay={story.overlay}
          titleId={titleId}
          titleAs="h2"
          size="section"
          loading={loading}
          shade={heroShade(story.shade, 100)}
        />
      </div>
    </section>
  );
}

export default function EditorialStory({ story, to, loading = false }) {
  if (story.display === 'fullImage') return <FullImageStory story={story} to={to} loading={loading} />;
  const theme = THEMES[story.theme] || THEMES.umber;
  const imageFirst = story.layout === 'imageLeft';
  const titleId = `${story.id || 'story'}-title`;
  const buttonLink = contentLinkProps(to || story.buttonLink);
  const showButton = Boolean(story.buttonText && buttonLink);

  return (
    <section aria-labelledby={titleId} aria-busy={loading || undefined} className="shell pt-10 sm:pt-14 lg:pt-16">
      {/* Phones stack photo over words; larger screens split. The photo is
          absolutely filled so only the design and the words set the height. */}
      <div
        className={`flex flex-col overflow-hidden rounded-card sm:grid sm:min-h-[20rem] md:min-h-[22rem] lg:min-h-[26rem] ${theme.panel} ${
          imageFirst
            ? 'sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-cols-[minmax(0,32.5rem)_minmax(0,1fr)]'
            : 'sm:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,32.5rem)]'
        }`}
      >
        <div
          className={`flex min-w-0 flex-col justify-center px-6 py-8 sm:px-8 sm:py-10 md:px-10 lg:px-16 lg:py-12 ${
            imageFirst ? 'sm:order-2' : ''
          }`}
        >
          <div className="flex w-full max-w-[28rem] flex-col items-start">
            {story.eyebrow && (
              <p className={`text-[0.6875rem] font-medium uppercase tracking-[0.22em] ${theme.eyebrow}`}>{story.eyebrow}</p>
            )}
            <h2
              id={titleId}
              className={`mt-3 font-display text-[clamp(1.625rem,7.4vw,2rem)] leading-[1.1] sm:text-[2.125rem] lg:text-[2.625rem] ${theme.heading}`}
            >
              {loading ? <span className="sr-only">{story.heading}</span> : story.heading}
            </h2>
            <span aria-hidden="true" className={`mt-5 block h-px w-10 ${theme.rule}`} />
            {story.description && !loading && (
              <p className={`mt-5 max-w-[38ch] text-sm leading-relaxed lg:text-[0.9375rem] ${theme.body}`}>
                {story.description}
              </p>
            )}
            {showButton && !loading && (
              <Button
                {...buttonLink}
                variant={theme.button}
                size="sm"
                className="btn-pill mt-7 h-11 max-w-full whitespace-nowrap px-6 lg:mt-8"
              >
                {story.buttonShortText ? (
                  <>
                    <span className="sm:hidden">{story.buttonShortText}</span>
                    <span className="hidden sm:inline">{story.buttonText}</span>
                  </>
                ) : (
                  <span className="truncate">{story.buttonText}</span>
                )}
                <ArrowRight size={14} aria-hidden="true" className="shrink-0" />
              </Button>
            )}
          </div>
        </div>

        <div
          className={`relative order-first h-[clamp(15rem,68vw,18rem)] min-w-0 sm:h-auto ${
            imageFirst ? 'sm:order-1' : 'sm:order-2'
          }`}
        >
          {/* Clipped, so a zoomed photo never spills over the words beside it. */}
          <div className="absolute inset-0 overflow-hidden">
            {loading ? (
              <div className="editorial-slot h-full w-full" aria-hidden="true" />
            ) : (
              <EditorialImage
                image={story.image}
                mobileImage={story.mobileImage}
                slot="story"
                alt={EDITORIAL_ALT.story}
                position="center 25%"
                sizes="(min-width: 1024px) 520px, (min-width: 640px) 45vw, 100vw"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
