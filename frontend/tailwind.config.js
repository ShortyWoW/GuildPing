/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        charcoal: {
          light: '#2a2a35',
          DEFAULT: '#1b1b22',
          dark: '#0f0f15',
        },
        accent: {
          light: '#a78bfa',
          DEFAULT: '#7c3aed', // WoW Electric Violet
          dark: '#5b21b6',
        },
        wow: {
          alliance: '#0066ff',
          horde: '#c1272d',
          gold: '#f5b800',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'glow-purple': '0 0 15px rgba(124, 58, 237, 0.4)',
        'glow-green': '0 0 15px rgba(16, 185, 129, 0.4)',
        'glow-red': '0 0 15px rgba(239, 68, 68, 0.4)',
      }
    },
  },
  plugins: [],
}
