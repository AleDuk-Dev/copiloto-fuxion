// ─────────────────────────────────────────────────────────────
// POST /api/stripe/webhook — Fase C1
//
// Único lugar que actualiza el estado de suscripción en `perfiles`
// (plan, estado_suscripcion, stripe_subscription_id, rol). Usa el
// service role porque los grants por columna impiden que un
// usuario toque estas columnas (db/schema_fase_c1.sql).
//
// Eventos manejados:
//   - checkout.session.completed      → suscripción creada
//   - customer.subscription.updated   → cambio de plan / estado
//   - customer.subscription.deleted   → cancelada
//   - invoice.payment_failed          → pago fallido (no corta el
//     acceso de inmediato: Stripe reintenta; si al final cancela,
//     llega subscription.deleted)
//
// Configuración local:  stripe listen --forward-to localhost:3000/api/stripe/webhook
// En Vercel: crear el endpoint en el dashboard de Stripe (modo
// test) y poner el signing secret en STRIPE_WEBHOOK_SECRET.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { getStripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { planDePriceId } from '@/lib/planes'

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[Stripe webhook] Falta STRIPE_WEBHOOK_SECRET')
    return NextResponse.json({ error: 'Webhook no configurado.' }, { status: 500 })
  }

  const firma = request.headers.get('stripe-signature')
  if (!firma) {
    return NextResponse.json({ error: 'Falta la firma.' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    // constructEvent necesita el body CRUDO, no parseado.
    event = getStripe().webhooks.constructEvent(await request.text(), firma, secret)
  } catch (err) {
    console.error('[Stripe webhook] Firma inválida:', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Firma inválida.' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode === 'subscription' && session.subscription) {
          const sub = await getStripe().subscriptions.retrieve(
            typeof session.subscription === 'string' ? session.subscription : session.subscription.id
          )
          await aplicarSuscripcion(sub)
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await aplicarSuscripcion(event.data.object)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object
        const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id
        if (customerId) {
          await createAdminClient()
            .from('perfiles')
            .update({ estado_suscripcion: 'pago_fallido', actualizado_en: new Date().toISOString() })
            .eq('stripe_customer_id', customerId)
        }
        break
      }

      default:
        // Evento no manejado — se responde 200 para que Stripe no reintente.
        break
    }
  } catch (err) {
    console.error(`[Stripe webhook] Error procesando ${event.type}:`, err instanceof Error ? err.message : err)
    // 500 → Stripe reintenta con backoff (reintentos acotados por Stripe).
    return NextResponse.json({ error: 'Error interno.' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// Proyecta el estado de una suscripción de Stripe sobre `perfiles`.
async function aplicarSuscripcion(sub: Stripe.Subscription) {
  const admin = createAdminClient()
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id

  // Localizar al usuario: por customer_id, con fallback a la
  // metadata puesta en el checkout.
  let userId: string | null = null
  const { data: porCustomer } = await admin
    .from('perfiles')
    .select('id, rol')
    .eq('stripe_customer_id', customerId)
    .maybeSingle()

  let rolActual: string | null = null
  if (porCustomer) {
    userId = porCustomer.id
    rolActual = porCustomer.rol
  } else if (sub.metadata?.supabase_user_id) {
    userId = sub.metadata.supabase_user_id
    const { data } = await admin.from('perfiles').select('rol').eq('id', userId).maybeSingle()
    rolActual = data?.rol ?? null
  }

  if (!userId) {
    console.error(`[Stripe webhook] Sin perfil para customer ${customerId} — revisar a mano.`)
    return
  }

  const priceId = sub.items.data[0]?.price?.id ?? ''
  const planDelPrecio = planDePriceId(priceId)

  const activa = sub.status === 'active' || sub.status === 'trialing'
  const fallida = sub.status === 'past_due' || sub.status === 'unpaid'
  const terminada = sub.status === 'canceled' || sub.status === 'incomplete_expired'

  const plan = terminada || !planDelPrecio ? 'gratis' : planDelPrecio
  const estado = terminada ? 'cancelada' : fallida ? 'pago_fallido' : activa ? 'activa' : 'cancelada'

  // El rol sigue al plan, sin pisar al admin: plan líder → rol
  // líder; si deja de ser líder, vuelve a distribuidor.
  let rol = rolActual
  if (rolActual !== 'admin') {
    rol = plan === 'lider' ? 'lider' : 'distribuidor'
  }

  const { error } = await admin
    .from('perfiles')
    .update({
      plan,
      estado_suscripcion: estado,
      stripe_customer_id: customerId,
      stripe_subscription_id: terminada ? null : sub.id,
      rol,
      actualizado_en: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) {
    // Lanzar para que el handler devuelva 500 y Stripe reintente.
    throw new Error(`No se pudo actualizar perfiles: ${error.message}`)
  }
}
