import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import UnirseEquipo from '@/components/equipo/UnirseEquipo'

export default async function AjustesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('lider_id')
    .eq('id', user!.id)
    .single()

  return (
    <div>
      <h1 className="text-xl font-bold text-fx-purpura-oscuro mb-4">Ajustes</h1>

      <Card titulo="Tu cuenta" className="mb-4">
        <p className="text-sm text-fx-purpura-oscuro/70 mb-1">Email</p>
        <p className="text-sm font-medium text-fx-purpura-oscuro">{user?.email}</p>
      </Card>

      {/* Fase C1: unirse a la línea de un líder con su código. */}
      <Card titulo="Equipo" className="mb-4">
        <UnirseEquipo enEquipo={Boolean(perfil?.lider_id)} />
      </Card>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="secundario">
          Cerrar sesión
        </Button>
      </form>
    </div>
  )
}
