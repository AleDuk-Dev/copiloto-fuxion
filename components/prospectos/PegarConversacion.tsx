'use client'

// Pegar conversación de WhatsApp — Fase C2.
//
// REGLA NO NEGOCIABLE: la conversación cruda vive SOLO en el estado
// de React de este componente (`conversacion`) mientras el
// distribuidor la trabaja. Viaja a /api/prospectos/resumir (que
// tampoco la persiste ni la loguea) y se descarta con setConversacion('')
// al guardar o al descartar. Al guardar se insertan ÚNICAMENTE el
// resumen generado y el estado que el distribuidor confirmó.
//
// Regla 1 de CLAUDE.md (humano en el loop): el estado sugerido por
// la IA es solo una sugerencia — el distribuidor lo confirma o lo
// ajusta antes de guardar. Si cierra o descarta, no se guarda nada.
//
// Límite de caracteres VISIBLE con contador, sin truncado silencioso:
// el textarea no tiene maxLength (un maxLength recortaría el pegado
// sin avisar) — si se pasa, se muestra un aviso y se bloquea el envío.

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import { ESTADOS_CRM } from '@/components/prospectos/estados'
import type {
  EstadoProspecto,
  EstadoProspectoCrm,
  ResumenWhatsapp,
  ResumirConversacionResponse,
} from '@/types'

// Mantener en sincronía con MAX_CARACTERES_CONVERSACION en
// lib/claude.ts (no se importa de ahí para no meter el SDK de
// Anthropic en el bundle del cliente).
const MAX_CARACTERES = 6000

interface Sugerencia {
  resumen: string
  estadoSugerido: EstadoProspecto
  alertaSalud: boolean
  tokensEntrada: number
  tokensSalida: number
}

