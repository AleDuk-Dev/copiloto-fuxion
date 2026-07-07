'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'

// Mecanismo de invitación más simple posible (Fase C1): el líder
// genera UN código y lo comparte por donde quiera (el sistema no
// envía nada a nadie — Regla 1, humano en el loop). El miembro lo
// canjea desde Ajustes. La validación vive en la función SQL
// generar_codigo_invitacion (security definer).
export default function CodigoInvitacion({ codigoInicial }: { codigoInicial: string | null }) {
  const [codigo, setCodigo] = useState(codigoInicial)
  const [cargando, setCargando] = useState(false)
  const [copiado, setCopiado] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generar = async () => {
    setCargando(true)
    setError(null)
    const supabase = createClient()
    const { data, error: err } = await supabase.rpc('generar_codigo_invitacion')
    if (err) {
      setError(err.message)
    } else {
      setCodigo(data as string)
    }
    setCargando(false)
  }

  const copiar = async () => {
    if (!codigo) return
    await navigator.clipboard.writeText(codigo)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (!codigo) {
    return (
      <div>
        <p className="text-sm text-fx-purpura-oscuro/70 mb-3">
          Genera un código y compártelo con los distribuidores de tu línea. Ellos lo introducen en
          Ajustes → Equipo y quedan vinculados a tu equipo.
        </p>
        <Button onClick={generar} disabled={cargando}>
          {cargando ? 'Generando…' : 'Generar código de invitación'}
        </Button>
        {error && <p className="text-xs text-fx-magenta mt-2">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <p className="text-sm text-fx-purpura-oscuro/70 mb-2">
        Comparte este código con tu línea (tú decides por dónde — la app no envía nada):
      </p>
      <div className="flex items-center gap-2">
        <code className="bg-fx-lila text-fx-purpura font-bold text-lg tracking-wider rounded-xl px-4 py-2">
          {codigo}
        </code>
        <Button variant="secundario" onClick={copiar}>
          {copiado ? '✓ Copiado' : 'Copiar'}
        </Button>
      </div>
    </div>
  )
}
