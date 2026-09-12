/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12242E',
        sand: '#F6F1E9',
        surface: '#FFFFFF',
        teal: {
          DEFAULT: '#1F4B4A',
          dark: '#163534',
          light: '#2E6664'
        },
        brass: {
          DEFAULT: '#B98A4A',
          dark: '#96703A',
          light: '#D3AC77'
        },
        slate: {
          DEFAULT: '#5B6B6A',
          light: '#8B9998'
        },
        line: '#E4DDCE'
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 2px rgba(18, 36, 46, 0.06), 0 8px 24px -12px rgba(18, 36, 46, 0.18)'
      }
    }
  },
  plugins: []
};
