// CRM ligero de prospectos — Fase C2.
// Consolida el panel de prioridades de Fase B: los datos de la tabla
// `prioridades` se migraron a `prospectos` (db/schema_fase_c2.sql) y
// /dashboard/prioridades redirige aquí.

import { createClient } from '@/lib/supabase/server'
import ListaProspectos from '@/components/prospectos/ListaProspectos'
import type { Prospecto } from '@/types'

export const metadata = { title: 'Prospectos — Copiloto Fuxion' }

export default async function ProspectosPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('prospectos')
    .select('id, apodo, estado, nota, creado_en, actualizado_en')
    .order('creado_en', { ascending: false })

  return (
    <div>
      <h1 className="text-xl font-bold text-fx-purpura-oscuro mb-1">Prospectos</h1>
      <p className="text-sm text-fx-purpura-oscuro/60 mb-6">
        Todo lo que sabes de cada prospecto en un solo lugar. Tú marcas el
        estado — el Copiloto sugiere, no decide.
      </p>
      <ListaProspectos iniciales={(data ?? []) as Prospecto[]} />
    </div>
  )
}
