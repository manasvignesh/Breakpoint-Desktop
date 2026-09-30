/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        breakpoint: {
          orange: '#FF5A1F',
          dark: '#0A0B0E',
          card: '#12141A',
          cardHover: '#181B22',
          border: '#232734',
          muted: '#8B949E',
          text: '#F0F3F6',
          accent: '#FF7A45',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
