#!/usr/bin/env node
/**
 * Builds the homepage editorial images from the originals in `touch-assets/`.
 *
 *   npm run assets:editorial                  every slot
 *   npm run assets:editorial -- auth         only the named slots
 *
 * Each slot is cropped to the shape its layout uses and exported at a few
 * widths as AVIF and WebP into `frontend/src/assets/editorial/`, named
 * `<slot>-<width>x<height>.<ext>`. The storefront discovers those files at
 * build time; a slot with no files renders a quiet placeholder instead, so the
 * site builds and works before any photography exists.
 *
 * sharp is borrowed from the backend's existing dependencies, so this adds no
 * package to the frontend. Commit the generated files: the storefront build on
 * the host does not run this script.
 */
import { createRequire } from 'node:module';
import { mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INPUT_DIR = path.join(ROOT, 'touch-assets');
const OUTPUT_DIR = path.join(ROOT, 'frontend', 'src', 'assets', 'editorial');
const SOURCE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff'];

let sharp;
try {
  sharp = createRequire(path.join(ROOT, 'backend', 'package.json'))('sharp');
} catch {
  console.error('sharp is not installed. Run `npm --prefix backend install` first.');
  process.exit(1);
}

/**
 * `aspect` is width ÷ height of the exported crop. `region` optionally cuts a
 * part of the source first (fractions of the source size) — used to take the
 * embroidery detail from the portrait when no separate detail shot exists.
 * `position` is where sharp anchors the crop.
 */
const SLOTS = [
  { slot: 'hero-portrait', sources: ['hero-portrait'], aspect: 3 / 4, widths: [270, 400, 540], position: 'north' },
  { slot: 'hero-full-length', sources: ['hero-full-length'], aspect: 3 / 4, widths: [270, 400, 540], position: 'north' },
  {
    slot: 'hero-detail',
    sources: ['hero-detail'],
    fallback: { source: 'hero-portrait', region: { left: 0.26, top: 0.44, width: 0.48, height: 0.56 } },
    aspect: 1 / 2,
    widths: [180, 270, 360],
    position: 'centre',
  },
  { slot: 'story', sources: ['story', 'hero-full-length'], aspect: 4 / 5, widths: [420, 640, 860], position: 'north' },
  // Sign-in pages: a tall photograph beside the form, and a wide crop above it on phones.
  { slot: 'auth', sources: ['auth', 'hero-full-length'], aspect: 4 / 5, widths: [640, 860, 1024], position: 'north' },
  { slot: 'auth-mobile', sources: ['auth-mobile', 'auth', 'hero-full-length'], aspect: 8 / 5, widths: [480, 768, 1024], position: 'north' },
];

async function findSource(name) {
  for (const ext of SOURCE_EXTENSIONS) {
    const candidate = path.join(INPUT_DIR, `${name}${ext}`);
    try {
      if ((await stat(candidate)).isFile()) return candidate;
    } catch {
      /* try the next extension */
    }
  }
  return null;
}

async function loadOverrides() {
  try {
    return JSON.parse(await readFile(path.join(INPUT_DIR, 'slots.json'), 'utf8'));
  } catch {
    return {};
  }
}

async function clearSlot(slot) {
  const existing = await readdir(OUTPUT_DIR).catch(() => []);
  await Promise.all(
    existing
      .filter((file) => file.startsWith(`${slot}-`))
      .map((file) =>
        rm(path.join(OUTPUT_DIR, file)).catch((err) => {
          // On Windows a file another process still has open (a running dev
          // server, an antivirus scan) cannot be removed yet. It disappears
          // once that process lets go, so warn rather than abandon the build.
          if (err.code !== 'EPERM' && err.code !== 'EBUSY') throw err;
          console.warn(`  ! could not remove ${file} yet (in use by another process)`);
        })
      )
  );
}

async function sourceBuffer(file, region) {
  // Apply EXIF orientation first, so the region is measured on the photograph
  // as it is seen rather than as the camera stored it.
  const upright = await sharp(file).rotate().toBuffer();
  if (!region) return upright;

  const { width, height } = await sharp(upright).metadata();
  return sharp(upright)
    .extract({
      left: Math.round(width * region.left),
      top: Math.round(height * region.top),
      width: Math.round(width * region.width),
      height: Math.round(height * region.height),
    })
    .toBuffer();
}

async function buildSlot(config, overrides) {
  const settings = { ...config, ...(overrides[config.slot] || {}) };

  let file = null;
  for (const name of settings.sources) {
    file = await findSource(name);
    if (file) break;
  }

  let region = settings.region;
  if (!file && settings.fallback) {
    file = await findSource(settings.fallback.source);
    // A region set in slots.json wins over the built-in fallback crop.
    region = overrides[config.slot]?.region ?? settings.fallback.region;
  }

  if (!file) {
    // The original was removed: drop its old exports so the placeholder returns.
    await clearSlot(settings.slot);
    return { slot: settings.slot, status: 'missing' };
  }

  const buffer = await sourceBuffer(file, region);
  const { width: sourceWidth, height: sourceHeight } = await sharp(buffer).metadata();

  await clearSlot(settings.slot);
  const written = [];

  // Never upscale in either direction: the widest crop is bounded by the
  // source's width and by the width its height allows at this aspect.
  const maxWidth = Math.min(sourceWidth, Math.floor(sourceHeight * settings.aspect));
  // Requested widths above that limit collapse to the limit itself, so the
  // largest real size is still offered instead of being dropped.
  const widths = [...new Set(settings.widths.map((w) => Math.min(w, maxWidth)))];

  for (const width of widths) {
    const height = Math.round(width / settings.aspect);
    const pipeline = sharp(buffer).resize(width, height, { fit: 'cover', position: settings.position });

    const base = path.join(OUTPUT_DIR, `${settings.slot}-${width}x${height}`);
    const avif = await pipeline.clone().avif({ quality: 52, effort: 5 }).toFile(`${base}.avif`);
    const webp = await pipeline.clone().webp({ quality: 74, effort: 5 }).toFile(`${base}.webp`);
    written.push(`${width}x${height} (avif ${Math.round(avif.size / 1024)} KB, webp ${Math.round(webp.size / 1024)} KB)`);
  }

  return { slot: settings.slot, status: 'built', from: path.relative(ROOT, file), written };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const overrides = await loadOverrides();

  // `npm run assets:editorial -- auth auth-mobile` builds only the named slots.
  const only = process.argv.slice(2).filter((arg) => !arg.startsWith('-'));
  for (const config of SLOTS.filter((slot) => only.length === 0 || only.includes(slot.slot))) {
    const result = await buildSlot(config, overrides);
    if (result.status === 'missing') {
      console.log(`- ${result.slot}: no source image found, placeholder stays`);
    } else {
      console.log(`✓ ${result.slot} from ${result.from}`);
      result.written.forEach((line) => console.log(`    ${line}`));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
