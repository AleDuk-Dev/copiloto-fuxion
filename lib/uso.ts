import type { SupabaseClient } from '@supabase/supabase-js'
import { PLANES, type Plan } from '@/lib/planes'

export interface UsoMensual {
  plan: Plan
  usadas: number
  limite: number
}

// Uso del mes en curso contra el límite del plan (skill de
// token-optimization, Mecanismo 3). Cuenta sobre las tablas que ya
// guardan cada generación (sin contador duplicado que se
// desincronice): historial_objeciones (Fase B) + resumenes_whatsapp
// (Fase C2 — un resumen de conversación también es una llamada a
// Claude y consume del mismo límite mensual).
//
// Limitación conocida: un resumen que el distribuidor descarta sin
// confirmar no queda guardado (regla de Fase C2: no se guarda nada
// sin confirmación) y por eso no cuenta contra el plan — el rate
// limit por hora acota ese hueco.
export async function obtenerUsoMensual(
  supabase: SupabaseClient,
  userId: string
): Promise<UsoMensual> {
  const inicioMes = new Date()
  inicioMes.setUTCDate(1)
  inicioMes.setUTCHours(0, 0, 0, 0)

  const [{ data: perfil }, { count: countObjeciones }, { count: countResumenes }] =
    await Promise.all([
      supabase.from('perfiles').select('plan').eq('id', userId).single(),
      supabase
        .from('historial_objeciones')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('creado_en', inicioMes.toISOString()),
      supabase
        .from('resumenes_whatsapp')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('creado_en', inicioMes.toISOString()),
    ])

  const plan: Plan =
    perfil?.plan === 'individual' || perfil?.plan === 'lider' ? perfil.plan : 'gratis'

  return {
    plan,
    usadas: (countObjeciones ?? 0) + (countResumenes ?? 0),
    limite: PLANES[plan].generacionesMes,
  }
}
