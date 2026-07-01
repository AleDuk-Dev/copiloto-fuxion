'use client'

import { createBrowserClient } from '@supabase/ssr'

// Cliente de Supabase para componentes del navegador (auth).
// Usa variables NEXT_PUBLIC_ — la anon key es pública por diseño;
// la seguridad real la dan las policies de RLS (ver db/schema.sql).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
