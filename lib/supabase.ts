import { createClient } from '@supabase/supabase-js'

// Este módulo solo se importa desde API routes (servidor).
// Las variables sin prefijo NEXT_PUBLIC_ nunca llegan al bundle del cliente.
const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan variables de entorno SUPABASE_URL o SUPABASE_ANON_KEY')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface ObjecionRow {
  objecion_original: string
  perfil: string
  respuesta_emocional: string
  respuesta_logica: string
  respuesta_cierre: string
}

export async function guardarObjecion(data: ObjecionRow): Promise<void> {
  const { error } = await supabase.from('objeciones').insert(data)
  if (error) {
    // Logueamos el mensaje de error pero NUNCA las credenciales
    console.error('[Supabase] Error al guardar objeción:', error.message)
    throw new Error('No se pudo guardar la interacción en la base de datos')
  }
}
