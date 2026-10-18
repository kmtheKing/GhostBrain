/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        sans: ['Inter', 'sans-serif']
      },
      colors: {
        brand: {
          cyan: '#0284c7',
          cobalt: '#2563eb',
          teal: '#0d9488',
          emerald: '#059669',
          amber: '#d97706',
          purple: '#7c3aed',
          frost: '#f8fafc',
          porcelain: '#f1f5f9'
        }
      }
    }
  },
  plugins: []
};
