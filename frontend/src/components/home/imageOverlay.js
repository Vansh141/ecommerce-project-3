/**
 * Words laid over a photograph — the Full Banner and the Full Image Story.
 *
 * The readability layer is a soft gradient, never an opaque box, so the
 * photograph stays dominant. On phones the words sit at the bottom and the
 * shade rises from there; on larger screens it comes from the words' side
 * (or evenly behind centred words). Light shading pairs with dark text;
 * medium and dark shading pair with light text.
 */

export const OVERLAY_LAYER = {
  dark: {
    left: 'bg-gradient-to-t from-ink/80 via-ink/45 to-ink/10 md:bg-gradient-to-r md:from-ink/75 md:via-ink/40 md:to-transparent',
    center: 'bg-gradient-to-t from-ink/80 via-ink/45 to-ink/10 md:bg-none md:bg-ink/45',
    right: 'bg-gradient-to-t from-ink/80 via-ink/45 to-ink/10 md:bg-gradient-to-l md:from-ink/75 md:via-ink/40 md:to-transparent',
  },
  medium: {
    left: 'bg-gradient-to-t from-ink/65 via-ink/30 to-transparent md:bg-gradient-to-r md:from-ink/55 md:via-ink/25 md:to-transparent',
    center: 'bg-gradient-to-t from-ink/65 via-ink/30 to-transparent md:bg-none md:bg-ink/30',
    right: 'bg-gradient-to-t from-ink/65 via-ink/30 to-transparent md:bg-gradient-to-l md:from-ink/55 md:via-ink/25 md:to-transparent',
  },
  light: {
    left: 'bg-gradient-to-t from-paper/90 via-paper/55 to-transparent md:bg-gradient-to-r md:from-paper/85 md:via-paper/45 md:to-transparent',
    center: 'bg-gradient-to-t from-paper/90 via-paper/55 to-transparent md:bg-none md:bg-paper/50',
    right: 'bg-gradient-to-t from-paper/90 via-paper/55 to-transparent md:bg-gradient-to-l md:from-paper/85 md:via-paper/45 md:to-transparent',
  },
};

const ON_DARK = {
  eyebrow: 'text-gold-soft',
  heading: 'text-paper [text-shadow:0_1px_18px_rgb(0_0_0/0.25)]',
  accent: 'text-gold-soft',
  body: 'text-paper/90',
  button: 'bg-paper text-ink hover:bg-paper-raised',
};

export const OVERLAY_TEXT = {
  dark: ON_DARK,
  medium: ON_DARK,
  light: {
    eyebrow: 'text-clay-deep',
    heading: 'text-ink',
    accent: 'text-clay-deep',
    body: 'text-ink-soft',
    button: '',
  },
};

/** Where the block of words sits. Phones keep left and right words left-aligned. */
export const TEXT_BOX = {
  left: 'mr-auto items-start text-left',
  center: 'mx-auto items-center text-center',
  right: 'mr-auto items-start text-left md:ml-auto md:mr-0 md:items-end md:text-right',
};