export default function PegarConversacion({
  prospectoId,
  onGuardado,
}: {
  prospectoId: string
  onGuardado: (resumen: ResumenWhatsapp, estadoConfirmado: EstadoProspectoCrm) => void
}) {
  // La conversación cruda: solo memoria del navegador, nunca DB.
  const [conversacion, setConversacion] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [avisoLimiteMensual, setAvisoLimiteMensual] = useState<string | null>(null)

  const [sugerencia, setSugerencia] = useState<Sugerencia | null>(null)
  const [estadoConfirmado, setEstadoConfirmado] = useState<EstadoProspectoCrm>('tibio')
  const [guardando, setGuardando] = useState(false)

  const supabase = createClient()
  const excede = conversacion.length > MAX_CARACTERES

  const generar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (conversacion.trim().length === 0) {
      setError('Pega el texto de la conversación antes de generar el resumen.')
      return
    }
    if (excede) {
      setError(
        `La conversación tiene ${conversacion.length.toLocaleString('es')} caracteres y el límite es ${MAX_CARACTERES.toLocaleString('es')}. Recorta las partes menos relevantes (saludos, audios transcritos largos) — no la cortamos por ti para no perder contexto sin que lo sepas.`
      )
      return
    }

    setCargando(true)
    try {
      const res = await fetch('/api/prospectos/resumir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversacion, prospectoId }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error inesperado. Intenta de nuevo.')
        return
      }

      const r = data as ResumirConversacionResponse
      setSugerencia({
        resumen: r.resumen,
        estadoSugerido: r.estadoSugerido,
        alertaSalud: r.alertaSalud,
        tokensEntrada: r.tokensEntrada,
        tokensSalida: r.tokensSalida,
      })
      // La sugerencia queda preseleccionada, pero el distribuidor
      // puede cambiarla — y nada se guarda hasta que pulse Guardar.
      setEstadoConfirmado(r.estadoSugerido)
      if (r.usoMensual?.cercaDelLimite) {
        setAvisoLimiteMensual(
          `Llevas ${r.usoMensual.usadas} de ${r.usoMensual.limite} generaciones de tu plan este mes.`
        )
      }
    } catch {
      setError('No se pudo conectar con el servidor. Verifica tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  const guardar = async () => {
    if (!sugerencia) return
    setGuardando(true)
    setError(null)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    // Solo el resumen y los estados — la conversación cruda NO se
    // incluye en este insert ni en ningún otro.
    const { data, error: errInsert } = await supabase
      .from('resumenes_whatsapp')
      .insert({
        user_id: user?.id,
        prospecto_id: prospectoId,
        resumen: sugerencia.resumen,
        estado_sugerido: sugerencia.estadoSugerido,
        estado_confirmado: estadoConfirmado,
        alerta_salud: sugerencia.alertaSalud,
        tokens_entrada: sugerencia.tokensEntrada,
        tokens_salida: sugerencia.tokensSalida,
      })
      .select('id, resumen, estado_sugerido, estado_confirmado, alerta_salud, creado_en')
      .single()

    if (errInsert || !data) {
      setError('No se pudo guardar el resumen. Intenta de nuevo.')
      setGuardando(false)
      return
    }

    // El estado confirmado actualiza también la ficha del prospecto.
    await supabase
      .from('prospectos')
      .update({ estado: estadoConfirmado, actualizado_en: new Date().toISOString() })
      .eq('id', prospectoId)

    // Descartar la conversación cruda de memoria.
    setConversacion('')
    setSugerencia(null)
    setGuardando(false)
    onGuardado(data as ResumenWhatsapp, estadoConfirmado)
  }

  const descartar = () => {
    // No se guarda nada — ni resumen ni estado (PRD: caso "el
    // distribuidor no confirma").
    setSugerencia(null)
    setConversacion('')
    setError(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-fx-purpura/10 shadow-sm p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-fx-purpura-oscuro">
          📋 Pegar conversación de WhatsApp
        </h2>
        <p className="text-xs text-fx-purpura-oscuro/50 mt-1">
          Copia el chat desde WhatsApp y pégalo aquí. El Copiloto lo resume y te
          sugiere un estado — tú decides el estado final. La conversación no se
          guarda: solo el resumen que confirmes.
        </p>
      </div>

      {!sugerencia && (
        <form onSubmit={generar} className="space-y-3">
          <textarea
            value={conversacion}
            onChange={(e) => setConversacion(e.target.value)}
            placeholder={'Ej:\n[10:32] Yo: Hola María! Te cuento de los batidos…\n[10:45] María: Uy suena bien pero está caro…'}
            rows={7}
            className={`w-full rounded-xl border-2 bg-white px-4 py-3 text-sm text-fx-purpura-oscuro placeholder-fx-purpura-oscuro/30 focus:outline-none focus:ring-2 focus:ring-fx-purpura/10 resize-y transition-colors ${
              excede
                ? 'border-fx-magenta focus:border-fx-magenta'
                : 'border-fx-purpura/20 focus:border-fx-purpura'
            }`}
          />
          {/* Contador visible — el límite nunca recorta en silencio */}
          <p
            className={`text-xs -mt-1 text-right ${
              excede
                ? 'text-fx-magenta font-semibold'
                : conversacion.length > MAX_CARACTERES * 0.85
                  ? 'text-amber-700'
                  : 'text-fx-purpura-oscuro/40'
            }`}
          >
            {conversacion.length.toLocaleString('es')} / {MAX_CARACTERES.toLocaleString('es')} caracteres
          </p>

          {excede && (
            <div className="bg-fx-magenta/10 border border-fx-magenta/30 text-fx-magenta rounded-xl px-4 py-3 text-sm">
              El texto supera el límite. Recorta las partes menos relevantes antes
              de generar el resumen — no lo cortamos automáticamente para que no
              se pierda contexto sin que lo sepas.
            </div>
          )}

          {error && !excede && (
            <div className="bg-fx-magenta/10 border border-fx-magenta/30 text-fx-magenta rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={cargando || excede || conversacion.trim().length === 0}
            className="w-full"
          >
            {cargando ? 'Resumiendo conversación…' : 'Resumir y sugerir estado ✨'}
          </Button>
        </form>
      )}

      {sugerencia && (
        <div className="space-y-3">
          {/* Alerta de salud — misma alerta visible del generador de
              objeciones (Regla 1 del skill de cumplimiento). */}
          {sugerencia.alertaSalud && (
            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl px-4 py-3">
              <p className="text-sm font-semibold text-amber-800 mb-1">
                ⚠️ Este tema toca una condición de salud
              </p>
              <p className="text-sm text-amber-800">
                No ofrezcas el producto como tratamiento ni como apoyo para esa
                condición. Sugiere al prospecto revisar los ingredientes con un
                profesional de salud antes de decidir.
              </p>
            </div>
          )}

          {avisoLimiteMensual && (
            <div className="bg-fx-oro/10 border border-fx-oro/40 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-800">
                📊 {avisoLimiteMensual} Si necesitas más, puedes mejorar tu plan en{' '}
                <a href="/dashboard/suscripcion" className="underline font-semibold">
                  Suscripción
                </a>
                .
              </p>
            </div>
          )}

          <div className="bg-fx-lila/50 border border-fx-purpura/15 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-fx-purpura-oscuro/50 uppercase tracking-wide mb-1.5">
              Resumen de la conversación
            </p>
            <p className="text-sm text-fx-purpura-oscuro whitespace-pre-wrap">
              {sugerencia.resumen}
            </p>
          </div>

          <div>
            <p className="text-xs font-semibold text-fx-purpura-oscuro uppercase tracking-wide mb-2">
              Estado sugerido:{' '}
              <span className="text-fx-magenta">
                {ESTADOS_CRM.find((e) => e.value === sugerencia.estadoSugerido)?.emoji}{' '}
                {ESTADOS_CRM.find((e) => e.value === sugerencia.estadoSugerido)?.label}
              </span>{' '}
              — confírmalo o ajústalo tú:
            </p>
            <div className="flex flex-wrap gap-2">
              {ESTADOS_CRM.map((e2) => (
                <button
                  key={e2.value}
                  type="button"
                  onClick={() => setEstadoConfirmado(e2.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                    estadoConfirmado === e2.value
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

          {error && (
            <div className="bg-fx-magenta/10 border border-fx-magenta/30 text-fx-magenta rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={guardar} disabled={guardando} className="flex-1">
              {guardando ? 'Guardando…' : 'Guardar resumen y estado'}
            </Button>
            <Button variant="secundario" onClick={descartar} disabled={guardando}>
              Descartar
            </Button>
          </div>
          <p className="text-xs text-fx-purpura-oscuro/40 text-center">
            Si descartas, no se guarda nada — ni el resumen ni el estado.
          </p>
        </div>
      )}
    </div>
  )
}
