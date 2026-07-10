// Ficha de prospecto — Fase C2.
// RLS garantiza que solo el dueño ve su prospecto: si el id no es
// suyo (o no existe), la consulta devuelve vacío → 404.

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import FichaProspecto from '@/components/prospectos/FichaProspecto'
import type { HistorialItem, Prospecto, ResumenWhatsapp } from '@/types'

export const metadata = { title: 'Ficha de prospecto — Copiloto Fuxion' }

export default async function ProspectoDetallePage({
  params,
}: {
  // Next 16: params es una Promise — hay que await-earla.
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: prospecto } = await supabase
    .from('prospectos')
    .select('id, apodo, estado, nota, creado_en, actualizado_en')
    .eq('id', id)
    .maybeSingle()

  if (!prospecto) notFound()

  const [{ data: resumenes }, { data: historial }] = await Promise.all([
    supabase
      .from('resumenes_whatsapp')
      .select('id, resumen, estado_sugerido, estado_confirmado, alerta_salud, creado_en')
      .eq('prospecto_id', prospecto.id)
      .order('creado_en', { ascending: false }),
    supabase
      .from('historial_objeciones')
      .select('id, objecion, modo, respuestas, alerta_salud, contexto_suficiente, resultado, creado_en')
      .eq('prospecto_id', prospecto.id)
      .order('creado_en', { ascending: false })
      .limit(50),
  ])

  return (
    <div>
      <Link
        href="/dashboard/prospectos"
        className="text-sm text-fx-purpura-oscuro/50 hover:text-fx-purpura transition-colors"
      >
        ← Volver a prospectos
      </Link>
      <h1 className="text-xl font-bold text-fx-purpura-oscuro mt-2 mb-6">
        {(prospecto as Prospecto).apodo}
      </h1>
      <FichaProspecto
        prospecto={prospecto as Prospecto}
        resumenesIniciales={(resumenes ?? []) as ResumenWhatsapp[]}
        historial={(historial ?? []) as HistorialItem[]}
      />
    </div>
  )
}
