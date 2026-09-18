/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#faf6ee',
          100: '#f2e7d2',
          200: '#e6cfa4',
          300: '#d8b377',
          400: '#c99a55',
          500: '#b8863f',
          600: '#a06e30',
          700: '#7f5628',
          800: '#624322',
          900: '#4a331b',
        },
        ink: {
          DEFAULT: 'rgb(var(--ink) / <alpha-value>)',
          soft: 'rgb(var(--ink-soft) / <alpha-value>)',
          faint: 'rgb(var(--ink-faint) / <alpha-value>)',
        },
        surface: {
          page: 'rgb(var(--surface-page) / <alpha-value>)',
          card: 'rgb(var(--surface-card) / <alpha-value>)',
          header: 'rgb(var(--surface-header) / <alpha-value>)',
          field: 'rgb(var(--surface-field) / <alpha-value>)',
          line: 'rgb(var(--surface-line) / <alpha-value>)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['Oswald', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};