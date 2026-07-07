import type { SupabaseClient } from '@supabase/supabase-js'
import { PLANES, type Plan } from '@/lib/planes'

export interface UsoMensual {
  plan: Plan
  usadas: number
  limite: number
}

// Uso del mes en curso contra el límite del plan (skill de
// token-optimization, Mecanismo 3). Cuenta sobre
// historial_objeciones — la misma tabla que ya guarda cada
// generación, sin contador duplicado que se desincronice.
export async function obtenerUsoMensual(
  supabase: SupabaseClient,
  userId: string
): Promise<UsoMensual> {
  const inicioMes = new Date()
  inicioMes.setUTCDate(1)
  inicioMes.setUTCHours(0, 0, 0, 0)

  const [{ data: perfil }, { count }] = await Promise.all([
    supabase.from('perfiles').select('plan').eq('id', userId).single(),
    supabase
      .from('historial_objeciones')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('creado_en', inicioMes.toISOString()),
  ])

  const plan: Plan =
    perfil?.plan === 'individual' || perfil?.plan === 'lider' ? perfil.plan : 'gratis'

  return { plan, usadas: count ?? 0, limite: PLANES[plan].generacionesMes }
}
