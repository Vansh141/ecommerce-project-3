import { slotImageUrl } from '../../../components/home/editorialSlots';
import { heroSlides } from '../../../config/storefront';
import { framingStyle } from '../../../utils/images';
import { heroShade } from '../../../components/home/heroLayout';
import { SECTION_META, automaticCampaignTiles, categoryRailEntries } from './sectionMeta';
import HeroSlidePreview from './HeroSlidePreview';

/**
 * A small picture of a homepage section, drawn from its actual content — the
 * banner or the photographs the homepage really shows, the category circles,
 * the products it lists today — so the store owner recognises at a glance
 * which part of the homepage a card controls. Where nothing has been uploaded,
 * the site's own bundled photographs are shown, exactly as on the homepage.
 * Purely visual: nothing here is interactive or read aloud.
 */

const TONE_BG = { maroon: 'bg-maroon', olive: 'bg-olive', umber: 'bg-umber', sand: 'bg-paper-sunken', plain: 'bg-paper' };

function Img({ url, className = '', style }) {
  return url
    ? <img src={url} alt="" loading="lazy" style={style} className={`h-full w-full object-cover ${className}`} />
    : <span className={`block h-full w-full bg-line ${className}`} />;
}

function Words({ dark = false, eyebrow, heading, accent, button }) {
  return (
    <span className="flex min-w-0 flex-col justify-center gap-0.5 px-3">
      {eyebrow && <span className={`truncate text-[8px] uppercase tracking-[0.18em] ${dark ? 'text-paper/70' : 'text-ink-muted'}`}>{eyebrow}</span>}
      <span className={`truncate font-display text-[13px] leading-tight ${dark ? 'text-paper' : 'text-ink'}`}>{heading || ' '}</span>
      {accent && <span className="truncate font-display text-[13px] italic leading-tight text-clay-deep">{accent}</span>}
      {button && (
        <span className={`mt-1 w-fit max-w-full truncate rounded-full px-2 py-0.5 text-[8px] uppercase tracking-wider ${dark ? 'border border-paper/70 text-paper' : 'bg-ink text-paper'}`}>
          {button}
        </span>
      )}
    </span>
  );
}

const PROMOTION_SPOT = { left: 'justify-start text-left', center: 'justify-center text-center', right: 'justify-end text-right' };
const PROMOTION_SHADE = { light: 'bg-paper/40', medium: 'bg-ink/30', dark: 'bg-ink/50' };

/** A Full Image promotion: the artwork across the row, fitted as the homepage fits it, with any words over it. */
function PromotionThumb({ item }) {
  const image = item.desktopImage;
  const cover = item.imageFit === 'cover';
  const hasWords = Boolean(item.eyebrow || item.title || item.description || item.buttonText);
  return (
    <span className="relative block min-h-0 overflow-hidden bg-paper-sunken">
      {image?.url ? (
        <img
          src={image.url}
          alt=""
          loading="lazy"
          style={cover ? framingStyle(image.framing) : undefined}
          className={`absolute inset-0 h-full w-full ${cover ? 'object-cover' : 'object-contain'}`}
        />
      ) : (
        <span className="absolute inset-0 bg-line" />
      )}
      {hasWords && (
        <>
          <span className={`absolute inset-0 ${PROMOTION_SHADE[item.overlay] || PROMOTION_SHADE.medium}`} />
          <span className={`absolute inset-0 flex items-center ${PROMOTION_SPOT[item.textPosition] || PROMOTION_SPOT.left}`}>
            <span className="max-w-[70%]">
              <Words dark={item.overlay !== 'light'} eyebrow={item.eyebrow} heading={item.title} button={item.buttonText} />
            </span>
          </span>
        </>
      )}
    </span>
  );
}

