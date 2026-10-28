/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#080B12',
        card: '#0E1320',
        cardBorder: '#1F293D',
        primary: {
          DEFAULT: '#F59E0B',
          foreground: '#000000',
        },
        emerald: {
          DEFAULT: '#10B981',
          400: '#34D399',
          500: '#10B981',
        },
        amber: {
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706',
        },
        muted: '#171F32',
        'muted-foreground': '#94A3B8',
        foreground: '#F8FAFC',
      },
      fontFamily: {
        display: ['Russo One', 'Inter', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

