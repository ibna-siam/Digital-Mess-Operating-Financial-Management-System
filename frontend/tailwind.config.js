/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'surface-card': 'var(--color-card, #ffffff)',
        'surface-border': 'var(--color-border, #e2e8f0)',
        'text-muted': 'var(--text-muted, #64748b)',
        'text-main': 'var(--text-main, #0f172a)',
        primary: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
      },
      borderRadius: {
        'sm': 'var(--radius-sm, 6px)',
        'md': 'var(--radius-md, 10px)',
        'lg': 'var(--radius-lg, 14px)',
        'xl': 'var(--radius-xl, 20px)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.2s ease-out forwards',
      },
    },
  },
  plugins: [],
};
