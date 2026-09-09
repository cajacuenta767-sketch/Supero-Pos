/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Theme palette for Supero POS
        light: {
          bg: '#FFFFFF',
          secondaryBg: '#F8F9FA',
          card: '#FFFFFF',
          text: '#1A1D20',
          mutedText: '#6C757D',
          border: '#DEE2E6',
          primary: '#0D6EFD',
        },
        dark: {
          bg: '#000000',
          secondaryBg: '#0B0C10',
          card: '#121212',
          text: '#F3F4F6',
          mutedText: '#9CA3AF',
          border: '#1F2833',
          primary: '#3B82F6',
        }
      }
    },
  },
  plugins: [],
}
