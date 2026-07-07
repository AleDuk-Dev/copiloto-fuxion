'use client'

import { useState } from 'react'
import RespuestaSugerida from '@/components/objeciones/RespuestaSugerida'
import Button from '@/components/ui/Button'
import type { GenerarObjecionResponse, Modo, Respuestas } from '@/types'

// Selector fijo de modos — el usuario nunca escribe un prompt libre
// (skill de token-optimization): solo pega la objeción y elige modo.
const MODOS: { value: Modo; label: string; emoji: string }[] = [
  { value: 'general', label: 'General', emoji: '🌿' },
  { value: 'peso', label: 'Control de peso', emoji: '⚖️' },
  { value: 'energia', label: 'Energía / Deporte', emoji: '⚡' },
  { value: 'piel', label: 'Piel', emoji: '✨' },
]

const TARJETAS = [
  { key: 'emocional' as const, titulo: 'Respuesta emocional', icono: '❤️' },
  { key: 'logica' as const, titulo: 'Lógica / ROI', icono: '💡' },
  { key: 'cierre' as const, titulo: 'Cierre', icono: '🤝' },
]

export default function Generador() {
  const [objecion, setObjecion] = useState('')
  const [modo, setModo] = useState<Modo>('general')
  const [respuestas, setRespuestas] = useState<Respuestas | null>(null)
  const [alertaSalud, setAlertaSalud] = useState(false)
  const [contextoSuficiente, setContextoSuficiente] = useState(true)
  const [usoMensual, setUsoMensual] = useState<{
    usadas: number
    limite: number
    cercaDelLimite: boolean
  } | null>(null)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const caracteresRestantes = 1000 - objecion.length

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setRespuestas(null)

    if (objecion.trim().length === 0) {
      setError('Por favor escribe la objeción del prospecto.')
      return
    }

    setCargando(true)
    try {
      const res = await fetch('/api/objeciones/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objecion, modo }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error inesperado. Intenta de nuevo.')
        return
      }

      const r = data as GenerarObjecionResponse
      setRespuestas(r.respuestas)
      setAlertaSalud(r.alertaSalud)
      setContextoSuficiente(r.contextoSuficiente)
      setUsoMensual(r.usoMensual ?? null)
    } catch {
      setError('No se pudo conectar con el servidor. Verifica tu conexión.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selector de modo */}
        <div>
          <label className="block text-xs font-semibold text-fx-purpura-oscuro uppercase tracking-wide mb-2">
            Modo / línea de producto
          </label>
          <div className="grid grid-cols-2 gap-2">
            {MODOS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setModo(m.value)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
                  modo === m.value
                    ? 'bg-fx-purpura text-white border-fx-purpura shadow-md'
                    : 'bg-white text-fx-purpura-oscuro border-fx-purpura/20 hover:border-fx-purpura/50'
                }`}
              >
                <span>{m.emoji}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Objeción */}
        <div>
          <label
            htmlFor="objecion"
            className="block text-xs font-semibold text-fx-purpura-oscuro uppercase tracking-wide mb-2"
          >
            Objeción del prospecto
          </label>
          <textarea
            id="objecion"
            value={objecion}
            onChange={(e) => setObjecion(e.target.value)}
            placeholder='Ej: "Está muy caro, no me alcanza este mes"'
            rows={4}
            maxLength={1000}
            className="w-full rounded-xl border-2 border-fx-purpura/20 bg-white px-4 py-3 text-sm text-fx-purpura-oscuro placeholder-fx-purpura-oscuro/30 focus:outline-none focus:border-fx-purpura focus:ring-2 focus:ring-fx-purpura/10 resize-none transition-colors"
          />
          <p
            className={`text-xs mt-1 text-right ${
              caracteresRestantes < 100 ? 'text-fx-magenta' : 'text-fx-purpura-oscuro/40'
            }`}
          >
            {caracteresRestantes} caracteres restantes
          </p>
        </div>

        {error && (
          <div className="bg-fx-magenta/10 border border-fx-magenta/30 text-fx-magenta rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <Button
          type="submit"
          disabled={cargando || objecion.trim().length === 0}
          className="w-full py-3.5"
        >
          {cargando ? 'Generando respuestas…' : 'Generar respuestas ✨'}
        </Button>
      </form>

      {/* Resultados */}
      {respuestas && (
        <div className="mt-8 space-y-3">
          {/* Alerta de salud — visible y arriba, nunca texto pequeño
              al fondo (Regla 1 del skill de cumplimiento). */}
          {alertaSalud && (
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

          {/* Aviso de contexto insuficiente en el RAG — se dice
              explícitamente, no se disimula (skill de RAG). */}
          {!contextoSuficiente && (
            <div className="bg-fx-lila border border-fx-purpura/20 rounded-xl px-4 py-3">
              <p className="text-sm text-fx-purpura-medio">
                ℹ️ No tengo información específica sobre esto en la base de
                conocimiento — estas respuestas son más generales. Revísalas con
                más cuidado antes de usarlas.
              </p>
            </div>
          )}

          {/* Aviso anticipado de límite mensual (Fase C1) — avisar
              antes, no cortar de golpe (skill de token-optimization). */}
          {usoMensual?.cercaDelLimite && (
            <div className="bg-fx-oro/10 border border-fx-oro/40 rounded-xl px-4 py-3">
              <p className="text-sm text-amber-800">
                📊 Llevas {usoMensual.usadas} de {usoMensual.limite} generaciones
                de tu plan este mes. Si necesitas más, puedes mejorar tu plan en{' '}
                <a href="/dashboard/suscripcion" className="underline font-semibold">
                  Suscripción
                </a>
                .
              </p>
            </div>
          )}

          <p className="text-xs font-semibold text-fx-purpura-oscuro/50 uppercase tracking-wide text-center pt-1">
            Respuestas sugeridas
          </p>
          {TARJETAS.map((t) => (
            <RespuestaSugerida
              key={t.key}
              titulo={t.titulo}
              icono={t.icono}
              texto={respuestas[t.key]}
            />
          ))}
          <p className="text-center text-xs text-fx-purpura-oscuro/40 pt-2">
            Tú decides qué enviar: adapta la respuesta a tu estilo y envíala tú
            mismo 💬
          </p>
        </div>
      )}
    </div>
  )
}
