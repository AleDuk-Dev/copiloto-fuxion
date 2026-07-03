'use client'

// Panel manual de priorización — Fase B.
// Intencionalmente simple: el distribuidor marca a mano
// caliente/tibio/frío. El scoring automático es Fase D.
//
// Regla 3 de CLAUDE.md (consentimiento) adelantada desde Fase C:
// el checkbox es obligatorio en la UI Y el CHECK constraint de la
// tabla `prioridades` rechaza cualquier insert sin consentimiento
// (gate técnico, no solo UX). Además se pide apodo, no nombre real.

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import type { EstadoProspecto, Prioridad } from '@/types'

const ESTADOS: { value: EstadoProspecto; label: string; emoji: string }[] = [
  { value: 'caliente', label: 'Caliente', emoji: '🔥' },
  { value: 'tibio', label: 'Tibio', emoji: '🌤️' },
  { value: 'frio', label: 'Frío', emoji: '❄️' },
]

const ORDEN: Record<EstadoProspecto, number> = { caliente: 0, tibio: 1, frio: 2 }

export default function PanelPrioridades() {
  const [prioridades, setPrioridades] = useState<Prioridad[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Formulario de alta
  const [apodo, setApodo] = useState('')
  const [estado, setEstado] = useState<EstadoProspecto>('tibio')
  const [consentimiento, setConsentimiento] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const cargar = async () => {
      const { data, error } = await supabase
        .from('prioridades')
        .select('id, apodo, estado, nota, creado_en')
        .order('creado_en', { ascending: false })
      if (error) {
        setError('No se pudo cargar tu lista. Recarga la página.')
      } else {
        setPrioridades((data ?? []) as Prioridad[])
      }
      setCargando(false)
    }
    cargar()
  }, [])

  const agregar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (apodo.trim().length === 0) {
      setError('Escribe un apodo para el prospecto.')
      return
    }
    if (!consentimiento) {
      // Mensaje claro de por qué, no un error técnico genérico.
      setError(
        'Para guardar a esta persona necesitas confirmar que te dio permiso de anotar su contacto. Sin eso, el sistema no guarda nada.'
      )
      return
    }

    setGuardando(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data, error: errInsert } = await supabase
      .from('prioridades')
      .insert({
        user_id: user?.id,
        apodo: apodo.trim(),
        estado,
        consentimiento: true,
      })
      .select('id, apodo, estado, nota, creado_en')
      .single()

    if (errInsert || !data) {
      setError('No se pudo guardar. Intenta de nuevo.')
    } else {
      setPrioridades((p) => [data as Prioridad, ...p])
      setApodo('')
      setEstado('tibio')
      setConsentimiento(false)
    }
    setGuardando(false)
  }

  const cambiarEstado = async (id: string, nuevo: EstadoProspecto) => {
    const anterior = prioridades
    setPrioridades((p) => p.map((x) => (x.id === id ? { ...x, estado: nuevo } : x)))
    const { error } = await supabase
      .from('prioridades')
      .update({ estado: nuevo, actualizado_en: new Date().toISOString() })
      .eq('id', id)
    if (error) setPrioridades(anterior)
  }

  const eliminar = async (id: string) => {
    const anterior = prioridades
    setPrioridades((p) => p.filter((x) => x.id !== id))
    const { error } = await supabase.from('prioridades').delete().eq('id', id)
    if (error) setPrioridades(anterior)
  }

  const ordenadas = [...prioridades].sort((a, b) => ORDEN[a.estado] - ORDEN[b.estado])

  return (
    <div className="space-y-6">
      {/* Alta de prospecto */}
      <form
        onSubmit={agregar}
        className="bg-white rounded-2xl border border-fx-purpura/10 shadow-sm p-5 space-y-4"
      >
        <Input
          id="apodo"
          label="Apodo del prospecto"
          value={apodo}
          onChange={(e) => setApodo(e.target.value)}
          maxLength={60}
          placeholder='Ej: "María del gym", "vecino Carlos"'
        />
        <p className="text-xs text-fx-purpura-oscuro/50 -mt-2">
          Usa un apodo que tú entiendas, no el nombre completo ni datos de
          contacto — protege la privacidad de tu prospecto.
        </p>

        <div>
          <label className="block text-xs font-semibold text-fx-purpura-oscuro uppercase tracking-wide mb-2">
            Estado
          </label>
          <div className="flex gap-2">
            {ESTADOS.map((e2) => (
              <button
                key={e2.value}
                type="button"
                onClick={() => setEstado(e2.value)}
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

        {/* Gate de consentimiento (Regla 3) */}
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={consentimiento}
            onChange={(e) => setConsentimiento(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-fx-purpura/30 accent-fx-purpura"
          />
          <span className="text-sm text-fx-purpura-oscuro/80">
            Confirmo que esta persona me dio permiso de guardar su contacto para
            darle seguimiento.
          </span>
        </label>

        {error && (
          <div className="bg-fx-magenta/10 border border-fx-magenta/30 text-fx-magenta rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <Button type="submit" disabled={guardando} className="w-full">
          {guardando ? 'Guardando…' : 'Agregar prospecto'}
        </Button>
      </form>

      {/* Lista ordenada por estado */}
      {cargando ? (
        <p className="text-sm text-fx-purpura-oscuro/50 text-center">Cargando…</p>
      ) : ordenadas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-fx-purpura/10 p-8 text-center">
          <p className="text-sm text-fx-purpura-oscuro/60">
            Todavía no tienes prospectos en tu lista. Agrega el primero arriba.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordenadas.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-fx-purpura/10 shadow-sm px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge estado={p.estado}>
                  {ESTADOS.find((e2) => e2.value === p.estado)?.emoji}{' '}
                  {ESTADOS.find((e2) => e2.value === p.estado)?.label}
                </Badge>
                <span className="text-sm font-medium text-fx-purpura-oscuro truncate">
                  {p.apodo}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {ESTADOS.filter((e2) => e2.value !== p.estado).map((e2) => (
                  <button
                    key={e2.value}
                    onClick={() => cambiarEstado(p.id, e2.value)}
                    title={`Marcar como ${e2.label.toLowerCase()}`}
                    className="text-sm px-2 py-1 rounded-lg border border-fx-purpura/15 hover:border-fx-purpura/50 transition-colors"
                  >
                    {e2.emoji}
                  </button>
                ))}
                <button
                  onClick={() => eliminar(p.id)}
                  title="Eliminar de la lista"
                  className="text-sm px-2 py-1 rounded-lg border border-fx-purpura/15 text-fx-purpura-oscuro/40 hover:text-fx-magenta hover:border-fx-magenta/40 transition-colors"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
