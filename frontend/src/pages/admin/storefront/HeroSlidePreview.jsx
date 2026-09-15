import { slotImageUrl } from '../../../components/home/editorialSlots';
import { framingStyle } from '../../../utils/images';
import { heroShade } from '../../../components/home/heroLayout';

/**
 * A small picture of one Main Banner, made from its real images and words.
 * The phone view uses the phone image when there is one, as the homepage does.
 * A Full Banner is the image filling the whole frame, with any words laid over
 * it where the homepage puts them. Where nothing is uploaded, the site's own
 * photographs are shown.
 */

function Picture({ url, className = '' }) {
  return url
    ? <img src={url} alt="" loading="lazy" className={`h-full w-full object-cover ${className}`} />
    : <span className={`block h-full w-full bg-line ${className}`} />;
}

function Words({ eyebrow, heading, accent, button }) {
  return (
    <span className="flex min-w-0 flex-col justify-center gap-0.5 px-2.5">
      {eyebrow && <span className="truncate text-[8px] uppercase tracking-[0.18em] text-ink-muted">{eyebrow}</span>}
      <span className="truncate font-display text-[12px] leading-tight text-ink">{heading || ' '}</span>
      {accent && <span className="truncate font-display text-[12px] italic leading-tight text-clay-deep">{accent}</span>}
      {button && (
        <span className="mt-1 w-fit max-w-full truncate rounded-full bg-ink px-2 py-0.5 text-[8px] uppercase tracking-wider text-paper">
          {button}
        </span>
      )}
    </span>
  );
}

const SPOT = {
  left: 'items-center justify-start text-left',
  center: 'items-center justify-center text-center',
  right: 'items-center justify-end text-right',
};

function BannerWords({ banner, phone }) {
  const dark = banner.overlay !== 'light';
  const position = phone ? 'left' : banner.textPosition || 'left';
  const shade = phone
    ? (dark ? 'bg-gradient-to-t from-ink/70 via-ink/25 to-transparent' : 'bg-gradient-to-t from-paper/85 via-paper/40 to-transparent')
    : position === 'left'
      ? (dark ? 'bg-gradient-to-r from-ink/60 via-ink/20 to-transparent' : 'bg-gradient-to-r from-paper/80 via-paper/30 to-transparent')
      : position === 'right'
        ? (dark ? 'bg-gradient-to-l from-ink/60 via-ink/20 to-transparent' : 'bg-gradient-to-l from-paper/80 via-paper/30 to-transparent')
        : (dark ? 'bg-ink/35' : 'bg-paper/45');

  return (
    <>
      <span className={`absolute inset-0 ${shade}`} />
      <span className={`absolute inset-0 flex p-2 ${phone ? 'items-end justify-start text-left' : SPOT[position]}`}>
        <span className={`flex max-w-[72%] flex-col gap-0.5 ${position === 'center' && !phone ? 'items-center' : position === 'right' && !phone ? 'items-end' : 'items-start'}`}>
          {banner.eyebrow && (
            <span className={`truncate text-[7px] uppercase tracking-[0.18em] ${dark ? 'text-paper/80' : 'text-ink-muted'}`}>{banner.eyebrow}</span>
          )}
          {(banner.heading || banner.accentText) && (
            <span className={`font-display text-[11px] leading-tight ${dark ? 'text-paper' : 'text-ink'}`}>
              {banner.heading} {banner.accentText && <em>{banner.accentText}</em>}
            </span>
          )}
          {banner.buttonText && (
            <span className={`mt-0.5 w-fit max-w-full truncate rounded-full px-1.5 py-0.5 text-[7px] uppercase tracking-wider ${dark ? 'bg-paper text-ink' : 'bg-ink text-paper'}`}>
              {banner.buttonText}
            </span>
          )}
        </span>
      </span>
    </>
  );
}

export default function HeroSlidePreview({ slide, device = 'desktop' }) {
  if (!slide) return null;
  const phone = device === 'phone';

  if (slide.mode === 'banner') {
    const banner = slide.banner || {};
    const url = phone ? banner.mobileImage?.url || banner.desktopImage?.url : banner.desktopImage?.url;
    if (!url) {
      return <span className="flex h-full items-center justify-center p-2 text-center text-2xs text-ink-faint">No image yet</span>;
    }
    const hasWords = Boolean(banner.eyebrow || banner.heading || banner.accentText || banner.buttonText);
    return (
      <span className="relative block h-full w-full">
        <img src={url} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
        {hasWords && <BannerWords banner={banner} phone={phone} />}
      </span>
    );
  }

  const hero = slide.structured || {};
  const ownImage = phone
    ? (hero.mobileImage?.url ? hero.mobileImage : hero.image)
    : (hero.image?.url ? hero.image : hero.mobileImage);
  const own = ownImage?.url;

  // With its own photo, the photo fills the banner behind the words, as on the homepage.
  if (own) {
    return (
      <span className="relative block h-full w-full overflow-hidden bg-paper-sunken">
        <img src={own} alt="" loading="lazy" style={framingStyle(ownImage.framing)} className="absolute inset-0 h-full w-full object-cover" />
        <span
          style={{ opacity: heroShade(hero.shade) / 100 }}
          className={`absolute inset-0 ${phone ? 'bg-gradient-to-t from-paper via-paper/65 to-transparent' : 'bg-gradient-to-r from-paper via-paper/55 to-transparent'}`}
        />
        <span className={`absolute inset-0 flex ${phone ? 'items-end pb-1.5' : 'items-center'}`}>
          <span className="max-w-[65%]">
            <Words eyebrow={hero.eyebrow} heading={hero.heading} accent={hero.accentText} button={hero.primaryButtonText} />
          </span>
        </span>
      </span>
    );
  }

  if (phone) {
    return (
      <span className="grid h-full grid-rows-[1fr_auto] bg-paper-sunken">
        <span className="block min-h-0 overflow-hidden"><Picture url={own || slotImageUrl('hero-portrait')} /></span>
        <span className="block truncate px-1 py-1 text-center font-display text-[9px] leading-tight text-ink">{hero.heading || ' '}</span>
      </span>
    );
  }

  return (
    <span className="grid h-full grid-cols-[1.3fr_0.7fr_0.7fr] bg-paper-sunken">
      <Words eyebrow={hero.eyebrow} heading={hero.heading} accent={hero.accentText} button={hero.primaryButtonText} />
      {own ? (
        <span className="col-span-2 block overflow-hidden"><Picture url={own} /></span>
      ) : (
        <>
          <span className="block overflow-hidden"><Picture url={slotImageUrl('hero-portrait')} /></span>
          <span className="block overflow-hidden border-l-2 border-paper"><Picture url={slotImageUrl('hero-full-length')} /></span>
        </>
      )}
    </span>
  );
}
