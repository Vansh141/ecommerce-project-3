/**
 * A Structured Banner with its own photo: the photo fills the banner behind
 * the words. Its height is chosen in the admin panel and shared with the image
 * editor, whose frames show the banner's shape on a typical phone (390px) and
 * computer (1440px), so the editor frames the photo as the page shows it.
 *
 * Heights are minimums: long words make the banner taller instead of being cut off.
 */

export const HERO_SIZES = {
  compact: {
    label: 'Compact',
    description: 'A short banner, so your products show sooner.',
    height: 'h-[16rem] md:h-[18rem] lg:h-[clamp(20rem,24vw,23rem)]',
    frames: { large: 'aspect-[41/10]', phone: 'aspect-[3/2]' },
  },
  medium: {
    label: 'Medium',
    description: 'A little taller, with more of your photo.',
    height: 'h-[21rem] md:h-[22rem] lg:h-[clamp(24rem,30vw,30rem)]',
    frames: { large: 'aspect-[10/3]', phone: 'aspect-[7/6]' },
  },
  large: {
    label: 'Large',
    description: 'A tall banner that fills most of the screen.',
    height: 'h-[26rem] lg:h-[clamp(28rem,34vw,38rem)]',
    frames: { large: 'aspect-[29/10]', phone: 'aspect-[15/16]' },
  },
};

export const DEFAULT_HERO_SHADE = 90;

export const heroSize = (key) => HERO_SIZES[key] || HERO_SIZES.compact;

/** The shade behind the words, as a percentage from 0 to 100; `fallback` when unset. */
export function heroShade(value, fallback = DEFAULT_HERO_SHADE) {
  const n = Number(value);
  if (value === undefined || value === null || value === '' || !Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, Math.round(n)));
}

/**
 * Story image frames: the Story's shape on a typical computer (1440px) and tablet
 * (768px). Phones don't show the Story, so there is no phone frame.
 */
export const STORY_FRAMES = {
  fullImage: [
    { key: 'large', label: 'Computer', aspect: 'aspect-[5/2]', frameClass: 'w-full' },
    { key: 'tablet', label: 'Tablet', aspect: 'aspect-[3/2]', frameClass: 'mx-auto w-full max-w-[24rem]' },
  ],
  split: [
    { key: 'large', label: 'Computer', aspect: 'aspect-[5/4]', frameClass: 'mx-auto w-full max-w-[22rem]' },
    { key: 'tablet', label: 'Tablet', aspect: 'aspect-[9/10]', frameClass: 'mx-auto w-full max-w-[18rem]' },
  ],
};

export function heroFrames(sizeKey) {
  const { frames } = heroSize(sizeKey);
  return {
    large: { key: 'large', label: 'Computer', aspect: frames.large, frameClass: 'w-full' },
    phone: { key: 'phone', label: 'Phone', aspect: frames.phone, frameClass: 'mx-auto w-full max-w-[16rem]' },
  };
}
