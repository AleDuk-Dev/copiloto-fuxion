// ─────────────────────────────────────────────────────────────
// Planes y límites — ÚNICO lugar donde viven los tiers.
//
// Los Price IDs de Stripe NO se hardcodean aquí: vienen de env
// (STRIPE_PRICE_INDIVIDUAL / STRIPE_PRICE_LIDER) y los genera
// scripts/stripe-setup.ts. Cambiar de precio = correr el script
// de nuevo y actualizar las dos variables, sin tocar código.
//
// Los límites de generaciones/mes (skill de token-optimization,
// Mecanismo 3: atar coste variable a ingreso variable) son
// valores iniciales razonables — ajustables aquí en una línea.
// ─────────────────────────────────────────────────────────────

export type Plan = 'gratis' | 'individual' | 'lider'

export interface DefinicionPlan {
  nombre: string
  precioMes: string // solo display; el precio real vive en Stripe
  generacionesMes: number
  descripcion: string
}

export const PLANES: Record<Plan, DefinicionPlan> = {
  gratis: {
    nombre: 'Gratis',
    precioMes: '0 €',
    generacionesMes: 10,
    descripcion: 'Para probar el copiloto.',
  },
  individual: {
    nombre: 'Individual',
    precioMes: '15 €',
    generacionesMes: 150,
    descripcion: 'Para el distribuidor que lo usa a diario.',
  },
  lider: {
    nombre: 'Líder / Equipo',
    precioMes: '79 €',
    generacionesMes: 400,
    descripcion: 'Todo lo del plan Individual + invitar a tu línea y ver métricas agregadas de tu equipo.',
  },
}

// Umbral de aviso anticipado (skill: no cortar de golpe sin aviso).
export const UMBRAL_AVISO_LIMITE = 0.8

export function priceIdDePlan(plan: 'individual' | 'lider'): string {
  const id =
    plan === 'individual'
      ? process.env.STRIPE_PRICE_INDIVIDUAL
      : process.env.STRIPE_PRICE_LIDER
  if (!id) {
    throw new Error(
      `Falta la variable de entorno del precio para el plan "${plan}". Corre scripts/stripe-setup.ts y configura STRIPE_PRICE_INDIVIDUAL / STRIPE_PRICE_LIDER.`
    )
  }
  return id
}

export function planDePriceId(priceId: string): 'individual' | 'lider' | null {
  if (priceId === process.env.STRIPE_PRICE_INDIVIDUAL) return 'individual'
  if (priceId === process.env.STRIPE_PRICE_LIDER) return 'lider'
  return null
}
