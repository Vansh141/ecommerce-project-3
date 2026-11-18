import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2,
} from 'lucide-react';
import { Alert, Button, ConfirmDialog } from '../../../components/ui';
import AnnouncementBar from '../../../components/layout/AnnouncementBar';
import { shoppableCategories } from '../../../utils/categories';
import { useSectionProducts } from '../../../hooks/useSectionProducts';
import {
  CAMPAIGN_TONES, HERO_INTERVALS, STOREFRONT_ICON_KEYS, STOREFRONT_LIMITS, createHeroSlide, newSectionId,
} from '../../../config/storefront';
import { ICON_LABELS } from '../../../components/home/storefrontIcons';
import { framingStyle } from '../../../utils/images';
import { PROMOTION_FRAMES, PROMOTION_TALL_RATIO } from '../../../components/home/promotionLayout';
import {
  Card, ImageField, ListEditor, Notice, NumberField, SegmentedControl, SelectField, TextField, ToggleField,
} from './EditorFields';
import ProductPicker from './ProductPicker';
import { getIn, useEditor } from './editorContext';
import { PRODUCT_SOURCE_CHOICES, categoriesAsItems, heroSlideTitle } from './sectionMeta';
import HeroSlidePreview from './HeroSlidePreview';
import {
  HERO_SIZES, STORY_FRAMES, heroFrames, heroShade, heroSize,
} from '../../../components/home/heroLayout';

const HERO_SIZE_CHOICES = Object.entries(HERO_SIZES).map(([key, size]) => [key, size.label, size.description]);

/** How strongly the photo is shaded behind the words, from 0% (untouched) to 100%. */
function ShadeSlider({ path, fallback }) {
  const { form, update } = useEditor();
  const value = heroShade(getIn(form, path), fallback);
  const id = `shade-${path.join('-')}`;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        Image shade <span className="normal-case tracking-normal text-ink-muted">· {value}%</span>
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(e) => update(path, Number(e.target.value))}
        aria-valuetext={`${value}%`}
        className="h-11 w-full cursor-pointer accent-ink"
      />
      <p className="field-hint">A soft light shade behind your words keeps them easy to read. 0% shows your photo untouched.</p>
    </div>
  );
}

/**
 * One editor per section. They only ever edit content — text, images, links,
 * choices and selections; how each section looks on the page belongs to the
 * site's design. Every label is written for a store owner.
 */

const TONE_LABELS = { maroon: 'Maroon', olive: 'Olive', umber: 'Brown' };
const ICON_OPTIONS = STOREFRONT_ICON_KEYS.map((key) => [key, ICON_LABELS[key]]);
const SHOW_WHEN_OPTIONS = [
  ['always', 'Always'],
  ['cod', 'Only while cash on delivery is available'],
];

const LINK_HINT = 'A page on your website starts with /, for example /shop or /about.';
const BUTTON_LINK_HELP = 'Where should customers go when they click this button?';

/* ══════════════════════ Shared pieces ════════════════════════════════════ */

function CategorySelect({ path, label = 'Choose a category', help }) {
  const { form, categories } = useEditor();
  const current = getIn(form, path);
  const options = [['', 'Choose a category'], ...categories.map((c) => [c._id, `${c.name}${c.isActive === false ? ' (hidden in store)' : ''}`])];
  if (current && !categories.some((c) => String(c._id) === String(current))) options.push([current, 'Deleted category']);
  return <SelectField path={path} label={label} help={help} options={options} />;
}

function CategoryWarning({ categoryId }) {
  const { categories } = useEditor();
  if (!categoryId) return null;
  const category = categories.find((c) => String(c._id) === String(categoryId));
  if (!category) return <Notice>This category was deleted, so it won’t show. Please choose another.</Notice>;
  if (category.isActive === false) return <Notice>This category is hidden in your store, so it won’t show on the homepage.</Notice>;
  if (!category.productCount) return <Notice>This category has no products yet, so it won’t show until it does.</Notice>;
  return null;
}

