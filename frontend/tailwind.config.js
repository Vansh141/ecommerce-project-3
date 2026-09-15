import plugin from 'tailwindcss/plugin';

/**
 * Colours resolve through CSS variables holding RGB channels (defined in
 * src/index.css). The storefront carries the brand palette on :root, while the
 * admin panel keeps its established palette through one scope class — and the
 * `<alpha-value>` placeholder keeps opacity modifiers such as `bg-ink/40`
 * working in both.
 */
const channel = (name) => `rgb(var(--${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Core neutrals: warm ivory grounds, charcoal ink ─────────────────
        ink: {
          DEFAULT: channel('ink'),
          soft: channel('ink-soft'),
          muted: channel('ink-muted'),
          faint: channel('ink-faint'),
        },
        paper: {
          DEFAULT: channel('paper'),
          raised: channel('paper-raised'),
          sunken: channel('paper-sunken'),
        },
        line: {
          DEFAULT: channel('line'),
          strong: channel('line-strong'),
        },
        // ── Brand accent: taupe, with a terracotta deep tone for text ───────
        clay: {
          DEFAULT: channel('clay'),
          soft: channel('clay-soft'),
          faint: channel('clay-faint'),
          deep: channel('clay-deep'),
        },
        sage: {
          DEFAULT: '#7D8C7C',
          faint: '#E8EDE7',
        },
        // ── Storefront editorial accents ─────────────────────────────────────
        // Grounds and small marks only. The clothing carries the colour; the
        // interface stays quiet around it.
        rust: '#9A3F2F',
        maroon: '#5C1F2A',
        olive: '#4A4632',
        umber: '#4E3B2F',
        gold: { DEFAULT: '#B89B6A', soft: '#D8C6A2' },
        // ── Semantic ─────────────────────────────────────────────────────────
        success: { DEFAULT: channel('success'), faint: channel('success-faint') },
        warning: { DEFAULT: channel('warning'), faint: channel('warning-faint') },
        danger: { DEFAULT: channel('danger'), faint: channel('danger-faint') },
        info: { DEFAULT: channel('info'), faint: channel('info-faint') },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Jost', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      letterSpacing: {
        luxe: '0.28em',
        wider2: '0.16em',
      },
      borderRadius: {
        // Deliberately restrained. Heavily rounded cards read as "app", not
        // "boutique"; editorial fashion sites stay close to square.
        card: '2px',
        control: '3px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(31,26,23,0.04)',
        raised: '0 4px 16px -4px rgba(31,26,23,0.10)',
        pop: '0 12px 40px -8px rgba(31,26,23,0.18)',
      },
      maxWidth: {
        site: '1440px',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.25s ease-out both',
        rise: 'rise 0.7s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-right': 'slide-in-right 0.28s cubic-bezier(0.22,1,0.36,1) both',
        'slide-in-left': 'slide-in-left 0.28s cubic-bezier(0.22,1,0.36,1) both',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [
    /**
     * `can-hover:` applies only where a real pointer can hover. Touch devices
     * emulate :hover on tap and leave it stuck, so anything that reveals or
     * hides content on hover must go through this variant.
     */
    plugin(({ addVariant }) => {
      addVariant('can-hover', '@media (hover: hover) and (pointer: fine)');
    }),
  ],
};
