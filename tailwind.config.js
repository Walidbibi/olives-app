/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        olive: {
          50: '#f8faf0',
          100: '#f0f5d0',
          200: '#e0eb90',
          300: '#cddc50',
          400: '#b8c820',
          500: '#9fb310',
          600: '#84990a',
          700: '#6a7d0a',
          800: '#55620f',
          900: '#465012',
        }
      }
    },
  },
  plugins: [],
}
