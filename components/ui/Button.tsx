import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primario' | 'secundario' | 'destacado'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const ESTILOS: Record<Variant, string> = {
  primario:
    'bg-fx-purpura text-white hover:bg-fx-purpura-medio border border-transparent',
  secundario:
    'bg-white text-fx-purpura border border-fx-purpura/30 hover:border-fx-purpura hover:bg-fx-lila',
  destacado:
    'bg-fx-magenta text-white hover:bg-fx-magenta-claro border border-transparent',
}

export default function Button({
  variant = 'primario',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5
        text-sm font-semibold transition-colors duration-150
        disabled:opacity-50 disabled:cursor-not-allowed
        ${ESTILOS[variant]} ${className}
      `}
      {...props}
    />
  )
}
