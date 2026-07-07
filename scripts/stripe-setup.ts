// ─────────────────────────────────────────────────────────────
// scripts/stripe-setup.ts — crea productos y precios en Stripe
// por código (no en el dashboard a mano). Correr con:
//
//   npx tsx scripts/stripe-setup.ts
//
// Es idempotente: usa lookup_key para no duplicar precios si se
// corre dos veces. Al terminar imprime las variables de entorno
// que hay que copiar a .env.local y a Vercel.
//
// SOLO MODO TEST: el script se niega a correr con una key live.
// ─────────────────────────────────────────────────────────────

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Stripe from 'stripe'

// Carga .env.local sin dependencia de dotenv (mismo patrón que
// scripts/ingest.ts).
function cargarEnvLocal() {
  try {
    const contenido = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const linea of contenido.split('\n')) {
      const limpia = linea.trim()
      if (!limpia || limpia.startsWith('#')) continue
      const igual = limpia.indexOf('=')
      if (igual === -1) continue
      const clave = limpia.slice(0, igual).trim()
      const valor = limpia.slice(igual + 1).trim()
      if (!(clave in process.env)) process.env[clave] = valor
    }
  } catch {
    // Sin .env.local — se asume que las vars ya están en el entorno.
  }
}
cargarEnvLocal()

const key = process.env.STRIPE_SECRET_KEY
if (!key) {
  console.error('Falta STRIPE_SECRET_KEY en .env.local')
  process.exit(1)
}
if (!key.startsWith('sk_test_') && !key.startsWith('rk_test_')) {
  console.error(
    'STRIPE_SECRET_KEY no es de modo test (sk_test_/rk_test_). ' +
      'Este script NO corre en modo live — decisión de la sesión de Fase C1.'
  )
  process.exit(1)
}

const stripe = new Stripe(key)

// Definición de los dos tiers. Cambiar precio = editar aquí y
// volver a correr (crea un Price nuevo; el viejo se archiva a
// mano en el dashboard cuando ya nadie lo use).
const TIERS = [
  {
    lookupKey: 'copiloto_individual_mensual',
    producto: 'Copiloto Fuxion — Plan Individual',
    unitAmount: 1500, // 15,00 €
  },
  {
    lookupKey: 'copiloto_lider_mensual',
    producto: 'Copiloto Fuxion — Plan Líder / Equipo',
    unitAmount: 7900, // 79,00 €
  },
] as const

async function asegurarPrecio(tier: (typeof TIERS)[number]): Promise<Stripe.Price> {
  const existentes = await stripe.prices.list({
    lookup_keys: [tier.lookupKey],
    limit: 1,
  })
  if (existentes.data[0]) {
    console.log(`✓ Ya existe ${tier.lookupKey}: ${existentes.data[0].id}`)
    return existentes.data[0]
  }

  const price = await stripe.prices.create({
    lookup_key: tier.lookupKey,
    currency: 'eur',
    unit_amount: tier.unitAmount,
    recurring: { interval: 'month' },
    product_data: { name: tier.producto },
  })
  console.log(`+ Creado ${tier.lookupKey}: ${price.id} (${tier.unitAmount / 100} €/mes)`)
  return price
}

async function main() {
  const [individual, lider] = [await asegurarPrecio(TIERS[0]), await asegurarPrecio(TIERS[1])]

  console.log('\nCopia estas variables a .env.local y a Vercel (entorno de preview/producción):\n')
  console.log(`STRIPE_PRICE_INDIVIDUAL=${individual.id}`)
  console.log(`STRIPE_PRICE_LIDER=${lider.id}`)
}

main().catch((err) => {
  console.error('Error creando precios:', err instanceof Error ? err.message : err)
  process.exit(1)
})
