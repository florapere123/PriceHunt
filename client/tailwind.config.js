/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '0 0' },
        },
        'skeleton-shimmer': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'loading-bar-slide': {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        'pulse-dot': {
          '50%': { opacity: '0.3' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.2s linear infinite',
        'skeleton-shimmer': 'skeleton-shimmer 1.4s ease-in-out infinite',
        'loading-bar-slide': 'loading-bar-slide 1.1s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
