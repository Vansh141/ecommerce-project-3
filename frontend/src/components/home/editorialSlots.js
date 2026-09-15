/**
 * The bundled editorial photographs produced by `npm run assets:editorial`
 * from `touch-assets/`, named `<slot>-<width>x<height>.<avif|webp>` and
 * discovered at build time. Shared by the homepage and the admin previews.
 */
const FILES = import.meta.glob('../../assets/editorial/*.{avif,webp}', {
  eager: true,
  query: '?url',
  import: 'default',
});

const NAME = /([^/]+)-(\d+)x(\d+)\.(avif|webp)$/;

export const SLOTS = Object.entries(FILES).reduce((slots, [path, url]) => {
  const match = path.match(NAME);
  if (!match) return slots;
  const [, slot, width, height, format] = match;
  const entry = slots[slot] || { avif: [], webp: [] };
  entry[format].push({ url, width: Number(width), height: Number(height) });
  slots[slot] = entry;
  return slots;
}, {});

Object.values(SLOTS).forEach((entry) => {
  entry.avif.sort((a, b) => a.width - b.width);
  entry.webp.sort((a, b) => a.width - b.width);
});

/** A small WebP of a bundled photograph, for thumbnails; `null` when missing. */
export function slotImageUrl(slot) {
  const files = SLOTS[slot]?.webp || [];
  return files.length ? files[Math.min(1, files.length - 1)].url : null;
}
