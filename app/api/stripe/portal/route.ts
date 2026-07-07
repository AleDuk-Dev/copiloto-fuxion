// ─────────────────────────────────────────────────────────────
// POST /api/stripe/portal — Fase C1
//
// Abre el Customer Portal de Stripe para el usuario: ahí cambia
// de plan, actualiza su tarjeta o cancela. Los cambios llegan de
// vuelta por el webhook. (Recomendación del skill de Stripe:
// autogestión vía portal en vez de reconstruir esos flujos.)
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!perfil?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'Todavía no tienes una suscripción que gestionar.' },
      { status: 400 }
    )
  }

  try {
    const session = await getStripe().billingPortal.sessions.create({
      customer: perfil.stripe_customer_id,
      return_url: `${request.nextUrl.origin}/dashboard/suscripcion`,
    })
    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Stripe] Error creando portal:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'No se pudo abrir el portal de suscripción. Intenta de nuevo.' },
      { status: 503 }
    )
  }
}
