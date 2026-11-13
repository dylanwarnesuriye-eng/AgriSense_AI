/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // AgriSense AI — Google Stitch Theme
        brand: {
          primary: 'var(--color-brand-primary, #166534)',
          'primary-hover': 'var(--color-brand-primary-hover, #14532D)',
          'primary-active': '#052E16',
          secondary: '#22C55E',
          tint: 'var(--color-brand-tint, #DCFCE7)',
          'tint-border': 'var(--color-brand-tint-border, #86EFAC)',
        },
        canvas: 'var(--color-canvas, #F8FAF7)',
        surface: 'var(--color-surface, #FFFFFF)',
        border: {
          DEFAULT: 'var(--color-border, #E2E8F0)',
          subtle: 'var(--color-border-subtle, #CBD5E1)',
        },
        content: {
          primary: 'var(--color-content-primary, #0F172A)',
          muted: 'var(--color-content-muted, #64748B)',
        },
        semantic: {
          info: { DEFAULT: '#2563EB', bg: '#EFF6FF', text: '#1E40AF', border: '#93C5FD' },
          warning: { DEFAULT: '#D97706', bg: '#FFFBEB', text: '#92400E', border: '#FDE68A' },
          error: { DEFAULT: '#DC2626', bg: '#FEE2E2', text: '#B91C1C', border: '#FCA5A5' },
          success: { DEFAULT: '#166534', bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
        },
        // Backward-compatible color maps
        agri: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        earth: {
          50: '#fcf8f2',
          100: '#f7efe1',
          200: '#eddcc2',
          300: '#dfc29c',
          400: '#cfa374',
          500: '#bf8854',
          600: '#aa7145',
          700: '#895639',
          800: '#714633',
          900: '#5f3a2d',
        }
      },
      fontFamily: {
        sans: ['Inter', 'Noto Sans Sinhala', 'Iskoola Pota', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '0.25rem', // 4px
        lg: '0.5rem',        // 8px
        xl: '0.75rem',       // 12px
      },
      boxShadow: {
        'stitch-modal': '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
        'stitch-card': '0 1px 3px 0 rgba(15, 23, 42, 0.04)',
      },
    },
  },
  plugins: [],
}
