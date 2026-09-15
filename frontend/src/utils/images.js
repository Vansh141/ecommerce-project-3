/**
 * Responsive image URLs for catalogue photography.
 *
 * Product and category images are stored as one URL each. Two of the hosts we
 * see in practice resize on the fly, so the browser can be offered a `srcset`
 * and download only what the slot needs — a 160px card on a phone no longer
 * pulls a 1000px photograph. Transformations are applied here at render time
 * and never written back to the stored URL.
 *
 * Any other URL — including locally stored `/uploads/...` files, which have no
 * resizing service — is returned untouched as a single `src`.
 */

const UNSPLASH_HOST = 'images.unsplash.com';
const CLOUDINARY_HOST = 'res.cloudinary.com';
const CLOUDINARY_UPLOAD = '/image/upload/';

function parse(url) {
  if (typeof url !== 'string' || !/^https?:\/\//i.test(url)) return null;
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

function isResizable(parsed) {
  if (!parsed) return false;
  if (parsed.hostname === UNSPLASH_HOST) return true;
  return parsed.hostname === CLOUDINARY_HOST && parsed.pathname.includes(CLOUDINARY_UPLOAD);
}

/**
 * @param {string} url
 * @param {{ width: number, height?: number, faces?: boolean }} options
 *   `height` crops to that exact box; without it the image keeps its ratio.
 */
export function resizeImageUrl(url, { width, height, faces = false } = {}) {
  const parsed = parse(url);
  if (!width || !isResizable(parsed)) return url;

  if (parsed.hostname === UNSPLASH_HOST) {
    parsed.searchParams.set('w', String(width));
    parsed.searchParams.set('auto', 'format');
    parsed.searchParams.set('q', '70');
    if (height) {
      parsed.searchParams.set('h', String(height));
      parsed.searchParams.set('fit', 'crop');
      if (faces) parsed.searchParams.set('crop', 'faces');
    } else {
      parsed.searchParams.delete('h');
    }
    return parsed.toString();
  }

  const transform = [
    'f_auto',
    'q_auto',
    height ? 'c_fill' : 'c_limit',
    height && (faces ? 'g_face' : 'g_auto'),
    `w_${width}`,
    height && `h_${height}`,
  ]
    .filter(Boolean)
    .join(',');

  parsed.pathname = parsed.pathname.replace(CLOUDINARY_UPLOAD, `${CLOUDINARY_UPLOAD}${transform}/`);
  return parsed.toString();
}

/**
 * Product photo framing, set in Admin → Products → Edit image.
 *
 * `x`/`y` are the focus point in percent and `zoom` enlarges around it. Applied
 * to an `object-cover` image, the same values frame the photo sensibly in any
 * slot shape — the 3:4 card and the 4:5 product page alike — and never expose
 * an empty edge, because the zoom origin is the focus point itself.
 */
export const DEFAULT_FRAMING = Object.freeze({ x: 50, y: 50, zoom: 1 });

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
const numberOr = (value, fallback) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

export function normaliseFraming(framing) {
  if (!framing || typeof framing !== 'object') return DEFAULT_FRAMING;
  return {
    x: clamp(numberOr(framing.x, 50), 0, 100),
    y: clamp(numberOr(framing.y, 50), 0, 100),
    zoom: clamp(numberOr(framing.zoom, 1), 1, 3),
  };
}

export function hasCustomFraming(framing) {
  const { x, y, zoom } = normaliseFraming(framing);
  return x !== 50 || y !== 50 || zoom !== 1;
}

/** Inline style for an `object-cover` product image; undefined when untouched. */
export function framingStyle(framing) {
  if (!hasCustomFraming(framing)) return undefined;
  const { x, y, zoom } = normaliseFraming(framing);
  const origin = `${x}% ${y}%`;
  // The individual `scale` property composes with hover transforms instead of replacing them.
  return { objectPosition: origin, transformOrigin: origin, ...(zoom > 1 ? { scale: String(zoom) } : {}) };
}

/**
 * Framing for one `<img>` inside a `<picture>` whose phone source switches at
 * 767px, when the phone and large-screen images carry different framing. Put
 * RESPONSIVE_FRAMING_CLASS on the image and responsiveFramingStyle() in its
 * style. With no separate phone image, pass the large-screen framing for both.
 */
export const RESPONSIVE_FRAMING_CLASS =
  '[object-position:var(--frame-pos-sm)] [transform-origin:var(--frame-pos-sm)] [scale:var(--frame-scale-sm)] '
  + 'md:[object-position:var(--frame-pos-md)] md:[transform-origin:var(--frame-pos-md)] md:[scale:var(--frame-scale-md)]';

export function responsiveFramingStyle(largeFraming, phoneFraming = largeFraming) {
  const large = normaliseFraming(largeFraming);
  const phone = normaliseFraming(phoneFraming);
  return {
    '--frame-pos-md': `${large.x}% ${large.y}%`,
    '--frame-scale-md': String(large.zoom),
    '--frame-pos-sm': `${phone.x}% ${phone.y}%`,
    '--frame-scale-sm': String(phone.zoom),
  };
}

/**
 * Builds `src` + `srcSet` for an image slot.
 *
 * @param {string} url
 * @param {{ widths: number[], ratio?: number, faces?: boolean }} options
 *   `ratio` is height ÷ width of the slot (4/3 for a 3:4 portrait card).
 * @returns {{ src: string, srcSet?: string }}
 */
export function responsiveImage(url, { widths, ratio, faces = false }) {
  const parsed = parse(url);
  if (!isResizable(parsed) || !widths?.length) return { src: url };

  const at = (w) => resizeImageUrl(url, { width: w, height: ratio ? Math.round(w * ratio) : undefined, faces });

  return {
    // A mid-sized fallback for the rare browser that ignores srcset.
    src: at(widths[Math.min(2, widths.length - 1)]),
    srcSet: widths.map((w) => `${at(w)} ${w}w`).join(', '),
  };
}
