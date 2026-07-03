'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Badge from '@/components/ui/Badge'
import type { HistorialItem, ResultadoHistorial } from '@/types'

const MODO_LABEL: Record<string, string> = {
  general: '🌿 General',
  peso: '⚖️ Peso',
  energia: '⚡ Energía',
  piel: '✨ Piel',
}

function fechaLegible(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export default function HistorialLista({ items }: { items: HistorialItem[] }) {
  const [resultados, setResultados] = useState<Record<string, ResultadoHistorial | null>>(
    Object.fromEntries(items.map((i) => [i.id, i.resultado]))
  )
  const [abierto, setAbierto] = useState<string | null>(null)
  const supabase = createClient()

  // Auto-reporte del distribuidor (alimenta métricas de Fase C).
  // RLS solo permite actualizar filas propias.
  const marcar = async (id: string, resultado: ResultadoHistorial) => {
    const anterior = resultados[id]
    const nuevo = anterior === resultado ? null : resultado // clic de nuevo = desmarcar
    setResultados((r) => ({ ...r, [id]: nuevo }))

    const { error } = await supabase
      .from('historial_objeciones')
      .update({ resultado: nuevo })
      .eq('id', id)

    if (error) {
      setResultados((r) => ({ ...r, [id]: anterior }))
    }
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const resultado = resultados[item.id]
        const expandido = abierto === item.id
        return (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-fx-purpura/10 shadow-sm p-4"
          >
            <button
              onClick={() => setAbierto(expandido ? null : item.id)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-xs text-fx-purpura-oscuro/50">
                  {fechaLegible(item.creado_en)} · {MODO_LABEL[item.modo] ?? item.modo}
                </span>
                <span className="text-xs text-fx-purpura">{expandido ? '▲' : '▼'}</span>
              </div>
              <p className="text-sm text-fx-purpura-oscuro font-medium">
                &ldquo;{item.objecion}&rdquo;
              </p>
            </button>

            {expandido && (
              <div className="mt-3 space-y-2 border-t border-fx-purpura/10 pt-3">
                {item.alerta_salud && (
                  <Badge estado="tibio">⚠️ Tocó un tema de salud</Badge>
                )}
                <p className="text-sm text-fx-purpura-oscuro/80">
                  <span className="font-semibold">❤️ Emocional:</span>{' '}
                  {item.respuestas.emocional}
                </p>
                <p className="text-sm text-fx-purpura-oscuro/80">
                  <span className="font-semibold">💡 Lógica:</span>{' '}
                  {item.respuestas.logica}
                </p>
                <p className="text-sm text-fx-purpura-oscuro/80">
                  <span className="font-semibold">🤝 Cierre:</span>{' '}
                  {item.respuestas.cierre}
                </p>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => marcar(item.id, 'cerro_venta')}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  resultado === 'cerro_venta'
                    ? 'bg-green-50 text-green-700 border-green-300'
                    : 'bg-white text-fx-purpura-oscuro/60 border-fx-purpura/20 hover:border-green-300'
                }`}
              >
                ✅ Cerró la venta
              </button>
              <button
                onClick={() => marcar(item.id, 'no_funciono')}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                  resultado === 'no_funciono'
                    ? 'bg-fx-magenta/10 text-fx-magenta border-fx-magenta/30'
                    : 'bg-white text-fx-purpura-oscuro/60 border-fx-purpura/20 hover:border-fx-magenta/30'
                }`}
              >
                ✖️ No funcionó
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
