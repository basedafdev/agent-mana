/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          dark: 'rgba(0, 0, 0, 0.2)',
        },
        metal: {
          gold: {
            from: '#fbbf24',
            to: '#d97706',
          },
          silver: {
            from: '#cbd5e1',
            to: '#94a3b8',
          },
          platinum: {
            from: '#bfdbfe',
            to: '#818cf8',
          },
        },
      },
      backgroundImage: {
        'glass-light': 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
        'glass-dark': 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 100%)',
        'metal-gold': 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
        'metal-silver': 'linear-gradient(135deg, #cbd5e1 0%, #94a3b8 100%)',
        'metal-platinum': 'linear-gradient(135deg, #bfdbfe 0%, #818cf8 100%)',
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
        'glass-lg': '0 20px 60px 0 rgba(0, 0, 0, 0.15)',
        'inner-glow': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
