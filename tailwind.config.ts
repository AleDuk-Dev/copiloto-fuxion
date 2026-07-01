import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Tokens del Mago de Oz (Fase 0) — no borrar, los usa la
        // pantalla pública / y sus componentes.
        crema: '#FAEEDA',
        morado: '#534AB7',
        'morado-oscuro': '#26215C',
        rosa: '#993556',
        // Paleta de marca Fase A+ (ver docs/DESIGN_BRIEF.md)
        fx: {
          'purpura-oscuro': '#241033',
          purpura: '#4a1d6e',
          'purpura-medio': '#6b2f8f',
          magenta: '#c92a7a',
          'magenta-claro': '#e8478f',
          oro: '#f0b429',
          crema: '#faf6f0',
          lila: '#f1e9f7',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
