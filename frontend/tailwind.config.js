/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        earth: {
          50: '#fdfbf7',
          100: '#f7f2ea',
          200: '#ece2d3',
          300: '#decbb4',
          400: '#caa98c',
          500: '#ba8d6c',
          600: '#ad7858',
          700: '#906048',
          800: '#754f3d',
          900: '#604135',
        },
      },
    },
  },
  plugins: [],
};
