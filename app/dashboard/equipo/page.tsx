// ─────────────────────────────────────────────────────────────
// /dashboard/equipo — Fase C1 (solo rol líder/admin)
//
// REGLA 4 DEL SKILL DE CUMPLIMIENTO: esta pantalla muestra SOLO
// métricas agregadas del equipo (cuántos, activos, uso promedio).
// Nunca filas por miembro, nunca conversaciones ni prospectos de
// otro distribuidor. La agregación vive en la función SQL
// metricas_equipo() (security definer) — la RLS de las tablas
// subyacentes sigue cerrada entre peers.
// ─────────────────────────────────────────────────────────────

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Card from '@/components/ui/Card'
import CodigoInvitacion from '@/components/equipo/CodigoInvitacion'
import type { MetricasEquipo } from '@/types'

export const metadata = { title: 'Mi equipo — Copiloto Fuxion' }

export default async function EquipoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('rol, plan, estado_suscripcion, codigo_invitacion')
    .eq('id', user!.id)
    .single()

  // Gate por rol: no líder → fuera (la nav ni siquiera lo muestra,
  // pero la URL directa también se bloquea).
  if (!perfil || (perfil.rol !== 'lider' && perfil.rol !== 'admin')) {
    redirect('/dashboard')
  }

  const { data: metricas, error } = await supabase.rpc('metricas_equipo').single<MetricasEquipo>()

  return (
    <div>
      <h1 className="text-xl font-bold text-fx-purpura-oscuro mb-1">Mi equipo</h1>
      <p className="text-sm text-fx-purpura-oscuro/60 mb-4">
        Métricas agregadas de tu línea. Por diseño, nunca verás las conversaciones ni los
        prospectos individuales de tu equipo — solo si están usando la herramienta.
      </p>

      <Card titulo="Invitar a tu línea" className="mb-4">
        <CodigoInvitacion codigoInicial={perfil.codigo_invitacion} />
      </Card>

      {error || !metricas ? (
        <Card>
          <p className="text-sm text-fx-purpura-oscuro/60">
            No se pudieron cargar las métricas. Intenta de nuevo en unos segundos.
          </p>
        </Card>
      ) : Number(metricas.total_miembros) === 0 ? (
        <Card>
          <p className="text-sm text-fx-purpura-oscuro/60">
            Todavía nadie se ha unido a tu equipo. Comparte tu código de invitación con tu línea
            para empezar a ver métricas aquí.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card titulo="Miembros">
            <p className="text-3xl font-bold text-fx-purpura">{metricas.total_miembros}</p>
            <p className="text-xs text-fx-purpura-oscuro/50 mt-1">en tu equipo</p>
          </Card>
          <Card titulo="Activos (7 días)">
            <p className="text-3xl font-bold text-fx-purpura">{metricas.activos_ultimos_7d}</p>
            <p className="text-xs text-fx-purpura-oscuro/50 mt-1">
              generaron al menos una respuesta esta semana
            </p>
          </Card>
          <Card titulo="Generaciones del mes">
            <p className="text-3xl font-bold text-fx-purpura">{metricas.generaciones_mes}</p>
            <p className="text-xs text-fx-purpura-oscuro/50 mt-1">de todo el equipo</p>
          </Card>
          <Card titulo="Uso promedio">
            <p className="text-3xl font-bold text-fx-purpura">
              {metricas.promedio_generaciones_mes}
            </p>
            <p className="text-xs text-fx-purpura-oscuro/50 mt-1">
              generaciones por miembro este mes
            </p>
          </Card>
        </div>
      )}
    </div>
  )
}
