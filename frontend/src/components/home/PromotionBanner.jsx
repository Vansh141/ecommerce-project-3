import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import ContentLink from './ContentLink';
import OverlayContent, { hasOverlayWords } from './OverlayContent';
import { Button } from '../ui';
import { contentLinkProps } from '../../utils/links';
import { RESPONSIVE_FRAMING_CLASS, responsiveFramingStyle, responsiveImage } from '../../utils/images';
import { PROMOTION_CONTAIN_BOUNDS, PROMOTION_FILL_CLASS, boundedRatio } from './promotionLayout';

/**
 * Full Image promotion: one uploaded artwork that is the whole banner, with
 * optional words laid over it.
 *
 * - Fill banner (`imageFit: 'cover'`): the banner has the design's shape at
 *   each screen size and the artwork covers it, placed by its saved framing.
 * - Show full image (`'contain'`): the banner takes the artwork's own shape,
 *   within bounds, and nothing is cropped. On a phone with no phone image the
 *   wide artwork is too short for words over it, so they sit below it there.
 * - One `<picture>` switches to the phone image under 768px, so a phone
 *   downloads only that file.
 * - With no button, the whole banner is one link (links cannot contain links).
 */

const WIDTHS = [480, 720, 960, 1280, 1600, 1920];
const SIZES = '(min-width: 1440px) 1344px, calc(100vw - 40px)';
const WIDE_ON_PHONE_BOUNDS = [1.5, 4];

const ratioValue = (ratio) => String(Number(ratio.toFixed(4)));

function WordsBelow({ words, hasButton }) {
  return (
    <div className="flex flex-col items-start px-5 pb-6 pt-5 sm:px-8 md:hidden">
      {words.eyebrow && (
        <p className="text-[0.6875rem] font-medium uppercase tracking-[0.22em] text-clay-deep">{words.eyebrow}</p>
      )}
      {words.heading && <h3 className="mt-2 font-display text-[1.5rem] leading-[1.12] text-ink">{words.heading}</h3>}
      {words.description && <p className="mt-2 max-w-[40ch] text-sm leading-relaxed text-ink-muted">{words.description}</p>}
      {hasButton && (
        <Button {...contentLinkProps(words.link)} size="sm" className="btn-pill mt-4 h-11 max-w-full whitespace-nowrap">
          <span className="truncate">{words.buttonText}</span>
          <ArrowRight size={14} aria-hidden="true" className="shrink-0" />
        </Button>
      )}
    </div>
  );
}

export default function PromotionBanner({ item }) {
  const desktop = item.desktopImage;
  const mobile = item.mobileImage?.url ? item.mobileImage : null;
  const cover = item.imageFit === 'cover';
  const failedKey = `${desktop.url}|${mobile?.url || ''}`;
  const [failed, setFailed] = useState(null);

  const words = {
    eyebrow: item.eyebrow,
    heading: item.title,
    description: item.description,
    buttonText: item.buttonText,
    link: item.link,
  };
  const hasWords = hasOverlayWords(words);
  const hasButton = Boolean(item.buttonText && contentLinkProps(item.link));
  const alt = desktop.alt || '';
  const wordsBelowOnPhones = hasWords && !cover && !mobile;

  const desktopSource = responsiveImage(desktop.url, { widths: WIDTHS });
  const mobileSource = mobile ? responsiveImage(mobile.url, { widths: WIDTHS }) : null;

  const shape = cover ? PROMOTION_FILL_CLASS : '[aspect-ratio:var(--promo-ar-sm)] md:[aspect-ratio:var(--promo-ar-md)]';
  const ratios = cover
    ? undefined
    : {
      '--promo-ar-sm': ratioValue(
        mobile
          ? boundedRatio(mobile, PROMOTION_CONTAIN_BOUNDS.phone, 1)
          : boundedRatio(desktop, WIDE_ON_PHONE_BOUNDS, 3)
      ),
      '--promo-ar-md': ratioValue(boundedRatio(desktop, PROMOTION_CONTAIN_BOUNDS.large, 3)),
    };

  const image = failed === failedKey ? (
    <div className="editorial-slot" {...(alt ? { role: 'img', 'aria-label': alt } : { 'aria-hidden': true })} />
  ) : (
    <picture className="block h-full w-full">
      {mobileSource && (
        <source
          media="(max-width: 767px)"
          srcSet={mobileSource.srcSet || mobileSource.src}
          sizes={mobileSource.srcSet ? SIZES : undefined}
        />
      )}
      <img
        src={desktopSource.src}
        srcSet={desktopSource.srcSet}
        sizes={desktopSource.srcSet ? SIZES : undefined}
        alt={alt}
        width={desktop.width || undefined}
        height={desktop.height || undefined}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(failedKey)}
        style={cover ? responsiveFramingStyle(desktop.framing, mobile ? mobile.framing : desktop.framing) : undefined}
        className={
          cover
            ? `h-full w-full object-cover ${RESPONSIVE_FRAMING_CLASS} transition-transform duration-1000 ease-luxe can-hover:group-hover:scale-[1.04]`
            : 'h-full w-full object-contain object-center'
        }
      />
    </picture>
  );

  // The words are the box's only in-flow content, so when long copy needs more
  // height than the artwork's shape allows, the banner grows instead of clipping it.
  const content = (
    <>
      <div className={`relative grid ${shape}`} style={ratios}>
        <div className="absolute inset-0">{image}</div>
        {hasWords && (
          <div className={wordsBelowOnPhones ? 'hidden md:contents' : 'contents'}>
            <OverlayContent
              content={words}
              position={item.textPosition}
              overlay={item.overlay}
              titleAs="h3"
              size="promotion"
            />
          </div>
        )}
      </div>
      {wordsBelowOnPhones && <WordsBelow words={words} hasButton={hasButton} />}
    </>
  );

  const frame = 'block overflow-hidden rounded-card bg-paper-sunken';

  if (hasButton) return <div className={frame}>{content}</div>;
  return (
    <ContentLink href={item.link} aria-label={hasWords ? undefined : alt || undefined} className={`group ${frame}`}>
      {content}
    </ContentLink>
  );
}
