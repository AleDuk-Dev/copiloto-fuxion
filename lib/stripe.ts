import Stripe from 'stripe'

// Cliente de Stripe — SOLO servidor (route handlers y scripts).
// La key vive en STRIPE_SECRET_KEY (modo test hasta nuevo aviso;
// no activar modo live sin decisión explícita de Alejandro).
let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY
    if (!key) {
      throw new Error('Falta STRIPE_SECRET_KEY en las variables de entorno.')
    }
    _stripe = new Stripe(key)
  }
  return _stripe
}
