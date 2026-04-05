import tailwindcssAnimate from 'tailwindcss-animate';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        primary: { DEFAULT: 'hsl(var(--primary))', foreground: 'hsl(var(--primary-foreground))' },
        secondary: { DEFAULT: 'hsl(var(--secondary))', foreground: 'hsl(var(--secondary-foreground))' },
        destructive: { DEFAULT: 'hsl(var(--destructive))', foreground: 'hsl(var(--destructive-foreground))' },
        muted: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--muted-foreground))' },
        accent: { DEFAULT: 'hsl(var(--accent))', foreground: 'hsl(var(--accent-foreground))' },
        popover: { DEFAULT: 'hsl(var(--popover))', foreground: 'hsl(var(--popover-foreground))' },
        card: { DEFAULT: 'hsl(var(--card))', foreground: 'hsl(var(--card-foreground))' },
      },
      fontFamily: {
        sans:    ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
        display: ['"Unbounded"', 'system-ui', 'sans-serif'],
        mono:    ['"Space Mono"', 'ui-monospace', 'monospace'],
        serif:   ['"Instrument Serif"', 'Georgia', 'serif'],
        'instrument-serif': ['"Instrument Serif"', 'Georgia', 'serif'],
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.1s ease-in-out infinite',
        'slide-up':  'slide-up 0.2s ease',
        'shimmer':   'shimmer 2s linear infinite',
        'gradient-shift': 'gradient-shift 3s linear infinite',
        'scroll-dot': 'scroll-dot 1.5s ease-in-out infinite',
        'fade-slide-in-1': 'fadeSlideIn 0.6s ease-out 0.1s both',
        'fade-slide-in-2': 'fadeSlideIn 0.6s ease-out 0.25s both',
        'fade-slide-in-3': 'fadeSlideIn 0.6s ease-out 0.4s both',
        'fade-slide-in-4': 'fadeSlideIn 0.6s ease-out 0.55s both',
      },
      keyframes: {
        'fadeSlideIn': {
          from: { opacity: '0', transform: 'translateY(20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
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
  plugins: [tailwindcssAnimate],
};
