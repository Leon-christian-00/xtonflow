/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: {
          950: '#07070e',
          900: '#0b0b14',
          850: '#10101b',
          800: '#151522',
          700: '#1d1d2c',
          600: '#2a2a3d',
          500: '#3a3a52',
          400: '#4e4e6a',
        },
        brand: {
          50: '#f2f0ff',
          100: '#e6e2ff',
          200: '#cdc4ff',
          300: '#aea0ff',
          400: '#927eff',
          500: '#8272ff',
          600: '#6d5af1',
          700: '#5a46d6',
          800: '#4936ab',
          900: '#3a2c85',
        },
      },
      boxShadow: {
        'glow': '0 0 0 1px rgba(130, 114, 255, .35), 0 8px 32px -8px rgba(109, 90, 241, .5)',
        'glow-lg': '0 0 0 1px rgba(130, 114, 255, .4), 0 16px 64px -12px rgba(109, 90, 241, .55)',
        'card': '0 1px 2px rgba(16, 16, 27, .06), 0 4px 16px -4px rgba(16, 16, 27, .08)',
        'card-lg': '0 2px 4px rgba(16, 16, 27, .06), 0 16px 48px -12px rgba(16, 16, 27, .18)',
        'tilt': '0 20px 40px -16px rgba(0, 0, 0, .25)',
      },
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'slide-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
        'float': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
      },
      animation: {
        'fade-in': 'fade-in .25s ease both',
        'slide-up': 'slide-up .35s cubic-bezier(.16, 1, .3, 1) both',
        'scale-in': 'scale-in .2s cubic-bezier(.16, 1, .3, 1) both',
        'float': 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
