/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        page: 'var(--bg-page)',
        surface: 'var(--bg-surface)',
        subtle: 'var(--bg-subtle)',
        primary: { DEFAULT: 'var(--color-primary)', soft: 'var(--color-primary-soft)' },
        accent: { DEFAULT: 'var(--color-accent)', soft: 'var(--color-accent-soft)' },
        success: { DEFAULT: 'var(--color-success)', soft: 'var(--color-success-soft)' },
        danger: { DEFAULT: 'var(--color-danger)', soft: 'var(--color-danger-soft)' },
        warning: { DEFAULT: 'var(--color-warning)', soft: 'var(--color-warning-soft)' },
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-subtle': 'var(--border-subtle)',
      },
      borderRadius: {
        control: 'var(--radius-control)',
        card: 'var(--radius-card)',
        sheet: 'var(--radius-sheet)',
      },
      boxShadow: { card: 'var(--shadow-card)' },
      fontFamily: { sans: ['var(--font-sans)'] },
    },
  },
};
