/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      animation: {
        'pulse-dot': 'pulse-dot 1.1s ease-in-out infinite',
        'slide-up':  'slide-up 0.2s ease',
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
      },
    },
  },
  plugins: [],
};
