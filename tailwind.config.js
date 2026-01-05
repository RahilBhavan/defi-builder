/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './features/**/*.{js,ts,jsx,tsx}',
    './hooks/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#FAFAF8',
        ink: '#0A0A0A',
        orange: '#FF5500',
        'uniswap-pink': '#FF007A',
        'aave-purple': '#B6509E',
        'success-green': '#00D395',
        'alert-red': '#FF4444',
        gray: {
          100: '#F5F5F3',
          200: '#E0E0E0',
          300: '#D0D0D0',
          400: '#AAAAAA',
          600: '#666666',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
      borderRadius: {
        none: '0px',
      },
      spacing: {
        18: '4.5rem',
      },
      boxShadow: {
        canvas: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        'canvas-md': '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
        'canvas-lg': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
};
