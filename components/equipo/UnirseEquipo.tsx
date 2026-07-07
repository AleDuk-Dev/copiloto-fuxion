'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'

// Canjear un código de invitación (Ajustes → Equipo). La
// validación real vive en la función SQL canjear_invitacion
// (security definer): código válido, líder con plan activo, no
// unirse a uno mismo. También permite salir del equipo.
export default function UnirseEquipo({ enEquipo }: { enEquipo: boolean }) {
  const [codigo, setCodigo] = useState('')
  const [miembro, setMiembro] = useState(enEquipo)
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [cargando, setCargando] = useState(false)

  const canjear = async (e: React.FormEvent) => {
    e.preventDefault()
    setCargando(true)
    setError(null)
    setMensaje(null)
    const supabase = createClient()
    const { data, error: err } = await supabase.rpc('canjear_invitacion', {
      p_codigo: codigo.trim(),
    })
    if (err) {
      setError(err.message)
    } else {
      setMiembro(true)
      setMensaje(`✅ Te uniste al equipo de ${data}. Tu líder solo verá métricas agregadas de su equipo — nunca tus conversaciones ni tus prospectos.`)
      setCodigo('')
    }
    setCargando(false)
  }

  const salir = async () => {
    setCargando(true)
    setError(null)
    setMensaje(null)
    const supabase = createClient()
    const { error: err } = await supabase.rpc('salir_de_equipo')
    if (err) {
      setError(err.message)
    } else {
      setMiembro(false)
      setMensaje('Saliste del equipo.')
    }
    setCargando(false)
  }

  return (
    <div>
      {miembro ? (
        <div>
          <p className="text-sm text-fx-purpura-oscuro/70 mb-3">
            Formas parte de un equipo. Tu líder ve solo métricas agregadas (cuántos activos, uso
            promedio) — nunca tus conversaciones ni tus prospectos.
          </p>
          <Button variant="secundario" onClick={salir} disabled={cargando}>
            {cargando ? 'Saliendo…' : 'Salir del equipo'}
          </Button>
        </div>
      ) : (
        <form onSubmit={canjear}>
          <p className="text-sm text-fx-purpura-oscuro/70 mb-3">
            ¿Tu líder te compartió un código de invitación? Introdúcelo aquí para unirte a su
            equipo.
          </p>
          <div className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="FX-XXXXXXXX"
                maxLength={12}
              />
            </div>
            <Button type="submit" disabled={cargando || codigo.trim().length === 0}>
              {cargando ? 'Uniendo…' : 'Unirme'}
            </Button>
          </div>
        </form>
      )}
      {mensaje && <p className="text-sm text-emerald-700 mt-3">{mensaje}</p>}
      {error && <p className="text-sm text-fx-magenta mt-3">{error}</p>}
    </div>
  )
}