export default function SectionPreview({ section, categories = [], products }) {
  let body;
  switch (section.type) {
    case 'hero': {
      const all = heroSlides(section);
      const shown = all.filter((slide) => slide.enabled !== false);
      body = (
        <span className="relative block h-full">
          <HeroSlidePreview slide={shown[0] || all[0]} />
          {all.length > 1 && (
            <span className="absolute bottom-1.5 right-1.5 rounded-full bg-ink/85 px-2 py-0.5 text-[9px] font-medium text-paper">
              {shown.length} {shown.length === 1 ? 'banner' : 'banners'}
            </span>
          )}
        </span>
      );
      break;
    }
    case 'categoryRail': {
      const entries = categoryRailEntries(section, categories).filter((entry) => entry.enabled).slice(0, 6);
      body = (
        <span className="flex h-full items-center justify-center gap-2 px-2">
          {entries.length === 0 && <span className="text-2xs text-ink-faint">No categories yet</span>}
          {entries.map((entry) => (
            <span key={entry.key} className="flex w-11 min-w-0 flex-col items-center gap-0.5">
              <span className="h-9 w-9 overflow-hidden rounded-full border border-line"><Img url={entry.url} /></span>
              <span className="w-full truncate text-center text-[9px] text-ink-muted">{entry.name}</span>
            </span>
          ))}
        </span>
      );
      break;
    }
    case 'productCollection':
    case 'productRail': {
      const list = (products || []).slice(0, 4);
      body = (
        <span className="grid h-full grid-cols-4 gap-1.5 p-2">
          {list.length === 0 && <span className="col-span-4 flex items-center justify-center text-2xs text-ink-faint">No products match right now</span>}
          {list.map((product) => (
            <span key={product._id} className="flex min-w-0 flex-col bg-paper-sunken">
              <span className="block min-h-0 flex-1 overflow-hidden"><Img url={product.images?.[0]?.url} /></span>
              <span className="truncate px-0.5 text-[8px] leading-tight text-ink-muted">{product.name}</span>
            </span>
          ))}
        </span>
      );
      break;
    }
    case 'editorial': {
      if (section.display === 'fullImage') {
        const light = section.overlay === 'light';
        const spot = { left: 'justify-start text-left', center: 'justify-center text-center', right: 'justify-end text-right' }[section.textPosition] || 'justify-start text-left';
        body = (
          <span className="relative block h-full">
            <Img url={section.image?.url || slotImageUrl('story')} style={framingStyle(section.image?.framing)} className="absolute inset-0" />
            <span
              style={{ opacity: heroShade(section.shade, 100) / 100 }}
              className={`absolute inset-0 ${light ? 'bg-paper/45' : 'bg-ink/40'}`}
            />
            <span className={`absolute inset-0 flex items-center ${spot}`}>
              <span className="max-w-[70%]">
                <Words dark={!light} eyebrow={section.eyebrow} heading={section.heading} button={section.buttonText} />
              </span>
            </span>
          </span>
        );
        break;
      }
      const dark = section.theme !== 'sand';
      const picture = <span className="block overflow-hidden"><Img url={section.image?.url || slotImageUrl('story')} style={framingStyle(section.image?.framing)} /></span>;
      const words = <Words dark={dark} eyebrow={section.eyebrow} heading={section.heading} button={section.buttonText} />;
      body = (
        <span className={`grid h-full grid-cols-2 ${TONE_BG[section.theme] || TONE_BG.umber}`}>
          {section.layout === 'imageLeft' ? <>{picture}{words}</> : <>{words}{picture}</>}
        </span>
      );
      break;
    }
    case 'campaign': {
      const tiles = section.source === 'custom'
        ? (section.items || []).filter((i) => i.enabled !== false).slice(0, 2).map((i) => (
          i.layout === 'fullImage' ? { banner: i } : { title: i.title, tone: i.tone, url: i.desktopImage?.url }
        ))
        : automaticCampaignTiles(categories);
      // A Full Image promotion fills a whole row on the homepage, so rows stack here too.
      const stacked = tiles.some((tile) => tile.banner);
      body = (
        <span className={`grid h-full gap-1.5 p-2 ${stacked ? 'auto-rows-fr' : 'grid-cols-2'}`}>
          {tiles.length === 0 && <span className="col-span-2 flex items-center justify-center text-2xs text-ink-faint">No promotions to show yet</span>}
          {tiles.map((tile, i) => (tile.banner ? <PromotionThumb key={i} item={tile.banner} /> : (
            <span key={i} className={`relative overflow-hidden ${TONE_BG[tile.tone] || TONE_BG.umber}`}>
              {tile.url && <Img url={tile.url} className="absolute inset-0 opacity-70" />}
              <span className="absolute bottom-1 left-1.5 right-1.5 truncate font-display text-[11px] text-paper">{tile.title}</span>
            </span>
          )))}
        </span>
      );
      break;
    }
    case 'trust':
      body = (
        <span className="grid h-full grid-cols-4 items-center gap-2 px-3">
          {(section.items || []).filter((item) => item.enabled !== false).slice(0, 4).map((item, i) => (
            <span key={i} className="flex min-w-0 flex-col items-center gap-1">
              <span className="h-4 w-4 rounded-full border border-ink/50" />
              <span className="w-full truncate text-center text-[9px] text-ink-muted">{item.title}</span>
            </span>
          ))}
        </span>
      );
      break;
    case 'brandMessage':
      body = (
        <span className={`flex h-full flex-col justify-center gap-1 px-4 ${section.alignment === 'left' ? 'items-start' : 'items-center'} ${TONE_BG[section.theme] || TONE_BG.plain}`}>
          <span className="max-w-full truncate font-display text-[13px] text-ink">{section.title || 'About the brand'}</span>
          <span className="max-w-full truncate text-[9px] text-ink-muted">{section.description}</span>
        </span>
      );
      break;
    default:
      body = null;
  }

  return (
    <span
      aria-hidden="true"
      title={`Preview of ${SECTION_META[section.type]?.label || 'this section'}`}
      className={`block h-24 w-full overflow-hidden rounded-control border border-line bg-paper ${section.enabled ? '' : 'opacity-50 grayscale'}`}
    >
      {body}
    </span>
  );
}
