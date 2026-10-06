/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/index.html', './src/renderer/src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Segoe UI Variable Text"', '"Segoe UI"', 'system-ui', 'sans-serif']
      },
      colors: {
        surface: '#0d0f15'
      },
      boxShadow: {
        // Has to fit inside the transparent padding around the card (see App.tsx).
        float: '0 6px 14px rgba(0, 0, 0, 0.45)'
      },
      keyframes: {
        'pop-in': {
          from: { opacity: '0', transform: 'translateY(6px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' }
        },
        shimmer: {
          to: { transform: 'translateX(100%)' }
        },
        blink: {
          '50%': { opacity: '0' }
        }
      },
      animation: {
        'pop-in': 'pop-in 180ms cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.4s infinite',
        blink: 'blink 1s steps(1) infinite'
      }
    }
  },
  plugins: []
}
