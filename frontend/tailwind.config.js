/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#06090F',
          900: '#0A0F18',
          850: '#0D131E',
          800: '#111826',
          750: '#161E2E',
          700: '#1C2638',
          600: '#26324A',
          500: '#384664',
          400: '#5B6B8A',
          300: '#8A9AB8',
          200: '#B8C4DA',
          100: '#DDE5F2'
        },
        cyan: {
          glow: '#22D3EE',
          electric: '#06B6D4',
          deep: '#0E7490'
        },
        teal: {
          glow: '#2DD4BF'
        },
        emerald: {
          glow: '#34D399'
        },
        amber: {
          warn: '#F59E0B'
        },
        rose: {
          alert: '#F43F5E'
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'SFMono-Regular', 'monospace']
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(34, 211, 238, 0.15), 0 8px 24px -8px rgba(34, 211, 238, 0.25)',
        panel: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px -12px rgba(0,0,0,0.6)'
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(rgba(91,107,138,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(91,107,138,0.08) 1px, transparent 1px)',
        'radial-glow':
          'radial-gradient(900px 600px at 20% 10%, rgba(34,211,238,0.10), transparent 60%), radial-gradient(700px 500px at 80% 0%, rgba(45,212,191,0.08), transparent 60%)'
      },
      keyframes: {
        pulseSoft: {
          '0%, 100%': { opacity: '0.55' },
          '50%': { opacity: '1' }
        },
        scan: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' }
        }
      },
      animation: {
        pulseSoft: 'pulseSoft 2.4s ease-in-out infinite',
        scan: 'scan 4s linear infinite'
      }
    }
  },
  plugins: []
}
