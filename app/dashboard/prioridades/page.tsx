import PanelPrioridades from '@/components/prioridades/PanelPrioridades'

export const metadata = { title: 'Prioridades — Copiloto Fuxion' }

export default function PrioridadesPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-fx-purpura-oscuro mb-1">Prioridades</h1>
      <p className="text-sm text-fx-purpura-oscuro/60 mb-6">
        Tu lista de a quién dar seguimiento hoy. Tú marcas el estado — el
        Copiloto no decide por ti.
      </p>
      <PanelPrioridades />
    </div>
  )
}
