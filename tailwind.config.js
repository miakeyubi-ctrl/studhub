/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
     "./src/**/*.{html,ts}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#56C8D1',
          50: '#EFFBFC',
          100: '#DAF4F6',
          200: '#B4E9EC',
          300: '#8FDDE3',
          400: '#6AD1D9',
          500: '#56C8D1',
          600: '#2E9DA6',
          700: '#1F7379',
          800: '#164F53',
          900: '#0E3336',
        },
      },
    },
  },
  plugins: [],
 
  darkMode: 'class',

}

