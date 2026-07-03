import Link from 'next/link'
import Generador from '@/components/objeciones/Generador'

export const metadata = { title: 'Generador de objeciones — Copiloto Fuxion' }

export default function ObjecionesPage() {
  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-xl font-bold text-fx-purpura-oscuro">
          Generador de objeciones
        </h1>
        <Link
          href="/dashboard/objeciones/historial"
          className="text-sm font-medium text-fx-purpura hover:text-fx-magenta transition-colors whitespace-nowrap"
        >
          Ver historial →
        </Link>
      </div>
      <p className="text-sm text-fx-purpura-oscuro/60 mb-6">
        Pega lo que te dijo tu prospecto, elige la línea de producto y recibe
        respuestas listas para adaptar y copiar.
      </p>
      <Generador />
    </div>
  )
}
