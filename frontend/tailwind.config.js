/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Darkroom accent — the safelight. One color, and it means "action
        // / exposure in progress". Warm red-orange, never indigo.
        primary: {
          300: '#FFB3A5',
          400: '#FF8A75',
          500: '#F06A52',
          600: '#D8492F',
          700: '#B03A26',
          800: '#8A2E1F',
          900: '#6B241A',
        },
        // Warm graphite — the darkroom itself. Not cold navy: the room is
        // lit by a warm safelight, so surfaces carry a faint warm cast.
        surface: {
          50: '#F7F4EE',
          100: '#F1EDE6',
          200: '#D9D4CB',
          300: '#C2BCB2',
          400: '#A29C91',
          500: '#857F74',
          600: '#5E5A52',
          700: '#2A2826',
          800: '#1A1917',
          900: '#131110',
          950: '#0C0B09',
        },
        // Warm hairlines — "light of the safelight" edges.
        line: {
          DEFAULT: 'rgba(241,237,230,0.08)',
          subtle: 'rgba(241,237,230,0.05)',
          strong: 'rgba(241,237,230,0.14)',
        },
        // Fibre paper — the ONLY light surface. The developed print.
        paper: {
          DEFAULT: '#F4F0E8',
          ink: '#1C1A17',
          wash: '#E9E4DA',
        },
        status: {
          success: '#4CB05E',
          warning: '#E0A03E',
          error: '#F2555A',
        },
      },
      fontFamily: {
        // Workhorse UI face for Operate mode; character comes from the
        // room, not from a display face.
        sans: ['"Inter Tight"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        // Exposure data, timestamps, version stamps — mono for measurement.
        mono: ['"JetBrains Mono"', 'Fira Code', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        overlay: '0 1px 2px rgba(0,0,0,0.4), 0 12px 40px rgba(0,0,0,0.55)',
        // The print lying on the bench — soft, warm-shadowed.
        canvas: '0 2px 4px rgba(0,0,0,0.5), 0 24px 64px rgba(0,0,0,0.6)',
        // The safelight is on: offset + blur, never a zero-offset halo.
        cta: '0 2px 12px rgba(0,0,0,0.35), 0 10px 32px rgba(216,73,47,0.22)',
        'segment-inset': 'inset 0 1px 0 rgba(241,237,230,0.06)',
      },
      animation: {
        'pulse-dot': 'pulse-dot 1.4s ease-in-out infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'slide-up': 'slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-left': 'slide-in-left 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-in-right': 'slide-in-right 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        shimmer: 'shimmer 1.6s linear infinite',
        // The frame "develops": density ramps in from blank paper.
        'frame-flash': 'frame-flash 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        // The safelight breathes while an exposure runs.
        'safelight-breathe': 'safelight-breathe 2.2s ease-in-out infinite',
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
        'frame-flash': {
          '0%': { opacity: '0.4', filter: 'grayscale(0.6)' },
          '100%': { opacity: '1', filter: 'grayscale(0)' },
        },
        'safelight-breathe': {
          '0%, 100%': { opacity: '0.85' },
          '50%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
