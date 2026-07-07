'use client'

import { useState } from 'react'
import Button from '@/components/ui/Button'
import type { Plan } from '@/lib/planes'

// Botones de la pantalla de suscripción. Dos caminos:
//  - Sin suscripción → POST /api/stripe/checkout (Stripe Checkout).
//  - Con suscripción → POST /api/stripe/portal (cambiar plan,
//    tarjeta o cancelar en el Customer Portal de Stripe).
// En ambos casos el navegador se redirige a la URL que devuelve
// el endpoint; el estado del perfil lo actualiza el webhook.

export function BotonSuscribirse({
  plan,
  destacado = false,
}: {
  plan: Exclude<Plan, 'gratis'>
  destacado?: boolean
}) {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'No se pudo iniciar el pago.')
        return
      }
      window.location.href = data.url
    } catch {
      setError('No se pudo conectar con el servidor.')
      setCargando(false)
    }
  }

  return (
    <div>
      <Button
        onClick={handleClick}
        disabled={cargando}
        variant={destacado ? 'destacado' : 'primario'}
        className="w-full"
      >
        {cargando ? 'Abriendo pago…' : 'Suscribirme'}
      </Button>
      {error && <p className="text-xs text-fx-magenta mt-2">{error}</p>}
    </div>
  )
}

export function BotonGestionar() {
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleClick = async () => {
    setCargando(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) {
        setError(data.error ?? 'No se pudo abrir el portal.')
        return
      }
      window.location.href = data.url
    } catch {
      setError('No se pudo conectar con el servidor.')
      setCargando(false)
    }
  }

  return (
    <div>
      <Button onClick={handleClick} disabled={cargando} variant="secundario">
        {cargando ? 'Abriendo portal…' : 'Gestionar suscripción'}
      </Button>
      {error && <p className="text-xs text-fx-magenta mt-2">{error}</p>}
    </div>
  )
}
