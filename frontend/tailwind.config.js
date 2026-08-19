/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ── Core neutrals ────────────────────────────────────────────────
        // A warm, low-chroma scale. Fashion retail reads as premium when the
        // page is mostly paper and ink, with colour reserved for meaning.
        ink: {
          DEFAULT: '#1C1917',
          soft: '#44403C',
          muted: '#78716C',
          faint: '#A8A29E',
        },
        paper: {
          DEFAULT: '#FAF8F5',
          raised: '#FFFFFF',
          sunken: '#F3EFEA',
        },
        line: {
          DEFAULT: '#E7E1D9',
          strong: '#D6CEC3',
        },
        // ── Brand accents ────────────────────────────────────────────────
        clay: {
          DEFAULT: '#B08D74',
          soft: '#C9AB96',
          faint: '#EFE4DB',
          deep: '#8D6E58',
        },
        sage: {
          DEFAULT: '#7D8C7C',
          faint: '#E8EDE7',
        },
        // ── Semantic ─────────────────────────────────────────────────────
        success: { DEFAULT: '#4F7A5B', faint: '#E9F1EA' },
        warning: { DEFAULT: '#9A6B2F', faint: '#FBF1E2' },
        danger: { DEFAULT: '#A3453B', faint: '#FAEBE9' },
        info: { DEFAULT: '#4A6376', faint: '#EAF0F4' },
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
        card: '0 1px 2px rgba(28,25,23,0.04)',
        raised: '0 4px 16px -4px rgba(28,25,23,0.10)',
        pop: '0 12px 40px -8px rgba(28,25,23,0.18)',
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
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.6s infinite',
        'fade-up': 'fade-up 0.4s ease-out both',
        'fade-in': 'fade-in 0.25s ease-out both',
        'slide-in-right': 'slide-in-right 0.28s cubic-bezier(0.22,1,0.36,1) both',
      },
      transitionTimingFunction: {
        luxe: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
