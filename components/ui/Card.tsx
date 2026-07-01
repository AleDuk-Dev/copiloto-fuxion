import type { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  titulo?: string
}

export default function Card({ titulo, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-fx-purpura/10 shadow-sm p-5 ${className}`}
      {...props}
    >
      {titulo && (
        <h3 className="text-sm font-semibold text-fx-purpura-oscuro uppercase tracking-wide mb-3">
          {titulo}
        </h3>
      )}
      {children}
    </div>
  )
}
