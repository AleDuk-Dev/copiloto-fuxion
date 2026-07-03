// ─────────────────────────────────────────────────────────────
// POST /api/objeciones/generar — Fase B
//
// Generador de guiones para usuarios autenticados. Flujo:
//   auth → rate limit por usuario → validación → detección de
//   tema de salud → retrieval (RAG) → Claude → guardar historial.
//
// Checklist del skill de token-optimization:
//   - Sin prompt libre: la objeción entra por plantilla fija (lib/claude.ts).
//   - Contexto limitado: máx. 4 chunks (lib/rag.ts).
//   - max_tokens explícito: 600 (lib/claude.ts).
//   - Límite de uso: 15 generaciones/hora por usuario (los tiers
//     por plan llegan en Fase C; esto evita "gratis e ilimitado").
//   - Tokens de entrada/salida se guardan por llamada en historial.
//
// Regla 3 (humano en el loop): esto devuelve texto a la UI del
// distribuidor; no envía nada a ningún tercero.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import { recuperarContexto } from '@/lib/rag'
import { generarRespuestas, detectarTemaSalud } from '@/lib/claude'
import type { Modo } from '@/types'

const MAX_GENERACIONES_HORA = 15
const MODOS_VALIDOS: Modo[] = ['general', 'peso', 'energia', 'piel']

export async function POST(request: NextRequest) {
  // 1. Autenticación (getUser valida el token contra Supabase)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  // 2. Rate limit por usuario (no por IP)
  const { allowed, remaining } = checkRateLimit(`user:${user.id}`, MAX_GENERACIONES_HORA)
  if (!allowed) {
    return NextResponse.json(
      { error: `Alcanzaste el límite de ${MAX_GENERACIONES_HORA} generaciones por hora. Vuelve en un rato.` },
      { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
    )
  }

  // 3. Validación del body
  let body: { objecion?: unknown; modo?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 400 })
  }

  const objecion = typeof body.objecion === 'string' ? body.objecion.trim() : ''
  const modo = body.modo as Modo

  if (objecion.length === 0) {
    return NextResponse.json({ error: 'La objeción no puede estar vacía.' }, { status: 400 })
  }
  if (objecion.length > 1000) {
    return NextResponse.json(
      { error: 'La objeción no puede superar los 1000 caracteres.' },
      { status: 400 }
    )
  }
  if (!MODOS_VALIDOS.includes(modo)) {
    return NextResponse.json({ error: 'Modo inválido.' }, { status: 400 })
  }

  // 4. Detección de tema de salud (Regla 1 del skill de cumplimiento)
  const alertaSalud = detectarTemaSalud(objecion)

  // 5. Retrieval — si falla o no hay chunks similares, se degrada a
  //    respuesta general y la UI lo avisa (contextoSuficiente=false).
  const { chunks, contextoSuficiente } = await recuperarContexto(supabase, objecion, modo)

  // 6. Generación
  let resultado
  try {
    resultado = await generarRespuestas(objecion, modo, chunks, alertaSalud)
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error('[Anthropic] Error de autenticación — verifica ANTHROPIC_API_KEY')
    } else {
      console.error(
        '[Anthropic] Error al generar:',
        err instanceof Error ? err.message : 'Error desconocido'
      )
    }
    return NextResponse.json(
      { error: 'El asistente no está disponible en este momento. Intenta de nuevo en unos segundos.' },
      { status: 503 }
    )
  }

  // 7. Guardar en el historial personal (RLS: auth.uid() = user_id).
  //    Se espera (en serverless un insert sin await puede perderse),
  //    pero un fallo aquí no rompe la respuesta al usuario.
  const { error: errHistorial } = await supabase.from('historial_objeciones').insert({
    user_id: user.id,
    objecion,
    modo,
    respuestas: resultado.respuestas,
    alerta_salud: alertaSalud,
    contexto_suficiente: contextoSuficiente,
    tokens_entrada: resultado.tokensEntrada,
    tokens_salida: resultado.tokensSalida,
  })
  if (errHistorial) {
    console.error('[DB] ALERTA: no se guardó en historial_objeciones:', errHistorial.message)
  }

  // 8. Responder — la UI muestra las respuestas, el aviso de salud
  //    visible, y el aviso de contexto general si aplica.
  return NextResponse.json(
    {
      respuestas: resultado.respuestas,
      alertaSalud,
      contextoSuficiente,
    },
    { headers: { 'X-RateLimit-Remaining': String(remaining) } }
  )
}
