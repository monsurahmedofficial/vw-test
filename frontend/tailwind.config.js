/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        vw: {
          purple: '#7c3aed',
          violet: '#8b5cf6',
          light: '#a78bfa',
          dark: '#0f0a1e',
          card: 'rgba(255,255,255,0.05)',
        },
      },
      backdropBlur: { glass: '12px' },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
