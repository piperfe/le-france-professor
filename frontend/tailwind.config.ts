import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream:     '#F7F4EF',
        parchment: '#EDE9E1',
        ink: {
          DEFAULT: '#1A1714',
          muted:   '#6B6560',
        },
        border: '#D8D2C8',
        tricolore: {
          DEFAULT: '#002395',
          700:     '#001A6E',
          50:      '#EEF1FC',
        },
        rouge: {
          DEFAULT: '#ED2939',
          50:      '#FEF0F0',
        },
        vocab: {
          DEFAULT: '#5C4A8A',
          50:      '#F2EFF9',
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        body:    ['var(--font-body)',    'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
