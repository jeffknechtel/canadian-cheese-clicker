/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Cheese colors
        cheddar: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b', // Primary cheddar
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
        // Canadian colors
        maple: {
          50: '#fef2f2',
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444', // Maple red
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Wood/Timber colors (Canadian cabin aesthetic)
        timber: {
          50: '#faf5f0',
          100: '#f0e6d8',
          200: '#e0ccb0',
          300: '#c9a875',
          400: '#b18a4a',
          500: '#8b6914', // Primary timber
          600: '#755812',
          700: '#5f4810',
          800: '#4a380d',
          900: '#35280a',
        },
        // Tim Hortons-inspired colors
        timmys: {
          red: '#c8102e',
          brown: '#4a2c2a',
          cream: '#f5e6d3',
        },
        cream: '#fffef5',
        rind: '#8b7355',
        snow: '#f8fafc',
        ice: '#e0f2fe',
      },
      animation: {
        'float': 'float 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shake': 'shake 0.3s ease-in-out',
        'slide-up': 'slide-up 0.3s ease-out forwards',
        'slide-down-fast': 'slide-down 0.2s ease-out forwards',
        'slide-in-left': 'slide-in-left 0.25s ease-out forwards',
        'slide-in-right': 'slide-in-right 0.25s ease-out forwards',
        'fade-in': 'fade-in 0.3s ease-out forwards',
        'modal-in': 'modal-in 0.25s ease-out forwards',
        'backdrop-in': 'backdrop-in 0.2s ease-out forwards',
        'number-pop': 'number-pop 0.3s ease-out',
        'success-flash': 'success-flash 0.4s ease-out',
        'value-highlight': 'value-highlight 0.5s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 20px currentColor' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-5px)' },
          '75%': { transform: 'translateX(5px)' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          from: { transform: 'translateY(-10px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-in-left': {
          from: { transform: 'translateX(-20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'slide-in-right': {
          from: { transform: 'translateX(20px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'modal-in': {
          from: { opacity: '0', transform: 'scale(0.95) translateY(10px)' },
          to: { opacity: '1', transform: 'scale(1) translateY(0)' },
        },
        'backdrop-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'number-pop': {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(1)' },
        },
        'success-flash': {
          '0%': { backgroundColor: 'inherit' },
          '50%': { backgroundColor: 'rgba(34, 197, 94, 0.3)' },
          '100%': { backgroundColor: 'inherit' },
        },
        'value-highlight': {
          '0%': { color: 'inherit' },
          '50%': { color: '#22c55e' },
          '100%': { color: 'inherit' },
        },
      },
      transitionTimingFunction: {
        'bounce-in': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      },
    },
  },
  plugins: [],
};
