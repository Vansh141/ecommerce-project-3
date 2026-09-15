# TOUCH editorial photography

Drop the original homepage photographs here, then run from the repository root:

```bash
npm run assets:editorial
```

The script crops and exports each slot as AVIF and WebP into
`frontend/src/assets/editorial/`. Commit those generated files. The storefront
picks them up at build time, and any slot without files shows a quiet
placeholder instead.

## File names

Use these base names with any of `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif` or `.tif`:

| File | Used for | Best source |
|---|---|---|
| `hero-portrait` | Hero portrait tile (desktop) and the mobile hero image | Studio close-up, face and neckline visible |
| `hero-full-length` | Second hero tile (tablet and desktop) | Full-length studio shot |
| `hero-detail` | Narrow embroidery tile (desktop). Optional: cropped from `hero-portrait` when absent | Close-up of the embroidery |
| `story` | "Style your story" panel. Optional: falls back to `hero-full-length` | Any editorial shot |
| `auth` | Photograph beside the sign-in forms. Optional: falls back to `hero-full-length` | Full-length or three-quarter editorial shot |
| `auth-mobile` | Wide photograph above the sign-in forms on phones. Optional: cropped from `auth` or `hero-full-length` | The same shot, face in the upper part |

Use photographs that show the garments accurately. Keep digitally restyled
images out of any slot that links to a product.

## Adjusting crops

Create `slots.json` next to the images to override a slot, for example:

```json
{
  "hero-full-length": { "position": "centre" },
  "hero-detail": { "region": { "left": 0.3, "top": 0.4, "width": 0.45, "height": 0.6 } }
}
```

`position` accepts sharp positions (`north`, `centre`, `south`, `attention`, …).
`region` values are fractions of the source image.

Alt text for each slot lives in `frontend/src/config/storefront.js` under
`EDITORIAL_ALT`. Update it if the photographs change.
