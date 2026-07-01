import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

const SECCIONES = [
  {
    href: '/dashboard/objeciones',
    titulo: 'Generador de objeciones',
    descripcion: 'Pega la objeción de tu prospecto y recibe respuestas sugeridas.',
    disponible: false,
  },
  {
    href: '/dashboard/prioridades',
    titulo: 'Prioridades',
    descripcion: 'Tu lista de a quién dar seguimiento: caliente, tibio o frío.',
    disponible: false,
  },
  {
    href: '/dashboard/prospectos',
    titulo: 'Prospectos',
    descripcion: 'Todo lo que sabes de cada prospecto, en un solo lugar.',
    disponible: false,
  },
  {
    href: '/dashboard/ajustes',
    titulo: 'Ajustes',
    descripcion: 'Tu cuenta y preferencias.',
    disponible: true,
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div>
      <h1 className="text-xl font-bold text-fx-purpura-oscuro mb-1">
        Hola{user?.email ? `, ${user.email}` : ''} 👋
      </h1>
      <p className="text-sm text-fx-purpura-oscuro/60 mb-6">
        Esto es lo que el Copiloto va a hacer por ti. Las secciones marcadas
        &quot;Próximamente&quot; se activan en las siguientes fases.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {SECCIONES.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full hover:border-fx-purpura/40 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h2 className="text-sm font-semibold text-fx-purpura-oscuro">
                  {s.titulo}
                </h2>
                {!s.disponible && <Badge estado="proximamente">Próximamente</Badge>}
              </div>
              <p className="text-sm text-fx-purpura-oscuro/60">{s.descripcion}</p>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
