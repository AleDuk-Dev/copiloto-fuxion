// ─────────────────────────────────────────────────────────────
// POST /api/stripe/checkout — Fase C1
//
// Crea una Stripe Checkout Session (mode: subscription) para el
// plan pedido y devuelve la URL a la que redirigir. El pago ocurre
// en la página de Stripe; el estado del perfil lo actualiza el
// webhook (app/api/stripe/webhook), no este endpoint.
//
// Nota del skill de Stripe: NO se pasa payment_method_types —
// Stripe decide los métodos elegibles dinámicamente.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import { priceIdDePlan } from '@/lib/planes'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  let body: { plan?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 400 })
  }

  const plan = body.plan
  if (plan !== 'individual' && plan !== 'lider') {
    return NextResponse.json({ error: 'Plan inválido.' }, { status: 400 })
  }

  const { data: perfil } = await supabase
    .from('perfiles')
    .select('stripe_customer_id, plan, estado_suscripcion')
    .eq('id', user.id)
    .single()

  if (!perfil) {
    return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 404 })
  }

  // Si ya tiene una suscripción viva, el cambio de plan se hace por
  // el portal de cliente (/api/stripe/portal), no con otro checkout
  // (evita dos suscripciones activas para el mismo usuario).
  if (perfil.plan !== 'gratis' && perfil.estado_suscripcion !== 'cancelada' && perfil.estado_suscripcion !== null) {
    return NextResponse.json(
      { error: 'Ya tienes una suscripción. Usa "Gestionar suscripción" para cambiar de plan.' },
      { status: 409 }
    )
  }

  const stripe = getStripe()

  try {
    // Reusar el customer si ya existe; crearlo si no.
    let customerId = perfil.stripe_customer_id as string | null
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      // Solo el service role puede escribir columnas de Stripe
      // (grants por columna, ver db/schema_fase_c1.sql).
      const admin = createAdminClient()
      await admin
        .from('perfiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
    }

    const origin = request.nextUrl.origin
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceIdDePlan(plan), quantity: 1 }],
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      success_url: `${origin}/dashboard/suscripcion?checkout=ok`,
      cancel_url: `${origin}/dashboard/suscripcion?checkout=cancelado`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[Stripe] Error creando checkout:', err instanceof Error ? err.message : err)
    return NextResponse.json(
      { error: 'No se pudo iniciar el pago. Intenta de nuevo en unos segundos.' },
      { status: 503 }
    )
  }
}
