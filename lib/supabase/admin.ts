import { createClient } from '@supabase/supabase-js'

// Cliente con service role — salta RLS. USO RESTRINGIDO:
// únicamente el webhook de Stripe (app/api/stripe/webhook) y el
// endpoint de checkout, que necesitan escribir columnas de
// suscripción en `perfiles` que el usuario autenticado no puede
// tocar (grants por columna, ver db/schema_fase_c1.sql).
// NUNCA importar desde componentes ni exponer con NEXT_PUBLIC_.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.')
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
