/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'pulse-dot': 'pulse-dot 1.1s ease-in-out infinite',
        'slide-up':  'slide-up 0.2s ease',
        'shimmer':   'shimmer 2s linear infinite',
        'gradient-shift': 'gradient-shift 3s linear infinite',
        'scroll-dot': 'scroll-dot 1.5s ease-in-out infinite',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':       { opacity: '0.4', transform: 'scale(0.75)' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateX(-50%) translateY(8px)' },
          to:   { opacity: '1', transform: 'translateX(-50%) translateY(0)' },
        },
        'shimmer': {
          '0%':   { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        'gradient-shift': {
          '0%':   { backgroundPosition: '0% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'scroll-dot': {
          '0%, 100%': { opacity: '1', transform: 'translateY(0)' },
          '50%':      { opacity: '0', transform: 'translateY(8px)' },
        },
      },
    },
  },
  plugins: [],
};