function ProductSectionPreview({ section }) {
  const sections = useMemo(() => [section], [section]);
  const { data, loading, error } = useSectionProducts(sections);
  const result = data?.[section.id];
  const products = (result?.products || []).slice(0, section.limit);

  if (error) return <Notice>We couldn’t check which products this shows right now. Please try again in a moment.</Notice>;
  return (
    <div className="rounded-control border border-line bg-paper-sunken p-3">
      <p className="text-xs text-ink-muted" aria-live="polite">
        {loading
          ? 'Checking which products will show…'
          : products.length === 0
            ? 'No products match this choice right now, so this section is hidden on your homepage.'
            : `Customers will see ${products.length} product${products.length === 1 ? '' : 's'} here${
                products.length < section.minItems ? ` — fewer than ${section.minItems}, so the section is hidden for now` : ''
              }.`}
      </p>
      {products.length > 0 && (
        <ul className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {products.map((product) => (
            <li key={product._id} className="h-16 w-12 shrink-0 overflow-hidden bg-paper">
              {product.images?.[0]?.url && (
                <img src={product.images[0].url} alt={product.name} title={product.name} loading="lazy" className="h-full w-full object-cover" />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ══════════════════════ Main banner ══════════════════════════════════════ */

/**
 * What an uploaded banner will look like on the homepage. These mirror the
 * limits in FullBannerHero: proportions are bounded and the height is capped,
 * and the artwork is shown whole with margins when a limit applies. Advice
 * only — nothing here blocks an upload.
 */
export function mobileBannerAdvice(image) {
  const ratio = image.width / image.height;
  if (ratio < 0.7) {
    return [{
      tone: 'warning',
      text: 'Very tall mobile banners are trimmed to fit the banner’s height, so the top and bottom of this image will be cut off on phones. Keep important details near the middle — a portrait image about 4:5 (for example 1080 × 1350) works best.',
    }];
  }
  if (ratio > 1.2) {
    return [{ tone: 'info', text: 'This phone image is wider than it is tall, so its sides will be trimmed on phones. A portrait image works best.' }];
  }
  return [];
}

export function desktopBannerAdvice(image) {
  const ratio = image.width / image.height;
  if (ratio < 2) {
    return [{ tone: 'warning', text: 'This image is quite tall for a banner, so its top and bottom will be trimmed on computers. A wide image (about 1920 × 700) works best.' }];
  }
  if (ratio > 4) {
    return [{ tone: 'info', text: 'This image is very wide, so its sides will be trimmed on smaller screens. About 1920 × 700 works best.' }];
  }
  return [];
}
function StructuredHeroPreview({ hero }) {
  const pictureImage = hero.image?.url ? hero.image : hero.mobileImage;
  const picture = pictureImage?.url;
  // With its own photo, the photo fills the banner behind the words, as on the homepage.
  if (picture) {
    return (
      <div className={`relative ${heroSize(hero.size).frames.large} min-h-[10rem] overflow-hidden rounded-control border border-line bg-paper-sunken`} aria-label="Banner preview">
        <img src={picture} alt="" style={framingStyle(pictureImage.framing)} className="absolute inset-0 h-full w-full object-cover" />
        <div style={{ opacity: heroShade(hero.shade) / 100 }} className="absolute inset-0 bg-gradient-to-r from-paper via-paper/55 to-transparent" />
        <div className="relative flex h-full max-w-[60%] flex-col justify-center p-5 sm:p-7">
          {hero.eyebrow && <p className="text-2xs font-medium uppercase tracking-[0.2em] text-ink-muted">{hero.eyebrow}</p>}
          <p className="mt-2 font-display text-xl leading-tight text-ink sm:text-2xl">
            {hero.heading || <span className="text-ink-faint">Main heading</span>}
            {hero.accentText && <span className="block italic text-clay-deep">{hero.accentText}</span>}
          </p>
          {hero.primaryButtonText && (
            <span className="mt-4 inline-flex w-fit max-w-full truncate rounded-full bg-ink px-4 py-2 text-2xs font-medium uppercase tracking-wider text-paper">
              {hero.primaryButtonText}
            </span>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-hidden rounded-control border border-line" aria-label="Banner preview">
      <div className="grid min-h-[12rem] grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] bg-paper-sunken">
        <div className="flex min-w-0 flex-col justify-center p-5 sm:p-7">
          {hero.eyebrow && <p className="text-2xs font-medium uppercase tracking-[0.2em] text-ink-muted">{hero.eyebrow}</p>}
          <p className="mt-2 font-display text-xl leading-tight text-ink sm:text-2xl">
            {hero.heading || <span className="text-ink-faint">Main heading</span>}
            {hero.accentText && <span className="block italic text-clay-deep">{hero.accentText}</span>}
          </p>
          {hero.primaryButtonText && (
            <span className="mt-4 inline-flex w-fit max-w-full truncate rounded-full bg-ink px-4 py-2 text-2xs font-medium uppercase tracking-wider text-paper">
              {hero.primaryButtonText}
            </span>
          )}
        </div>
        <div className="relative min-w-0 bg-paper">
          {picture ? (
            <img src={picture} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-4 text-center text-2xs text-ink-faint">
              Your website’s original photos
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** The banner as it looks on a computer and on a phone. */
function BannerPreview({ slide }) {
  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_7.5rem]" aria-label="Banner preview">
      <div className="aspect-[1440/547] overflow-hidden rounded-control border border-line bg-paper-sunken" title="On computers">
        <HeroSlidePreview slide={slide} />
      </div>
      <div className="hidden aspect-[390/475] overflow-hidden rounded-control border border-line bg-paper-sunken sm:block" title="On phones">
        <HeroSlidePreview slide={slide} device="phone" />
      </div>
    </div>
  );
}

const TEXT_POSITION_CHOICES = [
  ['left', 'Left', ''],
  ['center', 'Center', ''],
  ['right', 'Right', ''],
];
const OVERLAY_CHOICES = [
  ['light', 'Light', 'Dark words on a soft light shade.'],
  ['medium', 'Medium', 'Light words on a soft dark shade.'],
  ['dark', 'Dark', 'Light words on a stronger shade, for busy photos.'],
];
const INTERVAL_CHOICES = HERO_INTERVALS.map((seconds) => [seconds, `${seconds} seconds`, seconds === 4 ? 'Recommended' : '']);

/** Everything about one banner: what kind it is, its images, words and link. */
function HeroSlideFields({ path }) {
  const { form, update } = useEditor();
  const slide = getIn(form, path);
  const b = [...path, 'banner'];
  const s = [...path, 'structured'];

  return (
    <div className="space-y-6">
      {slide.mode === 'banner' ? <BannerPreview slide={slide} /> : <StructuredHeroPreview hero={slide.structured} />}
      <SegmentedControl
        label="What kind of banner is this?"
        value={slide.mode}
        onChange={(mode) => update([...path, 'mode'], mode)}
        options={[
          ['banner', 'Full Banner', 'Upload one complete banner image.'],
          ['structured', 'Structured Banner', 'Change the image, text and button separately.'],
        ]}
      />
      <p className="text-xs text-ink-faint">You can switch at any time — nothing you’ve added is lost.</p>

      {slide.mode === 'banner' ? (
        <div className="space-y-5">
          <Notice tone="info">Your image fills the whole banner. Use a wide image for computers and a portrait image for phones.</Notice>
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <ImageField
              path={[...b, 'desktopImage']}
              label="Large-screen image"
              required
              showAlt={false}
              help="The banner shown on computers and tablets. Use a wide image."
              recommended={{ width: 1920, height: 680 }}
              advice={desktopBannerAdvice}
              aspect="aspect-[1920/680]"
              emptyText="No image yet"
            />
            <ImageField
              path={[...b, 'mobileImage']}
              label="Phone image"
              showAlt={false}
              help="Upload a separate image for phones so the banner looks good on small screens."
              hint="Recommended mobile banner: about 4:5 to 3:4. If empty, phones show the large-screen image."
              recommended={{ width: 1080, height: 1350 }}
              advice={mobileBannerAdvice}
              aspect="aspect-[4/5]"
              emptyText="Uses the large-screen image"
            />
          </div>
          <div className="space-y-5 rounded-control border border-line p-4">
            <div>
              <p className="text-sm font-medium text-ink">Words on the banner (optional)</p>
              <p className="mt-0.5 text-xs text-ink-muted">Shown on top of your image. Leave these empty if your image already includes its own words.</p>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <TextField path={[...b, 'eyebrow']} label="Small text above heading" max={40} placeholder="New season" />
              <TextField path={[...b, 'heading']} label="Main heading" max={60} placeholder="Timeless ethnic" />
              <TextField path={[...b, 'accentText']} label="Highlighted heading" max={60} hint="Shown in italics under the main heading" placeholder="elegance" />
              <TextField path={[...b, 'description']} label="Supporting text" max={200} hint="Tablets and computers" />
              <TextField path={[...b, 'buttonText']} label="Button text" max={30} placeholder="Explore collection" />
              <TextField path={[...b, 'buttonLink']} label="Button link" max={300} help={BUTTON_LINK_HELP} hint={LINK_HINT} placeholder="/shop" />
            </div>
            {(slide.banner.eyebrow || slide.banner.heading || slide.banner.accentText || slide.banner.description || slide.banner.buttonText) && (
              <>
                <SegmentedControl
                  label="Text position"
                  value={slide.banner.textPosition}
                  onChange={(position) => update([...b, 'textPosition'], position)}
                  options={TEXT_POSITION_CHOICES}
                />
                <SegmentedControl
                  label="Shade behind the words"
                  help="A soft shade keeps the words easy to read on any photo."
                  value={slide.banner.overlay}
                  onChange={(overlay) => update([...b, 'overlay'], overlay)}
                  options={OVERLAY_CHOICES}
                />
              </>
            )}
          </div>
          <TextField
            path={[...b, 'alt']}
            label="Image description"
            required
            max={160}
            help="Describe the banner in a few words, including any words written on it. This helps people using screen readers and Google."
            placeholder="Diwali collection — up to 30% off"
          />
          <TextField
            path={[...b, 'link']}
            label="Where should customers go?"
            max={300}
            help="The page customers open when they click the banner. When the banner has its own button, the button link is used instead. Leave empty if it shouldn’t be clickable."
            hint={LINK_HINT}
            placeholder="/shop"
          />
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-6 md:grid-cols-3">
            <ImageField
              path={[...s, 'image']}
              label="Large-screen image"
              help="Your photo fills the whole banner, behind your heading and button. Use a wide photo with space for the words on the left."
              hint="If empty, your website’s original photos are used."
              recommended={{ width: 1920, height: 640 }}
              aspect={heroSize(slide.structured?.size).frames.large}
              emptyText="Original photo"
              framingFrames={
                slide.structured?.mobileImage?.url
                  ? [heroFrames(slide.structured?.size).large]
                  : [heroFrames(slide.structured?.size).large, heroFrames(slide.structured?.size).phone]
              }
            />
            <ImageField
              path={[...s, 'mobileImage']}
              label="Phone image"
              help="Upload a separate image for phones so the banner looks good on small screens."
              hint="If empty, the large-screen image is used."
              recommended={{ width: 1080, height: 1080 }}
              aspect="aspect-square"
              emptyText="Uses the large-screen image"
              framingFrames={[heroFrames(slide.structured?.size).phone]}
            />
            <ImageField path={[...s, 'detailImage']} label="Close-up image" help="A second, tall photo shown on computers only — for example a fabric detail." recommended={{ width: 600, height: 1200 }} aspect="aspect-[1/2]" emptyText="Original close-up" />
          </div>
          {(slide.structured?.image?.url || slide.structured?.mobileImage?.url) && (
            <>
              <Notice tone="info">
                Your photo fills the whole banner, with your words on top. Use “Edit image” to zoom or move it. The close-up image and its caption are only used with your website’s original photos.
              </Notice>
              <SegmentedControl
                label="Banner height"
                help="How much of the screen the banner takes. Compact keeps your products close to the top."
                value={slide.structured?.size || 'compact'}
                onChange={(size) => update([...s, 'size'], size)}
                options={HERO_SIZE_CHOICES}
              />
              <ShadeSlider path={[...s, 'shade']} />
            </>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField path={[...s, 'eyebrow']} label="Small text above heading" max={40} placeholder="New season" />
            <TextField path={[...s, 'heading']} label="Main heading" max={60} required placeholder="Timeless ethnic" />
            <TextField path={[...s, 'accentText']} label="Highlighted heading" max={60} hint="Shown in italics under the main heading" placeholder="elegance" />
            <TextField path={[...s, 'detailCaption']} label="Close-up caption" max={60} hint="Computers only" />
          </div>
          <TextField path={[...s, 'description']} label="Supporting text" max={200} multiline rows={2} hint="Computers and tablets only" />
          <div className="grid gap-5 sm:grid-cols-2">
            <TextField path={[...s, 'primaryButtonText']} label="Button text" max={30} hint="Two or three words" placeholder="Explore collection" />
            <TextField path={[...s, 'primaryButtonLink']} label="Button link" max={300} help={BUTTON_LINK_HELP} hint={LINK_HINT} placeholder="/shop" />
          </div>
        </div>
      )}
    </div>
  );
}

function HeroEditor({ base }) {
  const { form, errors, update, modify } = useEditor();
  const section = getIn(form, base);
  const slides = section.slides || [];
  const slidesPath = [...base, 'slides'];
  const errorPrefix = slidesPath.join('.');
  const max = STOREFRONT_LIMITS.heroSlides;
  const shownCount = slides.filter((slide) => slide.enabled !== false).length;

  const [open, setOpen] = useState(() => (slides.length === 1 ? slides[0].id : null));
  const [deleting, setDeleting] = useState(null);
  const [dragFrom, setDragFrom] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  // A save that finds a problem opens the banner it belongs to.
  useEffect(() => {
    const field = Object.keys(errors).find((key) => key.startsWith(`${errorPrefix}.`));
    const match = field?.slice(errorPrefix.length + 1).match(/^(\d+)/);
    if (match && slides[Number(match[1])]) setOpen(slides[Number(match[1])].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [errors]);

  const change = (edit) => modify(slidesPath, (current = []) => edit([...current]));
  const move = (from, to) => change((list) => {
    if (to < 0 || to >= list.length || from === to) return list;
    const [item] = list.splice(from, 1);
    list.splice(to, 0, item);
    return list;
  });
  const add = () => {
    const slide = createHeroSlide();
    change((list) => (list.length >= max ? list : [...list, slide]));
    setOpen(slide.id);
  };
  const duplicate = (index) => {
    const copy = { ...JSON.parse(JSON.stringify(slides[index])), id: newSectionId('slide') };
    change((list) => (list.length >= max ? list : [...list.slice(0, index + 1), copy, ...list.slice(index + 1)]));
    setOpen(copy.id);
  };
  const remove = (id) => {
    change((list) => (list.length <= 1 ? list : list.filter((slide) => slide.id !== id)));
    if (open === id) setOpen(null);
    setDeleting(null);
  };

  const deletingIndex = slides.findIndex((slide) => slide.id === deleting);

  return (
    <div className="space-y-5">
      <Card title="Auto Change Banners" description="These are the banners that rotate on your homepage.">
        <ToggleField path={[...base, 'autoplay']} label="Change banners automatically" />
        {section.autoplay && (
          <SegmentedControl
            label="Time between banners"
            value={section.interval}
            onChange={(seconds) => update([...base, 'interval'], seconds)}
            options={INTERVAL_CHOICES}
          />
        )}
        <p className="text-xs text-ink-faint">
          {shownCount < 2
            ? 'With one banner showing, nothing changes automatically.'
            : section.autoplay
              ? `Customers see each banner for ${section.interval} seconds. It waits while someone is pointing at or using the banner.`
              : 'Customers change banners with the arrows, the dots or a swipe.'}
        </p>
      </Card>

      <Card title="Your banners" description="Add different banners for different collections, launches and campaigns.">
        <ol className="space-y-3">
          {slides.map((slide, index) => {
            const isOpen = open === slide.id;
            const shown = slide.enabled !== false;
            const number = index + 1;
            const hasError = Object.keys(errors).some((key) => key.startsWith(`${errorPrefix}.${index}.`));
            return (
              <li
                key={slide.id}
                draggable={!isOpen}
                onDragStart={(e) => {
                  setDragFrom(index);
                  e.dataTransfer.effectAllowed = 'move';
                  e.dataTransfer.setData('text/plain', slide.id);
                }}
                onDragOver={(e) => {
                  if (dragFrom === null) return;
                  e.preventDefault();
                  setDragOver(index);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom !== null) move(dragFrom, index);
                  setDragFrom(null);
                  setDragOver(null);
                }}
                onDragEnd={() => {
                  setDragFrom(null);
                  setDragOver(null);
                }}
                className={`rounded-control border bg-paper-raised ${isOpen ? 'border-ink ring-1 ring-ink' : 'border-line'} ${dragOver === index ? 'ring-2 ring-clay' : ''}`}
              >
                <div className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-ink" data-banner-name>
                      Banner {number}
                      {hasError && <span className="badge-danger">Needs attention</span>}
                    </p>
                    <span className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-2xs font-medium ${shown ? 'bg-success-faint text-success' : 'bg-paper-sunken text-ink-muted'}`}>
                        {shown ? 'Visible ●' : 'Hidden'}
                      </span>
                      <span className="hidden cursor-grab text-ink-faint lg:block" title="Drag to move" aria-hidden="true">
                        <GripVertical size={16} />
                      </span>
                    </span>
                  </div>

                  <div className={`mt-2 flex gap-2 ${shown ? '' : 'opacity-50 grayscale'}`} aria-hidden="true">
                    <span className="block h-24 min-w-0 flex-1 overflow-hidden rounded-control border border-line bg-paper-sunken sm:h-28" title="On computers">
                      <HeroSlidePreview slide={slide} />
                    </span>
                    <span className="block h-24 w-[4.75rem] shrink-0 overflow-hidden rounded-control border border-line bg-paper-sunken sm:h-28 sm:w-[5.5rem]" title="On phones">
                      <HeroSlidePreview slide={slide} device="phone" />
                    </span>
                  </div>
                  <p className="mt-1.5 truncate text-sm text-ink">{heroSlideTitle(slide)}</p>
                  <p className="text-xs text-ink-muted">{slide.mode === 'banner' ? 'Full Banner' : 'Structured Banner'} · computer and phone view</p>

                  <div className="mt-2 flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="min-h-[44px] flex-1"
                      onClick={() => setOpen(isOpen ? null : slide.id)}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? 'Close' : 'Edit'} banner ${number}`}
                    >
                      <Pencil size={13} aria-hidden="true" /> {isOpen ? 'Close' : 'Edit'}
                    </Button>
                    <button type="button" className="icon-btn h-11 w-11 shrink-0 border border-line disabled:opacity-30" onClick={() => move(index, index - 1)} disabled={index === 0} aria-label={`Move banner ${number} up`} title="Move up">
                      <ArrowUp size={15} aria-hidden="true" />
                    </button>
                    <button type="button" className="icon-btn h-11 w-11 shrink-0 border border-line disabled:opacity-30" onClick={() => move(index, index + 1)} disabled={index === slides.length - 1} aria-label={`Move banner ${number} down`} title="Move down">
                      <ArrowDown size={15} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="ghost" className="min-h-[44px] min-w-[7.5rem] flex-1" onClick={() => update([...slidesPath, index, 'enabled'], !shown)} aria-label={`${shown ? 'Hide' : 'Show'} banner ${number}`}>
                      {shown ? <EyeOff size={13} aria-hidden="true" /> : <Eye size={13} aria-hidden="true" />}
                      {shown ? 'Hide Banner' : 'Show Banner'}
                    </Button>
                    <Button size="sm" variant="ghost" className="min-h-[44px] min-w-[5.5rem] flex-1" onClick={() => duplicate(index)} disabled={slides.length >= max} aria-label={`Duplicate banner ${number}`} title={slides.length >= max ? `You can have up to ${max} banners` : 'Make a copy'}>
                      <Copy size={13} aria-hidden="true" /> Copy
                    </Button>
                    <Button size="sm" variant="quiet" className="min-h-[44px] min-w-[5.5rem] flex-1 text-danger" onClick={() => setDeleting(slide.id)} disabled={slides.length <= 1} aria-label={`Delete banner ${number}`} title={slides.length <= 1 ? 'The Main Banner needs at least one banner' : 'Delete'}>
                      <Trash2 size={13} aria-hidden="true" /> Delete
                    </Button>
                  </div>
                </div>
                {isOpen && (
                  <div className="border-t border-line p-4 sm:p-5">
                    <HeroSlideFields path={[...slidesPath, index]} />
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="secondary" className="min-h-[44px]" onClick={add} disabled={slides.length >= max}>
            <Plus size={15} aria-hidden="true" /> Add Banner
          </Button>
          <p className="text-xs text-ink-faint">
            {slides.length} of {max} banners{slides.length >= max ? ' — the most you can add' : ''}
          </p>
        </div>
      </Card>

      <ConfirmDialog
        open={deletingIndex >= 0}
        onClose={() => setDeleting(null)}
        onConfirm={() => remove(deleting)}
        title={`Delete banner ${deletingIndex + 1}?`}
        message="It will be removed from your homepage when you publish your changes."
        confirmLabel="Delete"
      />
    </div>
  );
}

/* ── Shop by category ── */
function CategoryItemTitle({ item }) {
  const { categories } = useEditor();
  const category = categories.find((c) => String(c._id) === String(item.categoryId));
  const picture = item.image?.url || category?.image?.url;
  const name = item.title || category?.name || 'New category';
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-line bg-paper-sunken">
        {picture && <img src={picture} alt="" className="h-full w-full object-cover" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium text-ink">{name}</span>
        {item.enabled === false && <span className="text-xs text-ink-faint">Hidden</span>}
      </span>
    </span>
  );
}

function CategoryRailEditor({ base }) {
  const { form, update, categories } = useEditor();
  const section = getIn(form, base);

  return (
    <div className="space-y-5">
      <Card>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField path={[...base, 'title']} label="Heading (optional)" max={60} hint="Shown above the circles" placeholder="Shop by category" />
          <TextField path={[...base, 'subtitle']} label="Line under the heading (optional)" max={120} />
        </div>
        <SegmentedControl
          label="Which categories should we show?"
          value={section.source}
          onChange={(source) => update([...base, 'source'], source)}
          options={[
            ['auto', 'All my categories', 'Every category that has products, in the order set on the Categories page.'],
            ['manual', 'Choose categories myself', 'Pick which categories to show, with your own images and order.'],
          ]}
        />
      </Card>

      {section.source === 'manual' ? (
        <Card title="Your categories" description="Choose the categories customers see on the homepage.">
          <p className="text-xs text-ink-faint">
            New categories aren’t added here automatically — use “Add Category”, or choose “All my categories” above.
          </p>
          <ListEditor
            path={[...base, 'items']}
            max={STOREFRONT_LIMITS.categoryItems}
            itemLabel="Category"
            addLabel="Add Category"
            emptyText="No categories yet. Click “Add Category” to choose one."
            renderTitle={(item) => <CategoryItemTitle item={item} />}
            createItem={() => ({ enabled: true, categoryId: '', title: '', subtitle: '', image: null, link: '' })}
          >
            {(itemPath, item) => {
              const category = categories.find((c) => String(c._id) === String(item.categoryId));
              return (
                <>
                  <CategorySelect path={[...itemPath, 'categoryId']} />
                  <CategoryWarning categoryId={item.categoryId} />
                  <div className="grid gap-5 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
                    <ImageField path={[...itemPath, 'image']} label="Image" help="Leave empty to use the category’s own image." recommended={{ width: 400, height: 400 }} aspect="aspect-square" emptyText="Category’s own image" showAlt={false} />
                    <div className="space-y-4">
                      <TextField path={[...itemPath, 'title']} label="Name shown on website" max={40} hint="Leave empty to use the category name" placeholder={category?.name || ''} />
                      <TextField path={[...itemPath, 'subtitle']} label="Short line under the name (optional)" max={60} />
                      <TextField path={[...itemPath, 'link']} label="Where should it go? (optional)" max={300} help="Leave empty to open this category’s page." />
                    </div>
                  </div>
                  <ToggleField path={[...itemPath, 'enabled']} label="Show this category" />
                </>
              );
            }}
          </ListEditor>
        </Card>
      ) : (
        <Card title="Categories shown now" description="These are the categories on your homepage right now.">
          <AutomaticCategoryList />
          <Button
            variant="secondary"
            className="min-h-[44px]"
            onClick={() => {
              update([...base, 'items'], categoriesAsItems(categories));
              update([...base, 'source'], 'manual');
            }}
          >
            <Pencil size={14} aria-hidden="true" /> Edit these categories
          </Button>
          <p className="text-xs text-ink-faint">
            Right now new categories appear here automatically once they have products. Choose “Edit these categories” to
            change images, names, links or order. You can also manage categories on the{' '}
            <Link to="/admin/categories" className="link">Categories</Link> page.
          </p>
        </Card>
      )}
    </div>
  );
}

/** The categories the homepage shows automatically, as they look there. */
function AutomaticCategoryList() {
  const { categories } = useEditor();
  const shown = shoppableCategories(categories);
  if (shown.length === 0) return <Notice>No categories have products yet, so this section is hidden for now.</Notice>;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {shown.map((category) => (
        <li key={category._id} className="flex min-w-0 items-center gap-2">
          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-full border border-line bg-paper-sunken">
            {category.image?.url && <img src={category.image.url} alt="" className="h-full w-full object-cover" />}
          </span>
          <span className="truncate text-sm text-ink">{category.name}</span>
        </li>
      ))}
    </ul>
  );
}

/* ══════════════════════ Products ═════════════════════════════════════════ */

function ProductSectionEditor({ base, collection }) {
  const { form, update } = useEditor();
  const section = getIn(form, base);

  return (
    <div className="space-y-5">
      <Card>
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField path={[...base, 'title']} label="Section title" max={60} placeholder="New arrivals" />
          <TextField path={[...base, 'subtitle']} label="Line under the title (optional)" max={120} />
        </div>
      </Card>

      <Card description="Prices and stock always stay up to date.">
        <p className="rounded-control bg-paper-sunken px-3 py-2 text-sm text-ink">
          <span className="text-ink-muted">Currently showing: </span>
          <span className="font-medium">{PRODUCT_SOURCE_CHOICES.find(([key]) => key === section.source)?.[1] || 'Products'}</span>
        </p>
        <SegmentedControl
          label="What products should we show?"
          help="Choose where the products in this section should come from."
          value={section.source}
          onChange={(source) => update([...base, 'source'], source)}
          options={PRODUCT_SOURCE_CHOICES}
        />
        {section.source === 'category' && (
          <>
            <CategorySelect path={[...base, 'categoryId']} />
            <CategoryWarning categoryId={section.categoryId} />
          </>
        )}
        {section.source === 'manual' && <ProductPicker path={[...base, 'productIds']} />}
        {section.source === 'newArrivals' && (
          <ToggleField path={[...base, 'fallbackToNewest']} label="If no products are marked as new arrivals, show the newest products instead" />
        )}
        <NumberField path={[...base, 'limit']} label="How many products at most?" min={1} max={STOREFRONT_LIMITS.productLimit} hint="From 1 to 24" />
        <ProductSectionPreview section={section} />
      </Card>

      <Card title="How it looks">
        <div className="grid gap-5 sm:grid-cols-2">
          <NumberField
            path={[...base, 'minItems']}
            label="Hide this section if it has fewer than"
            help="If only one or two products match, the section is hidden instead of looking empty."
            min={1}
            max={STOREFRONT_LIMITS.productLimit}
            hint="products"
          />
          {collection && (
            <SelectField path={[...base, 'layout']} label="Show products as" options={[['grid', 'A grid'], ['rail', 'A row customers can swipe']]} />
          )}
        </div>
        {collection && section.layout !== 'rail' && (
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField path={[...base, 'desktopColumns']} label="Products per row on computers" numeric options={[['4', '4 in a row'], ['3', '3 in a row']]} />
            <SelectField path={[...base, 'mobileLayout']} label="On phones, show as" options={[['grid', 'Two per row'], ['rail', 'A row customers can swipe']]} />
          </div>
        )}
        {collection && (
          <div className="space-y-1">
            <ToggleField path={[...base, 'showCount']} label="Show how many products there are" />
            <ToggleField path={[...base, 'skipShownProducts']} label="Don’t repeat products already shown higher on the page" />
          </div>
        )}
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField path={[...base, 'viewAllText']} label="“View all” link text" max={30} placeholder="View all" hint="Leave empty to hide the link" />
          <TextField path={[...base, 'viewAllLink']} label="“View all” goes to" max={300} help="Leave empty to open the matching shop page automatically." />
        </div>
      </Card>
    </div>
  );
}

/* ══════════════════════ Story ════════════════════════════════════════════ */

function EditorialEditor({ base }) {
  const { form, update } = useEditor();
  const section = getIn(form, base);
  const full = section.display === 'fullImage';

  return (
    <div className="space-y-5">
      <Card>
        <SegmentedControl
          label="How should the Story look?"
          value={section.display}
          onChange={(display) => update([...base, 'display'], display)}
          options={[
            ['fullImage', 'Full Image', 'Your photo fills the whole section, with the words on top.'],
            ['split', 'Split Layout', 'Your photo beside the words, on a coloured background.'],
          ]}
        />
        <Notice tone="info">The Story shows on computers and tablets. On phones it is hidden, so customers see your products first.</Notice>
      </Card>
      <Card title="Images">
        <div className="grid gap-6 sm:grid-cols-2">
          <ImageField
            path={[...base, 'image']}
            label={full ? 'Large-screen image' : 'Image'}
            hint="If empty, your website’s original photo is used."
            recommended={full ? { width: 1600, height: 900 } : { width: 1040, height: 1300 }}
            aspect={full ? 'aspect-[16/9]' : 'aspect-[4/5]'}
            emptyText="Original photo"
            framingFrames={full ? STORY_FRAMES.fullImage : STORY_FRAMES.split}
          />
          <ImageField path={[...base, 'mobileImage']} label="Phone image (optional)" help="Upload a separate image for phones so it looks good on small screens." hint="If empty, the main image is used." recommended={{ width: 900, height: 1100 }} aspect="aspect-[4/5]" emptyText="Uses the main image" />
        </div>
        {full && <Notice tone="info">The photo fills the whole section and keeps the section’s usual height, so wide photos work best.</Notice>}
        <p className="text-xs text-ink-faint">Use “Edit image” to zoom or move your photo inside the Story.</p>
      </Card>
      <Card title="Text and button">
        <TextField path={[...base, 'eyebrow']} label="Small text above heading" max={40} placeholder="The edit" />
        <TextField path={[...base, 'heading']} label="Main heading" max={60} required placeholder="Style your story" />
        <TextField path={[...base, 'description']} label="Supporting text" max={240} multiline rows={3} hint="Computers and tablets only" />
        <div className="grid gap-5 sm:grid-cols-2">
          <TextField path={[...base, 'buttonText']} label="Button text" max={30} placeholder="Explore the edit" />
          <TextField path={[...base, 'buttonLink']} label="Button link" max={300} help={BUTTON_LINK_HELP} hint={LINK_HINT} placeholder="/shop" />
        </div>
      </Card>
      <Card title="Look">
        {full ? (
          <>
            <SegmentedControl
              label="Text position"
              value={section.textPosition}
              onChange={(position) => update([...base, 'textPosition'], position)}
              options={TEXT_POSITION_CHOICES}
            />
            <SegmentedControl
              label="Shade behind the words"
              help="A soft shade keeps the words easy to read on any photo."
              value={section.overlay}
              onChange={(overlay) => update([...base, 'overlay'], overlay)}
              options={OVERLAY_CHOICES}
            />
            <ShadeSlider path={[...base, 'shade']} fallback={100} />
          </>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <SelectField path={[...base, 'layout']} label="Image position" options={[['imageRight', 'Image on the right'], ['imageLeft', 'Image on the left']]} />
            <SelectField path={[...base, 'theme']} label="Background colour" options={[['umber', 'Brown'], ['maroon', 'Maroon'], ['olive', 'Olive'], ['sand', 'Sand (light)']]} />
          </div>
        )}
      </Card>
    </div>
  );
}

/* ── Promotion ── */
const PROMOTION_LAYOUT_CHOICES = [
  ['fullImage', 'Full Image', 'Use one complete banner image.'],
  ['split', 'Split Layout', 'Use text beside the image.'],
];
const IMAGE_DISPLAY_CHOICES = [
  ['contain', 'Show full image', 'Keep the complete artwork visible.'],
  ['cover', 'Fill banner', 'Fill the banner area and crop the edges if needed.'],
];

function promotionBannerAdvice(image) {
  if (image.width / image.height >= PROMOTION_TALL_RATIO) return [];
  return [{ tone: 'warning', text: 'This image is taller than recommended for this banner and may be cropped.' }];
}

function FullImagePromotionFields({ itemPath, item }) {
  const { update } = useEditor();
  const fit = item.imageFit === 'cover' ? 'cover' : 'contain';
  const fillNotice = fit === 'contain' ? (
    <Notice tone="info">
      <span className="block">Your whole image is shown. To zoom or move the image, choose Fill banner.</span>
      <Button
        size="sm"
        variant="secondary"
        className="mt-2 min-h-[44px]"
        onClick={(event) => {
          // This button disappears once the framer unlocks; move focus to a control inside
          // the dialog (not the panel itself) so both Tab and Shift+Tab stay trapped.
          const dialog = event.currentTarget.closest('[role="dialog"]');
          update([...itemPath, 'imageFit'], 'cover');
          requestAnimationFrame(() => {
            (dialog?.querySelector('[role="group"][tabindex="0"]') || dialog?.querySelector('button:not([disabled])'))?.focus();
          });
        }}
      >
        Use Fill banner
      </Button>
    </Notice>
  ) : null;

  return (
    <>
      <ImageField
        path={[...itemPath, 'desktopImage']}
        label="Banner image"
        required
        hint="Recommended: wide horizontal image for best results."
        recommended={{ width: 1920, height: 640 }}
        advice={promotionBannerAdvice}
        aspect="aspect-[3/1]"
        framingFrames={item.mobileImage?.url ? [PROMOTION_FRAMES.large] : [PROMOTION_FRAMES.large, PROMOTION_FRAMES.phone]}
        fit={fit}
        framingNotice={fillNotice}
      />
      <div className="sm:max-w-xs">
        <ImageField
          path={[...itemPath, 'mobileImage']}
          label="Phone image (optional)"
          hint="If empty, the banner image is used on phones."
          recommended={{ width: 1080, height: 1080 }}
          aspect="aspect-square"
          emptyText="Uses the banner image"
          showAlt={false}
          framingFrames={[PROMOTION_FRAMES.phone]}
          fit={fit}
          framingNotice={fillNotice}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField path={[...itemPath, 'eyebrow']} label="Small text" max={40} placeholder="Diwali" />
        <TextField
          path={[...itemPath, 'title']}
          label="Main heading"
          max={50}
          help="Every banner needs a main heading or an image description, so all customers — including people using screen readers — know what it is about."
          hint="Needed if the banner image has no description"
          placeholder="Festive edit"
        />
      </div>
      <TextField path={[...itemPath, 'description']} label="Description" max={120} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField path={[...itemPath, 'buttonText']} label="Button text" max={30} placeholder="Shop festive" />
        <TextField
          path={[...itemPath, 'link']}
          label="Button link"
          max={300}
          required
          help="Where customers go when they click the button. With no button text, clicking anywhere on the banner opens this page."
          hint={LINK_HINT}
          placeholder="/shop"
        />
      </div>
      <SegmentedControl
        label="Text position"
        value={item.textPosition || 'left'}
        onChange={(position) => update([...itemPath, 'textPosition'], position)}
        options={TEXT_POSITION_CHOICES}
      />
      <SegmentedControl
        label="Image shade"
        help="A soft shade keeps the words easy to read on any image."
        value={item.overlay || 'medium'}
        onChange={(overlay) => update([...itemPath, 'overlay'], overlay)}
        options={OVERLAY_CHOICES}
      />
      <SegmentedControl
        label="Image display"
        value={fit}
        onChange={(imageFit) => update([...itemPath, 'imageFit'], imageFit)}
        options={IMAGE_DISPLAY_CHOICES}
      />
      <ToggleField path={[...itemPath, 'enabled']} label="Show this promotion" />
    </>
  );
}

function SplitPromotionFields({ itemPath }) {
  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2">
        <ImageField path={[...itemPath, 'desktopImage']} label="Image" recommended={{ width: 1200, height: 900 }} />
        <ImageField path={[...itemPath, 'mobileImage']} label="Phone image (optional)" help="Upload a separate image for phones so it looks good on small screens." hint="If empty, the main image is used." recommended={{ width: 900, height: 900 }} aspect="aspect-square" emptyText="Uses the main image" showAlt={false} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField path={[...itemPath, 'eyebrow']} label="Small text above heading" max={40} placeholder="Diwali" />
        <TextField path={[...itemPath, 'title']} label="Main heading" max={50} required placeholder="Festive edit" />
      </div>
      <TextField path={[...itemPath, 'description']} label="Short description" max={120} />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField path={[...itemPath, 'buttonText']} label="Button text" max={30} placeholder="Shop festive" />
        <TextField path={[...itemPath, 'link']} label="Button link" max={300} required help={BUTTON_LINK_HELP} hint={LINK_HINT} />
      </div>
      <SelectField path={[...itemPath, 'tone']} label="Background colour" help="Shown behind the text, and while the image loads." options={CAMPAIGN_TONES.map((tone) => [tone, TONE_LABELS[tone]])} />
      <ToggleField path={[...itemPath, 'enabled']} label="Show this promotion" />
    </>
  );
}

function CampaignEditor({ base }) {
  const { form, update } = useEditor();
  const section = getIn(form, base);

  return (
    <div className="space-y-5">
      <Card description="Create a wide promotional banner for your homepage.">
        <TextField path={[...base, 'title']} label="Section title (optional)" max={60} placeholder="The edits" />
        <SegmentedControl
          label="What should the banners show?"
          value={section.source}
          onChange={(source) => update([...base, 'source'], source)}
          options={[
            ['categories', 'Choose automatically', 'Festive and everyday banners made from your categories.'],
            ['custom', 'Create my own promotions', 'Add your own images, text and buttons.'],
          ]}
        />
      </Card>
      {section.source === 'custom' ? (
        <Card
          title="Your promotions"
          description="Full Image banners fill a whole row. Split Layout banners sit side by side in pairs."
        >
          <ListEditor
            path={[...base, 'items']}
            max={STOREFRONT_LIMITS.campaignItems}
            itemLabel="Promotion"
            addLabel="Add Promotion"
            emptyText="No promotions yet. Click “Add Promotion” to create one."
            createItem={() => ({
              enabled: true,
              layout: 'fullImage',
              desktopImage: null,
              mobileImage: null,
              eyebrow: '',
              title: '',
              description: '',
              buttonText: '',
              link: '/shop',
              tone: 'umber',
              textPosition: 'left',
              overlay: 'medium',
              imageFit: 'contain',
            })}
          >
            {(itemPath) => {
              const item = getIn(form, itemPath) || {};
              const fullImage = item.layout === 'fullImage';
              return (
                <>
                  <SegmentedControl
                    label="Layout"
                    value={fullImage ? 'fullImage' : 'split'}
                    onChange={(layout) => update([...itemPath, 'layout'], layout)}
                    options={PROMOTION_LAYOUT_CHOICES}
                  />
                  {fullImage ? <FullImagePromotionFields itemPath={itemPath} item={item} /> : <SplitPromotionFields itemPath={itemPath} />}
                </>
              );
            }}
          </ListEditor>
        </Card>
      ) : (
        <Card>
          <p className="text-sm text-ink-muted">
            Banners appear automatically for festive and everyday categories that have products.
          </p>
        </Card>
      )}
    </div>
  );
}

/* ══════════════════════ Why shop with us, about the brand ════════════════ */

function TrustEditor({ base }) {
  return (
    <Card title="Your benefits" description="Short promises, like free shipping or easy returns.">
      <Alert tone="info">
        Only promise what your store really offers. Benefits set to “Only while cash on delivery is available” hide
        automatically when cash on delivery is switched off.
      </Alert>
      <ListEditor
        path={[...base, 'items']}
        max={STOREFRONT_LIMITS.trust}
        itemLabel="Benefit"
        addLabel="Add Benefit"
        emptyText="No benefits yet. This section stays hidden until you add one."
        createItem={() => ({ enabled: true, icon: 'sparkles', title: '', description: '', link: '', showWhen: 'always' })}
      >
        {(itemPath) => (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField path={[...itemPath, 'title']} label="Title" max={40} required placeholder="Free shipping" />
              <TextField path={[...itemPath, 'description']} label="Short description" max={80} placeholder="On orders over ₹1,499" />
              <SelectField path={[...itemPath, 'icon']} label="Icon" options={ICON_OPTIONS} />
              <SelectField path={[...itemPath, 'showWhen']} label="When to show" options={SHOW_WHEN_OPTIONS} />
            </div>
            <TextField path={[...itemPath, 'link']} label="Link (optional)" max={300} help="A page with more details, like your returns policy." hint={LINK_HINT} placeholder="/shipping-returns" />
            <ToggleField path={[...itemPath, 'enabled']} label="Show this benefit" />
          </>
        )}
      </ListEditor>
    </Card>
  );
}

function BrandMessageEditor({ base }) {
  return (
    <Card title="Your message" description="Plain text. Line breaks are kept.">
      <TextField path={[...base, 'eyebrow']} label="Small text above heading" max={40} placeholder="Our promise" />
      <TextField path={[...base, 'title']} label="Main heading" max={80} required placeholder="Made slowly, worn often" />
      <TextField path={[...base, 'description']} label="Message" max={600} multiline rows={5} />
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField path={[...base, 'buttonText']} label="Button text (optional)" max={30} placeholder="Our story" />
        <TextField path={[...base, 'link']} label="Button link" max={300} help={BUTTON_LINK_HELP} hint={LINK_HINT} placeholder="/about" />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <SelectField path={[...base, 'alignment']} label="Text position" options={[['center', 'Centred'], ['left', 'Left']]} />
        <SelectField path={[...base, 'theme']} label="Background" options={[['plain', 'Plain, with lines'], ['sand', 'Sand colour']]} />
      </div>
    </Card>
  );
}

const EDITORS = {
  hero: HeroEditor,
  categoryRail: CategoryRailEditor,
  productCollection: (props) => <ProductSectionEditor {...props} collection />,
  productRail: (props) => <ProductSectionEditor {...props} collection={false} />,
  editorial: EditorialEditor,
  campaign: CampaignEditor,
  trust: TrustEditor,
  brandMessage: BrandMessageEditor,
};

export function SectionEditor({ index }) {
  const { form } = useEditor();
  const section = form.sections[index];
  const Editor = section && EDITORS[section.type];
  if (!Editor) return null;
  return (
    <div className="space-y-5">
      <div className="card px-5 py-2 sm:px-6">
        <ToggleField path={['sections', index, 'enabled']} label="Show this section on the homepage" />
      </div>
      <Editor base={['sections', index]} />
    </div>
  );
}

/* ══════════════════════ Every page ═══════════════════════════════════════ */

export function AnnouncementEditor() {
  const { form, update, payments } = useEditor();
  const announcement = form.announcement;
  const set = (key) => (value) => update(['announcement', key], value);

  return (
    <div className="space-y-5">
      <Card title="Top Message" description="These messages move across the top of your website.">
        <div>
          <p className="field-label">How it looks</p>
          <div className="overflow-hidden rounded-control border border-line">
            {announcement.enabled && announcement.items.some((item) => item.text) ? (
              <AnnouncementBar announcement={{ ...announcement, items: announcement.items.filter((item) => item.text) }} payments={payments} />
            ) : (
              <p className="bg-paper-sunken px-4 py-2.5 text-center text-xs text-ink-muted">The top message is hidden.</p>
            )}
          </div>
        </div>
        <ToggleField path={['announcement', 'enabled']} label="Show the top message" />
        <SegmentedControl
          label="Movement"
          value={announcement.motion}
          onChange={set('motion')}
          options={[
            ['moving', 'Moving', 'Messages glide gently across the bar.'],
            ['still', 'Still', 'Messages stay in place.'],
          ]}
        />
        {announcement.motion !== 'still' && (
          <>
            <SegmentedControl
              label="Direction"
              value={announcement.direction}
              onChange={set('direction')}
              options={[
                ['rtl', 'Right to left', 'The usual direction.'],
                ['ltr', 'Left to right', ''],
              ]}
            />
            <SegmentedControl
              label="Speed"
              value={announcement.speed}
              onChange={set('speed')}
              options={[
                ['slow', 'Slow', 'Calm and easy to read.'],
                ['normal', 'Normal', 'Recommended.'],
                ['fast', 'Fast', ''],
              ]}
            />
          </>
        )}
        <p className="text-xs text-ink-faint">
          Moving messages stop while a customer points at them, and stay still for customers who prefer less movement on screen.
        </p>
      </Card>

      <Card title="Messages" description="Shown in this order.">
        <ListEditor
          path={['announcement', 'items']}
          max={STOREFRONT_LIMITS.announcement}
          itemLabel="Message"
          addLabel="Add Message"
          emptyText="No messages yet. The top message stays hidden until you add one."
          renderTitle={(item) => <span className="block truncate text-sm font-medium text-ink">{item.text || 'New message'}</span>}
          createItem={() => ({ text: '', icon: '', showWhen: 'always' })}
        >
          {(itemPath) => (
            <>
              <TextField path={[...itemPath, 'text']} label="Message" max={80} required placeholder="Free shipping over ₹1,499" />
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectField path={[...itemPath, 'icon']} label="Icon (computers only)" options={[['', 'No icon'], ...ICON_OPTIONS]} />
                <SelectField path={[...itemPath, 'showWhen']} label="When to show" options={SHOW_WHEN_OPTIONS} />
              </div>
            </>
          )}
        </ListEditor>
      </Card>
    </div>
  );
}
export function SeoEditor() {
  return (
    <div className="space-y-5">
      <Card title="Google search" description="How your homepage appears in Google results.">
        <TextField
          path={['seo', 'title']}
          label="Page title"
          help="The blue title people see in Google results. Your store name is added automatically."
          max={70}
          placeholder="Ethnic wear for every moment"
        />
        <TextField
          path={['seo', 'description']}
          label="Page description"
          help="The short text under the title in Google results. One or two sentences."
          max={170}
          multiline
          rows={3}
        />
      </Card>
      <Card title="Sharing image" description="The picture shown when someone shares your homepage link.">
        <div className="max-w-md">
          <ImageField
            path={['seo', 'socialImage']}
            label="Sharing image"
            hint="If empty, your website’s original sharing image is used."
            recommended={{ width: 1200, height: 630 }}
            aspect="aspect-[1200/630]"
            emptyText="Original sharing image"
          />
        </div>
        <Notice tone="info">
          Some apps, like WhatsApp and Facebook, may keep showing the original picture.
        </Notice>
      </Card>
    </div>
  );
}

/* ══════════════════════ Menu bar and footer ══════════════════════════════ */

/**
 * A list of links the owner writes: each one can be switched off without
 * losing it, which is how a seasonal link is kept ready for next time.
 */
function LinkListEditor({ path, max, addLabel, emptyText, labelMax = 40, placeholder = 'Shop all', linkPlaceholder = '/shop' }) {
  return (
    <ListEditor
      path={path}
      max={max}
      itemLabel="Link"
      addLabel={addLabel}
      emptyText={emptyText}
      createItem={() => ({ enabled: true, label: '', link: '' })}
      renderTitle={(item) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate text-sm font-medium text-ink">{item.label || 'New link'}</span>
          {item.enabled === false && <span className="badge-neutral shrink-0">Hidden</span>}
        </span>
      )}
    >
      {(itemPath) => (
        <>
          <ToggleField path={[...itemPath, 'enabled']} label="Show this link" />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField path={[...itemPath, 'label']} label="Link text" max={labelMax} required placeholder={placeholder} />
            <TextField path={[...itemPath, 'link']} label="Where it goes" hint={LINK_HINT} max={300} required placeholder={linkPlaceholder} />
          </div>
        </>
      )}
    </ListEditor>
  );
}

export function HeaderEditor() {
  return (
    <div className="space-y-5">
      <Card title="Logo" description="Shown at the top of every page, and in the footer.">
        <div className="max-w-sm">
          <ImageField
            path={['header', 'logo']}
            label="Logo picture"
            hint="If empty, your store name is shown in writing, as it is now."
            recommended={{ width: 600, height: 150 }}
            aspect="aspect-[4/1]"
            fit="contain"
            emptyText="Store name in writing"
          />
        </div>
        <Notice tone="info">
          A logo with a see-through background (a PNG) sits best on the bar. Tall logos are made smaller to fit.
        </Notice>
      </Card>

      <Card title="Menu links" description="Shown at the top of every page, in this order.">
        <LinkListEditor
          path={['header', 'links']}
          max={STOREFRONT_LIMITS.headerLinks}
          addLabel="Add Menu Link"
          emptyText="No menu links yet. Add one, or leave this empty to show only your categories."
          labelMax={24}
        />
        <p className="text-xs text-ink-faint">
          Keep menu text short. On smaller screens the links that don’t fit move into a “More” menu automatically,
          and on phones they all appear in the side menu.
        </p>
      </Card>

      <Card title="Your categories" description="Your shop categories can follow your menu links automatically.">
        <ToggleField path={['header', 'showCategories']} label="Show my categories in the menu" />
        <p className="text-xs text-ink-faint">
          Categories come from Products → Categories. Only the ones that are visible, allowed in the menu and have
          products in them appear here, so the menu never leads to an empty page.
        </p>
      </Card>

      <Card title="Highlighted link" description="The last link in the menu, shown in a stronger colour.">
        <ToggleField path={['header', 'sale', 'enabled']} label="Show the highlighted link" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField path={['header', 'sale', 'label']} label="Link text" max={24} placeholder="Sale" />
          <TextField path={['header', 'sale', 'link']} label="Where it goes" hint={LINK_HINT} max={300} placeholder="/shop?onSale=true" />
        </div>
      </Card>
    </div>
  );
}

export function FooterEditor() {
  const { form, update } = useEditor();

  return (
    <div className="space-y-5">
      <Card title="About your store" description="The short line under your logo at the bottom of every page.">
        <TextField
          path={['footer', 'tagline']}
          label="Short description"
          max={200}
          multiline
          rows={2}
          placeholder="Timeless Indian ethnic wear, thoughtfully made for every occasion."
        />
      </Card>

      <Card title="Newsletter" description="The sign-up box at the top of the footer.">
        <ToggleField path={['footer', 'newsletter', 'enabled']} label="Show the newsletter sign-up" />
        <TextField path={['footer', 'newsletter', 'title']} label="Heading" max={60} placeholder="Be first to know" />
        <TextField
          path={['footer', 'newsletter', 'description']}
          label="Supporting text"
          max={200}
          multiline
          rows={2}
          placeholder="New arrivals, restocks and studio notes. No more than twice a month."
        />
      </Card>

      <Card title="Shop column" description="The first column of links in the footer.">
        <TextField path={['footer', 'shop', 'title']} label="Column heading" max={40} placeholder="Shop" />
        <ToggleField path={['footer', 'shop', 'showCategories']} label="List my categories under these links" />
        <LinkListEditor
          path={['footer', 'shop', 'links']}
          max={STOREFRONT_LIMITS.footerLinks}
          addLabel="Add Link"
          emptyText="No links yet."
          placeholder="All products"
        />
      </Card>

      <Card title="Help column" description="The second column of links in the footer.">
        <TextField path={['footer', 'help', 'title']} label="Column heading" max={40} placeholder="Help" />
        <LinkListEditor
          path={['footer', 'help', 'links']}
          max={STOREFRONT_LIMITS.footerLinks}
          addLabel="Add Link"
          emptyText="No links yet."
          placeholder="Track your order"
          linkPlaceholder="/orders"
        />
      </Card>

      <Card title="Get in touch" description="How customers reach you. Anything left empty is simply not shown.">
        <TextField path={['footer', 'contact', 'title']} label="Column heading" max={40} placeholder="Get in touch" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField path={['footer', 'contact', 'phone']} label="Phone number" max={24} placeholder="+91 91633 99339" />
          <TextField path={['footer', 'contact', 'email']} label="Email address" max={120} placeholder="hello@yourstore.com" />
        </div>
        <TextField
          path={['footer', 'contact', 'location']}
          label="Area"
          help="A short place name, like the city and state. The full address goes in Business details below."
          max={80}
          placeholder="Howrah, West Bengal"
        />
      </Card>

      <Card title="Instagram" description="Shown with your Instagram name at the bottom of the page.">
        <TextField path={['footer', 'social', 'title']} label="Heading" max={40} placeholder="Follow TOUCHH" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            path={['footer', 'social', 'instagram']}
            label="Instagram address"
            hint="A full https:// address. Leave empty to hide Instagram."
            max={300}
            placeholder="https://www.instagram.com/yourstore/"
          />
          <TextField path={['footer', 'social', 'handle']} label="Instagram name" max={40} placeholder="@yourstore" />
        </div>
        <TextField path={['footer', 'social', 'note']} label="Small text underneath" max={80} placeholder="Follow us on Instagram" />
      </Card>

      <Card title="Business details" description="Your legal and GST details, as shown at the bottom of every page.">
        <TextField path={['footer', 'legal', 'title']} label="Heading" max={40} placeholder="Legal & business details" />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField path={['footer', 'legal', 'legalName']} label="Legal name" max={120} />
          <TextField path={['footer', 'legal', 'tradeName']} label="Trade name" max={120} />
        </div>
        <TextField path={['footer', 'legal', 'gstin']} label="GSTIN" max={20} />
        <TextField
          path={['footer', 'legal', 'address']}
          label="Business address"
          help="One line of the address per line."
          max={300}
          multiline
          rows={4}
        />
        <SegmentedControl
          label="How these details are arranged"
          value={form.footer.legal.layout}
          onChange={(value) => update(['footer', 'legal', 'layout'], value)}
          options={[
            ['spread', 'Spread out', 'The details share the full width of the footer.'],
            ['compact', 'Close together', 'Each detail takes only the room it needs, and they sit together on the left.'],
          ]}
        />
        <p className="text-xs text-ink-faint">
          Details you leave empty are not shown, and the rest move up to share the space — so the footer stays even
          whichever ones you fill in.
        </p>
      </Card>

      <Card title="Bottom line" description="The very last line of the page.">
        <TextField
          path={['footer', 'bottom', 'copyright']}
          label="Copyright text"
          help="The year and the © sign are added automatically."
          max={120}
          placeholder="TOUCHH. All rights reserved."
        />
        <LinkListEditor
          path={['footer', 'bottom', 'links']}
          max={STOREFRONT_LIMITS.footerBottomLinks}
          addLabel="Add Link"
          emptyText="No links yet."
          placeholder="Privacy"
          linkPlaceholder="/privacy"
        />
      </Card>
    </div>
  );
}
