// Badge de estado — color + texto para lectura rápida (ver DESIGN_BRIEF).
// Los estados caliente/tibio/frío se usan desde Fase B, pero el componente
// se define en Fase A como parte del sistema base.

type Estado = 'caliente' | 'tibio' | 'frio' | 'proximamente' | 'neutro'

interface BadgeProps {
  estado?: Estado
  children: React.ReactNode
}

const ESTILOS: Record<Estado, string> = {
  caliente: 'bg-fx-magenta/10 text-fx-magenta border-fx-magenta/30',
  tibio: 'bg-fx-oro/10 text-amber-700 border-fx-oro/40',
  frio: 'bg-sky-50 text-sky-700 border-sky-200',
  proximamente: 'bg-fx-lila text-fx-purpura-medio border-fx-purpura/20',
  neutro: 'bg-gray-100 text-gray-600 border-gray-200',
}

export default function Badge({ estado = 'neutro', children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${ESTILOS[estado]}`}
    >
      {children}
    </span>
  )
}
