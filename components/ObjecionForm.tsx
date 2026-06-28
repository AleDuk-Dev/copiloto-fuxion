'use client'

import { useState } from 'react'
import RespuestaCard from './RespuestaCard'
import type { Perfil, Respuestas } from '@/types'

const PERFILES: { value: Perfil; label: string; emoji: string }[] = [
  { value: 'general', label: 'General', emoji: '🌿' },
  { value: 'peso', label: 'Control de peso', emoji: '⚖️' },
  { value: 'energia', label: 'Energía / Deporte', emoji: '⚡' },
  { value: 'piel', label: 'Piel', emoji: '✨' },
]

const TARJETAS = [
  {
    key: 'emocional' as const,
    titulo: 'Respuesta emocional',
    icono: '❤️',
    colorBorde: 'border-rosa',
    delay: 100,
  },
  {
    key: 'logica' as const,
    titulo: 'Lógica / ROI',
    icono: '💡',
    colorBorde: 'border-morado',
    delay: 200,
  },
  {
    key: 'cierre' as const,
    titulo: 'Cierre',
    icono: '🤝',
    colorBorde: 'border-amber-400',
    delay: 300,
  },
]

export default function ObjecionForm() {
  const [objecion, setObjecion] = useState('')
  const [perfil, setPerfil] = useState<Perfil>('general')
  const [respuestas, setRespuestas] = useState<Respuestas | null>(null)
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
      const res = await fetch('/api/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ objecion, perfil }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Ocurrió un error inesperado. Intenta de nuevo.')
        return
      }

      setRespuestas(data.respuestas)
    } catch {
      setError('No se pudo conectar con el servidor. Verifica tu conexión a internet.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto px-4 pb-12">
      {/* Header */}
      <header className="text-center pt-10 pb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-morado rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">🚀</span>
        </div>
        <h1 className="text-2xl font-bold text-morado-oscuro mb-1">Proyecto RAC</h1>
        <p className="text-sm text-morado-oscuro/60">
          Convierte objeciones en oportunidades
        </p>
      </header>

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Selector de perfil */}
        <div>
          <label className="block text-xs font-semibold text-morado-oscuro uppercase tracking-wide mb-2">
            Perfil del prospecto
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PERFILES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPerfil(p.value)}
                className={`
                  flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium
                  transition-all duration-150
                  ${
                    perfil === p.value
                      ? 'bg-morado text-white border-morado shadow-md'
                      : 'bg-white text-morado-oscuro border-morado/20 hover:border-morado/50'
                  }
                `}
              >
                <span>{p.emoji}</span>
                <span>{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Textarea */}
        <div>
          <label
            htmlFor="objecion"
            className="block text-xs font-semibold text-morado-oscuro uppercase tracking-wide mb-2"
          >
            Objeción del prospecto
          </label>
          <textarea
            id="objecion"
            value={objecion}
            onChange={(e) => setObjecion(e.target.value)}
            placeholder="Ej: &quot;Esto parece otro de esos negocios piramidales, no me interesa&quot;"
            rows={4}
            maxLength={1000}
            className="
              w-full rounded-xl border-2 border-morado/20 bg-white px-4 py-3
              text-sm text-morado-oscuro placeholder-morado-oscuro/30
              focus:outline-none focus:border-morado focus:ring-2 focus:ring-morado/10
              resize-none transition-colors
            "
          />
          <p
            className={`text-xs mt-1 text-right ${
              caracteresRestantes < 100 ? 'text-rosa' : 'text-morado-oscuro/40'
            }`}
          >
            {caracteresRestantes} caracteres restantes
          </p>
        </div>

        {/* Mensaje de error */}
        {error && (
          <div className="bg-rosa/10 border border-rosa/30 text-rosa rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Botón enviar */}
        <button
          type="submit"
          disabled={cargando || objecion.trim().length === 0}
          className="
            w-full py-3.5 px-6 bg-morado text-white font-semibold rounded-xl
            transition-all duration-200
            hover:bg-morado-oscuro active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100
            shadow-md hover:shadow-lg
            flex items-center justify-center gap-2
          "
        >
          {cargando ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Generando respuestas...
            </>
          ) : (
            'Generar respuestas ✨'
          )}
        </button>
      </form>

      {/* Resultados */}
      {respuestas && (
        <div className="mt-8 space-y-3">
          <p className="text-xs font-semibold text-morado-oscuro/50 uppercase tracking-wide text-center mb-4">
            Respuestas sugeridas
          </p>
          {TARJETAS.map((tarjeta) => (
            <RespuestaCard
              key={tarjeta.key}
              titulo={tarjeta.titulo}
              icono={tarjeta.icono}
              texto={respuestas[tarjeta.key]}
              colorBorde={tarjeta.colorBorde}
              delay={tarjeta.delay}
            />
          ))}
          <p className="text-center text-xs text-morado-oscuro/40 pt-2">
            Adapta estas respuestas a tu estilo personal 💬
          </p>
        </div>
      )}
    </div>
  )
}
