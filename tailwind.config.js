/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
    './hooks/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#1a5c2e',
          light: '#1e6b35',
          dark: '#143d1e',
        },
        wood: {
          DEFAULT: '#8b5e3c',
          light: '#a97c52',
          dark: '#6b4226',
        },
        gold: {
          DEFAULT: '#c9a84c',
          light: '#e0c169',
          dark: '#a8892a',
        },
        card: {
          bg: '#fafaf8',
          border: '#d1d5db',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['Georgia', 'serif'],
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-soft': 'bounce-soft 0.6s ease-in-out',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(201, 168, 76, 0)' },
          '50%': { boxShadow: '0 0 0 8px rgba(201, 168, 76, 0.4)' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
      },
      backgroundImage: {
        'felt-gradient': 'radial-gradient(ellipse at center, #1e6b35 0%, #143d1e 100%)',
        'wood-gradient': 'linear-gradient(135deg, #a97c52 0%, #6b4226 100%)',
      },
    },
  },
  plugins: [],
};
