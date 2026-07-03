'use client'

import { useState } from 'react'

// Tarjeta de respuesta con copiar en un clic. Paleta fx-* de Fase A
// (no confundir con components/RespuestaCard.tsx, que usa la paleta
// del Mago de Oz y sigue en la pantalla pública /).
interface RespuestaSugeridaProps {
  titulo: string
  icono: string
  texto: string
}

export default function RespuestaSugerida({ titulo, icono, texto }: RespuestaSugeridaProps) {
  const [copiado, setCopiado] = useState(false)

  const handleCopiar = async () => {
    try {
      await navigator.clipboard.writeText(texto)
    } catch {
      // Fallback para navegadores sin clipboard API
      const textarea = document.createElement('textarea')
      textarea.value = texto
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
    }
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-fx-purpura/10 border-l-4 border-l-fx-magenta">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icono}</span>
          <span className="text-sm font-semibold text-fx-purpura-oscuro uppercase tracking-wide">
            {titulo}
          </span>
        </div>
        <button
          onClick={handleCopiar}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-200 border ${
            copiado
              ? 'bg-green-50 text-green-700 border-green-300'
              : 'bg-fx-lila text-fx-purpura border-fx-purpura/30 hover:bg-fx-purpura hover:text-white hover:border-fx-purpura'
          }`}
          aria-label={`Copiar respuesta ${titulo}`}
        >
          {copiado ? '✓ ¡Copiado!' : 'Copiar'}
        </button>
      </div>
      <p className="text-fx-purpura-oscuro text-sm leading-relaxed">{texto}</p>
    </div>
  )
}
