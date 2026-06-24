import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // "Gallery at dusk" — a dimly lit room of deep warm charcoal where the
        // artwork is the only true source of colour. UI recedes into the walls.
        gallery: {
          DEFAULT: '#100e0c', // the wall — deep warm near-black
          raised: '#1a1714', // elevated surfaces: label sheets, chips
          line: '#2a2620', // hairline dividers
        },
        // Warm ivory text — never pure white (reduces glare against the dark).
        linen: {
          DEFAULT: '#f1ece1', // primary
          dim: '#aaa093', // secondary
          faint: '#736b5f', // tertiary / captions
        },
        // A single antique-gilt accent. Used only for moments — gilded frames,
        // illuminated initials, the "treasured" mark.
        gilt: {
          DEFAULT: '#c8a45c',
          soft: '#8a7340', // muted gilt for hairlines / hovers
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'Cambria', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      maxWidth: {
        reading: '34rem',
      },
      letterSpacing: {
        eyebrow: '0.22em',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      boxShadow: {
        // Soft ambient light pooling around a spotlit artwork.
        gallery: '0 30px 80px -30px rgba(0,0,0,0.85)',
        frame: '0 1px 0 0 rgba(241,236,225,0.04), 0 18px 50px -24px rgba(0,0,0,0.9)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.6s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
