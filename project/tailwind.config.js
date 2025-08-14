/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
      },
      colors: {
        background: '#1a1a1a',
        foreground: '#ffffff',
        accent: {
          50: '#FFFDF7',
          100: '#FFF9E6',
          200: '#FFF0C2',
          300: '#FFE69D',
          400: '#FFDC79',
          500: '#D0B46A', // Your original accent color
          600: '#A48B54',
          700: '#78643E',
          800: '#4C3D28',
          900: '#20160C',
          950: '#100B06',
          DEFAULT: '#D0B46A', // Keep the default for existing classes
        },
        muted: '#666666',
        border: '#333333',
        card: '#222222',
        input: '#2a2a2a',
      },
      spacing: {
        '1': '0.25rem',   // 4px
        '2': '0.5rem',    // 8px
        '3': '0.75rem',   // 12px
        '4': '1rem',      // 16px
        '5': '1.25rem',   // 20px
        '6': '1.5rem',    // 24px
        '8': '2rem',      // 32px
        '10': '2.5rem',   // 40px
        '12': '3rem',     // 48px
        '16': '4rem',     // 64px
        '20': '5rem',     // 80px
        '24': '6rem',     // 96px
      }
    },
  },
  plugins: [],
};