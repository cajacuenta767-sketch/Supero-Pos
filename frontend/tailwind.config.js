/** @type {import('tailwindcss').Config} */
const ch = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: ch('--bg-canvas'),
        surface: ch('--bg-surface'),
        raised: ch('--bg-raised'),
        sunken: ch('--bg-sunken'),

        line: ch('--line-subtle'),
        'line-strong': ch('--line-strong'),

        ink: ch('--ink-1'),
        'ink-2': ch('--ink-2'),
        'ink-3': ch('--ink-3'),

        accent: ch('--accent'),
        'accent-hover': ch('--accent-hover'),
        'accent-soft': ch('--accent-soft'),
        'accent-ink': ch('--accent-ink'),

        ok: ch('--ok'),
        'ok-soft': ch('--ok-soft'),
        'ok-ink': ch('--ok-ink'),

        warn: ch('--warn'),
        'warn-soft': ch('--warn-soft'),
        'warn-ink': ch('--warn-ink'),

        danger: ch('--danger'),
        'danger-soft': ch('--danger-soft'),
        'danger-ink': ch('--danger-ink'),
      },

      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
      },

      boxShadow: {
        e1: 'var(--e-1)',
        e2: 'var(--e-2)',
        e3: 'var(--e-3)',
      },

      fontFamily: {
        sans: ['InterVariable', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: [
          'JetBrains Mono Variable',
          'JetBrains Mono',
          'ui-monospace',
          'SFMono-Regular',
          'monospace',
        ],
      },

      /* Escala fija. Se elimina todo text-[Npx]. Piso absoluto: 11px. */
      fontSize: {
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.04em', fontWeight: '600' }],
        body: ['0.8125rem', { lineHeight: '1.125rem' }],
        base: ['0.9375rem', { lineHeight: '1.375rem' }],
        title: ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        display: ['1.75rem', { lineHeight: '2rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        hero: ['3.5rem', { lineHeight: '3.5rem', fontWeight: '700', letterSpacing: '-0.03em' }],
      },

      /* Ritmo de 4px + objetivos táctiles */
      spacing: { touch: '2.75rem', pos: '4rem' },

      transitionTimingFunction: { ease: 'var(--ease)' },
      transitionDuration: { fast: '120ms', base: '180ms', slow: '280ms' },

      keyframes: {
        'scan-flash': {
          '0%': { backgroundColor: 'rgb(var(--accent) / 0.28)', transform: 'translateX(-6px)' },
          '100%': { backgroundColor: 'rgb(var(--bg-raised) / 1)', transform: 'translateX(0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.99)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'scan-flash': 'scan-flash 420ms var(--ease)',
        'fade-in': 'fade-in var(--t-base) var(--ease)',
        'rise-in': 'rise-in var(--t-slow) var(--ease)',
      },
    },
  },
  plugins: [],
};
