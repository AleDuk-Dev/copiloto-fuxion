'use client'

import { useState } from 'react'

interface RespuestaCardProps {
  titulo: string
  icono: string
  texto: string
  colorBorde: string
  delay: number
}

export default function RespuestaCard({
  titulo,
  icono,
  texto,
  colorBorde,
  delay,
}: RespuestaCardProps) {
  const [copiado, setCopiado] = useState(false)

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Fallback para navegadores sin soporte clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = texto
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    }
  }

  return (
    <div
      className={`animate-fade-in-up bg-white rounded-2xl p-5 shadow-sm border-l-4 ${colorBorde}`}
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icono}</span>
          <span className="text-sm font-semibold text-morado-oscuro uppercase tracking-wide">
            {titulo}
          </span>
        </div>
        <button
          onClick={handleCopiar}
          className={`
            flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full
            transition-all duration-200 border
            ${
              copiado
                ? 'bg-green-50 text-green-700 border-green-300'
                : 'bg-crema text-morado border-morado/30 hover:bg-morado hover:text-white hover:border-morado'
            }
          `}
          aria-label={`Copiar respuesta ${titulo}`}
        >
          {copiado ? (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              ¡Copiado!
            </>
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Copiar
            </>
          )}
        </button>
      </div>
      <p className="text-morado-oscuro text-sm leading-relaxed">{texto}</p>
    </div>
  )
}
