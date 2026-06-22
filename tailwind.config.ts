import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Museum paper-and-ink palette. Quiet, warm, editorial.
        paper: {
          DEFAULT: '#f6f4ef', // gallery wall / page
          dim: '#efece4',
          deep: '#e7e3d8',
        },
        ink: {
          DEFAULT: '#1c1a17', // near-black warm
          soft: '#4a463f',
          faint: '#8a847a',
          ghost: '#b8b2a6',
        },
        accent: {
          DEFAULT: '#9a3b2e', // muted museum red, used sparingly
        },
        canvas: '#0e0d0b', // immersive dark surface for artwork viewing
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'Cambria', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        reading: '34rem', // comfortable measure for long-form text
      },
      letterSpacing: {
        widest: '0.2em',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
};

export default config;
