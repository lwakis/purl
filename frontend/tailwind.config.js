/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          300: '#A9B0FF',
          400: '#8B93FF',
          500: '#7170FF',
          600: '#5E6AD2',
          700: '#4A55C6',
          800: '#3B448A',
          900: '#2D345E',
        },
        surface: {
          50: '#FBFBFC',
          100: '#F7F8F8',
          200: '#DFE3E8',
          300: '#C8CCD2',
          400: '#9AA0A8',
          500: '#7A8088',
          600: '#595D64',
          700: '#2A2D33',
          800: '#191A1F',
          900: '#0F1113',
          950: '#08090B',
        },
        line: {
          DEFAULT: 'rgba(255,255,255,0.08)',
          subtle: 'rgba(255,255,255,0.05)',
          strong: 'rgba(255,255,255,0.14)',
        },
        status: {
          success: '#27A644',
          warning: '#E5A13B',
          error: '#EF4444',
        },
      },
      fontFamily: {
        sans: ['"Inter Tight"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        overlay: '0 1px 1px rgba(0,0,0,0.3), 0 8px 40px rgba(0,0,0,0.5)',
        canvas: '0 16px 48px rgba(0,0,0,0.5)',
        cta: '0 8px 24px rgba(94,106,210,0.25)',
        'segment-inset': 'inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
      },
      keyframes: {
        'pulse-dot': {
          '0%, 80%, 100%': { opacity: '0.3' },
          '40%': { opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-left': {
          from: { opacity: '0', transform: 'translateX(-16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};