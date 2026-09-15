import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import ContentLink from './ContentLink';
import PromotionBanner from './PromotionBanner';
import { SectionHeading } from '../ui';
import { CAMPAIGN_TILES } from '../../config/storefront';
import { findShoppableCategory } from '../../utils/categories';
import { contentLinkProps } from '../../utils/links';
import { responsiveImage } from '../../utils/images';

const TONES = { maroon: 'bg-maroon', olive: 'bg-olive', umber: 'bg-umber' };
const TILE_WIDTHS = [360, 540, 720, 960, 1280];

/**
 * Campaign tiles.
 *
 * Two sources, chosen in the homepage builder:
 *
 *  - `categories`: the automatic festive and everyday tiles, shown only when
 *    a matching category exists and holds products, with its real name.
 *  - `custom`: the admin's own campaigns — Festive edit, Wedding edit, a Diwali
 *    collection — each with desktop and optional mobile artwork, copy and link.
 *    A Split Layout promotion is a tile; a Full Image one is a banner across
 *    the whole row. Both appear in the order the admin set.
 */

const isTile = (entry) => Boolean(entry) && !entry.banner;
function categoryTiles(categories) {
  const seen = new Set();
  return CAMPAIGN_TILES.map((tile) => ({ tile, category: findShoppableCategory(categories, tile.categorySlugs) }))
    .filter(({ category }) => {
      if (!category || seen.has(category._id)) return false;
      seen.add(category._id);
      return true;
    })
    .map(({ tile, category }) => ({
      key: tile.key,
      eyebrow: category.name,
      title: tile.title,
      subtitle: tile.subtitle,
      cta: tile.cta,
      tone: tile.tone,
      href: `/shop?category=${category.slug}`,
      image: category.image?.url ? { url: category.image.url } : null,
      mobileImage: null,
      alt: '',
    }));
}

function customTiles(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && item.enabled !== false && contentLinkProps(item.link) && (
      item.layout === 'fullImage'
        ? item.desktopImage?.url && (item.title || item.desktopImage.alt)
        : item.title
    ))
    .map((item, index) => (item.layout === 'fullImage'
      ? { key: `custom-${index}`, banner: item }
      : {
        key: `custom-${index}`,
        eyebrow: item.eyebrow,
        title: item.title,
        subtitle: item.description,
        cta: item.buttonText,
        tone: item.tone,
        href: item.link,
        image: item.desktopImage?.url ? item.desktopImage : null,
        mobileImage: item.mobileImage?.url ? item.mobileImage : null,
        alt: item.desktopImage?.alt || '',
      }));
}

function TileImage({ image, mobileImage, alt, single }) {
  const failedKey = `${image?.url || ''}|${mobileImage?.url || ''}`;
  const [failed, setFailed] = useState(null);
  if (!image || failed === failedKey) return <div className="editorial-slot" aria-hidden="true" />;

  // No server-side crop: the tile changes shape across breakpoints, so
  // object-cover makes the only crop, from the natural image.
  const desktop = responsiveImage(image.url, { widths: TILE_WIDTHS });
  const mobile = mobileImage ? responsiveImage(mobileImage.url, { widths: TILE_WIDTHS }) : null;
  const sizes = single ? '(min-width: 768px) 50vw, 45vw' : '(min-width: 768px) 22vw, 42vw';

  return (
    <picture>
      {mobile && (
        <source media="(max-width: 767px)" srcSet={mobile.srcSet || mobile.src} sizes={mobile.srcSet ? sizes : undefined} />
      )}
      <img
        src={desktop.src}
        srcSet={desktop.srcSet}
        sizes={desktop.srcSet ? sizes : undefined}
        alt={alt}
        width={600}
        height={single ? 360 : 660}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(failedKey)}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ease-luxe
                   can-hover:group-hover:scale-[1.04]"
      />
    </picture>
  );
}

export default function CampaignTiles({ campaign, categories = [] }) {
  if (!campaign || campaign.enabled === false) return null;

  const tiles = campaign.source === 'custom' ? customTiles(campaign.items) : categoryTiles(categories);
  if (tiles.length === 0) return null;

  // A tile with no other tile beside it takes the whole row, as a lone tile always has.
  const entries = tiles.map((entry, i) => ({
    ...entry,
    single: isTile(entry) && !isTile(tiles[i - 1]) && !isTile(tiles[i + 1]),
  }));
  const twoColumn = entries.some((entry) => isTile(entry) && !entry.single);
  const fullRow = twoColumn ? 'md:col-span-2' : undefined;
  const titleId = `${campaign.id || 'campaigns'}-title`;

  return (
    <section aria-labelledby={titleId} className="shell pt-10 sm:pt-14 lg:pt-16">
      {campaign.title ? (
        <SectionHeading id={titleId} size="md" title={campaign.title} />
      ) : (
        <h2 id={titleId} className="sr-only">Collections</h2>
      )}
      <ul className={`grid gap-3 sm:gap-5 ${twoColumn ? 'md:grid-cols-2' : ''}`}>
        {entries.map(({ key, banner, single, eyebrow, title, subtitle, cta, tone, href, image, mobileImage, alt }) => (banner ? (
          <li key={key} className={fullRow}>
            <PromotionBanner item={banner} />
          </li>
        ) : (
          <li key={key} className={single ? fullRow : undefined}>
            <ContentLink
              href={href}
              className={`group grid h-44 overflow-hidden rounded-card sm:h-56 lg:h-60 ${
                single
                  ? 'grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] md:grid-cols-2'
                  : 'grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]'
              } ${TONES[tone] || TONES.umber}`}
            >
              <div className="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-10">
                {eyebrow && (
                  <p className="text-[0.6875rem] font-medium uppercase tracking-[0.2em] text-gold-soft">{eyebrow}</p>
                )}
                <h3 className="mt-2 font-display text-2xl leading-tight text-paper sm:text-[1.875rem]">{title}</h3>
                {subtitle && <p className="mt-1.5 line-clamp-2 text-sm text-paper/75">{subtitle}</p>}
                {cta && (
                  <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.14em] text-paper">
                    {cta}
                    <ArrowRight
                      size={14}
                      aria-hidden="true"
                      className="transition-transform duration-300 ease-luxe can-hover:group-hover:translate-x-1"
                    />
                  </span>
                )}
              </div>
              <div className="relative min-w-0 overflow-hidden">
                <TileImage image={image} mobileImage={mobileImage} alt={alt} single={single} />
              </div>
            </ContentLink>
          </li>
        )))}
      </ul>
    </section>
  );
}
