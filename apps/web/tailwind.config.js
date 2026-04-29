/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0B0F0D',
          surface: '#111713',
          elevated: '#1A2119',
          hover: '#1F2A1E',
        },
        border: { DEFAULT: '#2A3828' },
        brand: {
          DEFAULT: '#016745',
          hover: '#017d53',
          muted: '#013d28',
        },
        text: {
          primary: '#E8F5E0',
          secondary: '#8FAF87',
          disabled: '#4A6548',
        },
        danger: '#e53e3e',
        warning: '#d97706',
        success: '#16a34a',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}

