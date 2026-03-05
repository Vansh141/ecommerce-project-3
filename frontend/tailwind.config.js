/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3F61F9',
        secondary: '#00D1C8',
        dark: '#1D1E22',
        light: '#F8F9FA',
        touchPink: '#E8CFCF',
        touchSage: '#8FA99B',
        touchCream: '#F5EFEA',
        touchDark: '#2D2D2D',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        }
      }
    },
  },
  plugins: [],
}
