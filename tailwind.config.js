/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ["'JetBrains Mono'", 'monospace'],
      },
      colors: {
        ristek: {
          canvas: 'var(--ristek-bg-canvas)',
          surface: 'var(--ristek-bg-surface)',
          elevated: 'var(--ristek-bg-elevated)',
          border: 'var(--ristek-border)',
          primary: 'var(--ristek-primary)',
          primaryHover: 'var(--ristek-primary-hover)',
          purple: 'var(--ristek-accent-purple)',
          amber: 'var(--ristek-accent-amber)',
          text: 'var(--ristek-text-primary)',
          secondary: 'var(--ristek-text-secondary)',
          muted: 'var(--ristek-text-muted)',
        },
        rgds: {
          bg: '#080a0f',
          panel: '#0e111a',
          card: '#141824',
          elevated: '#1a2030',
          hover: '#1e2538',
          line: '#1e2638',
          lineBright: '#2d3852',
          stone: '#6366f1',
          hathoria: '#f59e0b',
          tinker: '#10b981',
          loom: '#f43f5e',
          letterpress: '#06b6d4',
        }
      },
      boxShadow: {
        'ristek-glow': 'var(--ristek-shadow-glow)',
        'ristek-card': 'var(--ristek-shadow-card)'
      }
    },
  },
  plugins: [],
}
