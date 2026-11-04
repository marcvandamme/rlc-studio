/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter Variable', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono Variable', 'JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        canvas: 'rgb(var(--canvas) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        raised: 'rgb(var(--raised) / <alpha-value>)',
        line: 'rgb(var(--line) / <alpha-value>)',
        ink: 'rgb(var(--ink) / <alpha-value>)',
        muted: 'rgb(var(--muted) / <alpha-value>)',
        faint: 'rgb(var(--faint) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        accentInk: 'rgb(var(--accent-ink) / <alpha-value>)',
        inductive: 'rgb(var(--inductive) / <alpha-value>)',
        capacitive: 'rgb(var(--capacitive) / <alpha-value>)',
        resonant: 'rgb(var(--resonant) / <alpha-value>)',
      },
      boxShadow: {
        card: '0 1px 2px rgb(15 23 42 / 0.04), 0 12px 32px -24px rgb(15 23 42 / 0.25)',
        lift: '0 1px 2px rgb(15 23 42 / 0.05), 0 24px 48px -28px rgb(15 23 42 / 0.35)',
      },
      borderRadius: {
        '2.5xl': '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 260ms ease-out both',
      },
    },
  },
  plugins: [],
};
