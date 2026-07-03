import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import HistorialLista from '@/components/objeciones/HistorialLista'
import type { HistorialItem } from '@/types'

export const metadata = { title: 'Historial de objeciones — Copiloto Fuxion' }

export default async function HistorialPage() {
  const supabase = await createClient()

  // RLS garantiza que solo llegan las filas del usuario con sesión.
  const { data, error } = await supabase
    .from('historial_objeciones')
    .select('id, objecion, modo, respuestas, alerta_salud, contexto_suficiente, resultado, creado_en')
    .order('creado_en', { ascending: false })
    .limit(50)

  const items = (data ?? []) as HistorialItem[]

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="text-xl font-bold text-fx-purpura-oscuro">Historial</h1>
        <Link
          href="/dashboard/objeciones"
          className="text-sm font-medium text-fx-purpura hover:text-fx-magenta transition-colors whitespace-nowrap"
        >
          ← Volver al generador
        </Link>
      </div>
      <p className="text-sm text-fx-purpura-oscuro/60 mb-6">
        Las objeciones que ya consultaste. Marca si la respuesta te sirvió —
        eso ayuda a mejorar la herramienta.
      </p>

      {error && (
        <p className="text-sm text-fx-magenta">
          No se pudo cargar el historial. Intenta recargar la página.
        </p>
      )}

      {!error && items.length === 0 && (
        <div className="bg-white rounded-2xl border border-fx-purpura/10 p-8 text-center">
          <p className="text-sm text-fx-purpura-oscuro/60">
            Todavía no has generado ninguna respuesta.{' '}
            <Link href="/dashboard/objeciones" className="text-fx-purpura font-medium">
              Genera la primera →
            </Link>
          </p>
        </div>
      )}

      {items.length > 0 && <HistorialLista items={items} />}
    </div>
  )
}
