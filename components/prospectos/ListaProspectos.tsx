'use client'

// CRM ligero de prospectos — Fase C2.
// Consolida el panel de prioridades de Fase B (los datos se migran
// en db/schema_fase_c2.sql). Alta rápida + lista ordenada por
// estado + enlace a la ficha completa de cada prospecto.
//
// Regla 3 de CLAUDE.md (consentimiento): el checkbox es obligatorio
// en la UI Y el CHECK constraint de la tabla `prospectos` rechaza
// cualquier insert sin consentimiento = true (gate técnico, no UX).
// Además se pide apodo, no nombre real.

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Input from '@/components/ui/Input'
import { ESTADOS_CRM, ORDEN_CRM } from '@/components/prospectos/estados'
import type { EstadoProspectoCrm, Prospecto } from '@/types'

export default function ListaProspectos({ iniciales }: { iniciales: Prospecto[] }) {
  const [prospectos, setProspectos] = useState<Prospecto[]>(iniciales)
  const [error, setError] = useState<string | null>(null)

  // Formulario de alta
  const [apodo, setApodo] = useState('')
  const [estado, setEstado] = useState<EstadoProspectoCrm>('tibio')
  const [consentimiento, setConsentimiento] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const supabase = createClient()

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
      .from('prospectos')
      .insert({
        user_id: user?.id,
        apodo: apodo.trim(),
        estado,
        consentimiento: true,
      })
      .select('id, apodo, estado, nota, creado_en, actualizado_en')
      .single()

    if (errInsert || !data) {
      setError('No se pudo guardar. Intenta de nuevo.')
    } else {
      setProspectos((p) => [data as Prospecto, ...p])
      setApodo('')
      setEstado('tibio')
      setConsentimiento(false)
    }
    setGuardando(false)
  }

  const ordenados = [...prospectos].sort((a, b) => ORDEN_CRM[a.estado] - ORDEN_CRM[b.estado])

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
          <div className="flex flex-wrap gap-2">
            {ESTADOS_CRM.map((e2) => (
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

        {/* Gate de consentimiento (Regla 3 de CLAUDE.md) */}
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

      {/* Lista ordenada por estado — cada fila lleva a la ficha */}
      {ordenados.length === 0 ? (
        <div className="bg-white rounded-2xl border border-fx-purpura/10 p-8 text-center">
          <p className="text-sm text-fx-purpura-oscuro/60">
            Todavía no tienes prospectos en tu lista. Agrega el primero arriba.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {ordenados.map((p) => (
            <Link
              key={p.id}
              href={`/dashboard/prospectos/${p.id}`}
              className="bg-white rounded-2xl border border-fx-purpura/10 shadow-sm px-4 py-3 flex items-center justify-between gap-3 hover:border-fx-purpura/40 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Badge estado={p.estado}>
                  {ESTADOS_CRM.find((e2) => e2.value === p.estado)?.emoji}{' '}
                  {ESTADOS_CRM.find((e2) => e2.value === p.estado)?.label}
                </Badge>
                <span className="text-sm font-medium text-fx-purpura-oscuro truncate">
                  {p.apodo}
                </span>
              </div>
              <span className="text-sm text-fx-purpura-oscuro/40 shrink-0">Ver ficha →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
