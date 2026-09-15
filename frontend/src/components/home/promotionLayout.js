/**
 * The shapes of a Full Image promotion — shared by the homepage renderer and
 * the admin image editor, so the editor frames a banner exactly as the page
 * shows it.
 *
 * Fill banner (`imageFit: 'cover'`): the box has a fixed shape per breakpoint
 * and the image covers it, positioned by its saved framing.
 *   phones (<768px) 1:1 · tablets (768–1023px) 5:2 · computers (≥1024px) 3:1
 *
 * Show full image (`imageFit: 'contain'`): the box takes the artwork's own
 * shape, kept within the bounds below, and the whole image is visible.
 */

export const PROMOTION_FILL_CLASS = 'aspect-square md:aspect-[5/2] lg:aspect-[3/1]';

/** Width ÷ height bounds for Show full image. Outside them the artwork is letterboxed. */
export const PROMOTION_CONTAIN_BOUNDS = {
  phone: [0.8, 2],
  large: [2, 4],
};

/** Below this width ÷ height a large-screen banner is taller than recommended. */
export const PROMOTION_TALL_RATIO = 1.6;

/** Editor frames, in the same shapes as PROMOTION_FILL_CLASS (tablets sit between the two). */
export const PROMOTION_FRAMES = {
  large: { key: 'large', label: 'Computer', aspect: 'aspect-[3/1]', frameClass: 'w-full' },
  phone: { key: 'phone', label: 'Phone', aspect: 'aspect-square', frameClass: 'mx-auto w-full max-w-[16rem]' },
};

/** The image's own width ÷ height, kept within `[min, max]`; `fallback` when dimensions are unknown. */
export function boundedRatio(image, [min, max], fallback) {
  const width = Number(image?.width);
  const height = Number(image?.height);
  if (!(width > 0 && height > 0)) return fallback;
  return Math.min(max, Math.max(min, width / height));
}
