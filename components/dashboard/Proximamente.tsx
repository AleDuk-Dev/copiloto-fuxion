import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

interface ProximamenteProps {
  titulo: string
  descripcion: string
}

export default function Proximamente({ titulo, descripcion }: ProximamenteProps) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-xl font-bold text-fx-purpura-oscuro">{titulo}</h1>
        <Badge estado="proximamente">Próximamente</Badge>
      </div>
      <Card>
        <p className="text-sm text-fx-purpura-oscuro/70">{descripcion}</p>
      </Card>
    </div>
  )
}
