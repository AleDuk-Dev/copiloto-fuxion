'use client'

// Ficha de prospecto — Fase C2.
// Estado editable, notas libres, pegado de conversación de WhatsApp,
// resúmenes guardados e historial de objeciones vinculadas.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import PegarConversacion from '@/components/prospectos/PegarConversacion'
import { ESTADOS_CRM, etiquetaEstado } from '@/components/prospectos/estados'
import type {
  EstadoProspectoCrm,
  HistorialItem,
  Prospecto,
  ResumenWhatsapp,
} from '@/types'

const MAX_NOTA = 2000

export default function FichaProspecto({
  prospecto,
  resumenesIniciales,
  historial,
}: {
  prospecto: Prospecto
  resumenesIniciales: ResumenWhatsapp[]
  historial: HistorialItem[]
}) {
  const [estado, setEstado] = useState<EstadoProspectoCrm>(prospecto.estado)
  const [nota, setNota] = useState(prospecto.nota ?? '')
  const [notaGuardada, setNotaGuardada] = useState(prospecto.nota ?? '')
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [resumenes, setResumenes] = useState<ResumenWhatsapp[]>(resumenesIniciales)
  const [error, setError] = useState<string | null>(null)

  const router = useRouter()
  const supabase = createClient()

  const cambiarEstado = async (nuevo: EstadoProspectoCrm) => {
    const anterior = estado
    setEstado(nuevo)
    const { error } = await supabase
      .from('prospectos')
      .update({ estado: nuevo, actualizado_en: new Date().toISOString() })
      .eq('id', prospecto.id)
    if (error) setEstado(anterior)
  }

  const guardarNota = async () => {
    setGuardandoNota(true)
    setError(null)
    const { error: err } = await supabase
      .from('prospectos')
      .update({ nota: nota.trim() || null, actualizado_en: new Date().toISOString() })
      .eq('id', prospecto.id)
    if (err) {
      setError('No se pudo guardar la nota. Intenta de nuevo.')
    } else {
      setNotaGuardada(nota)
    }
    setGuardandoNota(false)
  }

  const eliminar = async () => {
    // Derecho de borrado (Regla 2 del skill de cumplimiento): borra el
    // prospecto y sus resúmenes (cascade); el historial de objeciones
    // del distribuidor solo se desvincula (on delete set null).
    const seguro = window.confirm(
      `¿Eliminar a "${prospecto.apodo}" y sus resúmenes de conversación? Esta acción no se puede deshacer.`
    )
    if (!seguro) return
    const { error: err } = await supabase.from('prospectos').delete().eq('id', prospecto.id)
    if (err) {
      setError('No se pudo eliminar. Intenta de nuevo.')
    } else {
      router.push('/dashboard/prospectos')
      router.refresh()
    }
  }

  return (
    <div className="space-y-6">
      {/* Estado */}
      <div className="bg-white rounded-2xl border border-fx-purpura/10 shadow-sm p-5">
        <p className="text-xs font-semibold text-fx-purpura-oscuro uppercase tracking-wide mb-2">
          Estado
        </p>
        <div className="flex flex-wrap gap-2">
          {ESTADOS_CRM.map((e2) => (
            <button
              key={e2.value}
              type="button"
              onClick={() => cambiarEstado(e2.value)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                estado === e2.value
                  ? 'bg-fx-purpura text-white border-fx-purpura'
                  : 'bg-white text-fx-purpura-oscuro border-fx-purpura/20 hover:border-fx-purpura/50'
              }`}
            >
              <span>{e2.emoji}</span>
              {e2.label}
            </button>
          ))}
        </div>
      </div>

      {/* Pegar conversación de WhatsApp */}
      <PegarConversacion
        prospectoId={prospecto.id}
        onGuardado={(nuevoResumen, estadoConfirmado) => {
          setResumenes((r) => [nuevoResumen, ...r])
          setEstado(estadoConfirmado)
        }}
      />

      {/* Resúmenes guardados */}
      {resumenes.length > 0 && (
        <div className="bg-white rounded-2xl border border-fx-purpura/10 shadow-sm p-5 space-y-3">
          <p className="text-xs font-semibold text-fx-purpura-oscuro uppercase tracking-wide">
            Resúmenes de conversaciones
          </p>
          {resumenes.map((r) => (
            <div key={r.id} className="border border-fx-purpura/10 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="text-xs text-fx-purpura-oscuro/40">
                  {new Date(r.creado_en).toLocaleDateString('es', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                <div className="flex items-center gap-1.5">
                  {r.alerta_salud && (
                    <span title="La conversación mencionaba un tema de salud">⚠️</span>
                  )}
                  <Badge estado={r.estado_confirmado}>
                    {etiquetaEstado(r.estado_confirmado)}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-fx-purpura-oscuro whitespace-pre-wrap">{r.resumen}</p>
            </div>
          ))}
        </div>
      )}

      {/* Notas */}
      <div className="bg-white rounded-2xl border border-fx-purpura/10 shadow-sm p-5 space-y-3">
        <p className="text-xs font-semibold text-fx-purpura-oscuro uppercase tracking-wide">
          Notas
        </p>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          maxLength={MAX_NOTA}
          rows={4}
          placeholder="Lo que quieras recordar de esta persona: qué le interesa, cuándo quedaste en escribirle…"
          className="w-full rounded-xl border-2 border-fx-purpura/20 bg-white px-4 py-3 text-sm text-fx-purpura-oscuro placeholder-fx-purpura-oscuro/30 focus:outline-none focus:border-fx-purpura focus:ring-2 focus:ring-fx-purpura/10 resize-y transition-colors"
        />
        {nota !== notaGuardada && (
          <Button onClick={guardarNota} disabled={guardandoNota} className="w-full">
            {guardandoNota ? 'Guardando…' : 'Guardar nota'}
          </Button>
        )}
      </div>

      {/* Historial de objeciones vinculadas */}
      <div className="bg-white rounded-2xl border border-fx-purpura/10 shadow-sm p-5 space-y-3">
        <p className="text-xs font-semibold text-fx-purpura-oscuro uppercase tracking-wide">
          Objeciones de este prospecto
        </p>
        {historial.length === 0 ? (
          <p className="text-sm text-fx-purpura-oscuro/50">
            Todavía no hay objeciones vinculadas. En el{' '}
            <a href="/dashboard/objeciones" className="underline text-fx-purpura">
              generador de objeciones
            </a>{' '}
            puedes elegir este prospecto antes de generar.
          </p>
        ) : (
          historial.map((h) => (
            <div key={h.id} className="border border-fx-purpura/10 rounded-xl px-4 py-3">
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs text-fx-purpura-oscuro/40">
                  {new Date(h.creado_en).toLocaleDateString('es', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
                {h.resultado && (
                  <Badge estado={h.resultado === 'cerro_venta' ? 'cliente' : 'neutro'}>
                    {h.resultado === 'cerro_venta' ? '✅ Cerró la venta' : '✖️ No funcionó'}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-fx-purpura-oscuro">&ldquo;{h.objecion}&rdquo;</p>
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="bg-fx-magenta/10 border border-fx-magenta/30 text-fx-magenta rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Borrado (derecho de supresión — Regla 2 del skill) */}
      <button
        onClick={eliminar}
        className="w-full text-sm text-fx-purpura-oscuro/40 hover:text-fx-magenta transition-colors py-2"
      >
        🗑️ Eliminar prospecto y sus datos
      </button>
    </div>
  )
}
