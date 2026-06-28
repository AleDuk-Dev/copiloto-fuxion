import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { checkRateLimit } from '@/lib/rateLimit'
import { guardarObjecion } from '@/lib/supabase'
import type { GenerarRequest, Respuestas } from '@/types'

// El cliente se instancia aquí, en el servidor. La API key NUNCA toca el cliente.
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY, // undefined lanza error en Anthropic SDK
})

const PERFILES: Record<string, string> = {
  general: 'distribuidor general de Fuxion',
  peso: 'distribuidor especializado en productos de control de peso de Fuxion (línea FitLine)',
  energia: 'distribuidor especializado en productos de energía y deporte de Fuxion (línea Sport)',
  piel: 'distribuidor especializado en productos de cuidado de piel de Fuxion (línea Skin)',
}

const SYSTEM_PROMPT = (perfil: string) => `
Eres un experto en ventas consultivas y comunicación persuasiva para ${PERFILES[perfil] ?? PERFILES.general}.

Fuxion es una empresa latinoamericana de venta directa (MLM) que comercializa suplementos nutricionales, bebidas funcionales y productos de bienestar a base de ingredientes naturales como la maca, camu camu, yacon y otros superalimentos andinos.

Cuando te den una objeción de un prospecto, debes generar EXACTAMENTE 3 respuestas breves y naturales:
1. EMOCIONAL: conecta con el deseo o miedo del prospecto (máximo 2 líneas)
2. LOGICA_ROI: usa datos, ahorro o beneficio tangible (máximo 2 líneas)
3. CIERRE: propone un pequeño paso de acción concreto (máximo 2 líneas)

Responde SIEMPRE con un JSON válido con esta estructura exacta, sin texto adicional antes ni después:
{
  "emocional": "texto aquí",
  "logica": "texto aquí",
  "cierre": "texto aquí"
}

Reglas:
- Tono cálido, cercano, nunca agresivo ni presionante
- Sin jerga técnica ni términos de MLM como "upline", "downline", "matriz"
- Máximo 2 oraciones por respuesta
- En español latinoamericano
`.trim()

export async function POST(request: NextRequest) {
  // 1. Obtener IP para rate limiting
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown'

  // 2. Verificar rate limit
  const { allowed, remaining } = checkRateLimit(ip)
  if (!allowed) {
    return NextResponse.json(
      { error: 'Has alcanzado el límite de 5 consultas por hora. Vuelve más tarde.' },
      {
        status: 429,
        headers: { 'X-RateLimit-Remaining': '0' },
      }
    )
  }

  // 3. Parsear y validar el body
  let body: GenerarRequest
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 400 })
  }

  const { objecion, perfil } = body

  if (!objecion || typeof objecion !== 'string' || objecion.trim().length === 0) {
    return NextResponse.json({ error: 'La objeción no puede estar vacía.' }, { status: 400 })
  }

  if (objecion.trim().length > 1000) {
    return NextResponse.json(
      { error: 'La objeción no puede superar los 1000 caracteres.' },
      { status: 400 }
    )
  }

  const perfilesValidos = ['general', 'peso', 'energia', 'piel']
  if (!perfil || !perfilesValidos.includes(perfil)) {
    return NextResponse.json({ error: 'Perfil inválido.' }, { status: 400 })
  }

  // 4. Llamar a la API de Anthropic
  let respuestas: Respuestas
  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: SYSTEM_PROMPT(perfil),
      messages: [
        {
          role: 'user',
          content: `Objeción del prospecto: "${objecion.trim()}"`,
        },
      ],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text : ''

    // Extraer JSON robusto: busca el primer { ... } en la respuesta
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('La IA no devolvió un JSON válido')
    }

    const parsed = JSON.parse(jsonMatch[0])

    if (!parsed.emocional || !parsed.logica || !parsed.cierre) {
      throw new Error('Estructura de respuesta incompleta')
    }

    respuestas = {
      emocional: String(parsed.emocional),
      logica: String(parsed.logica),
      cierre: String(parsed.cierre),
    }
  } catch (err) {
    // Nunca exponemos el error técnico al cliente
    const isAuthError = err instanceof Anthropic.AuthenticationError
    const isRateLimitError = err instanceof Anthropic.RateLimitError
    const isOverloadError = err instanceof Anthropic.InternalServerError

    if (isAuthError) {
      console.error('[Anthropic] Error de autenticación — verifica ANTHROPIC_API_KEY')
    } else if (isRateLimitError || isOverloadError) {
      console.error('[Anthropic] Límite de tasa o sobrecarga del servicio')
    } else {
      console.error('[Anthropic] Error al generar respuestas:', err instanceof Error ? err.message : 'Error desconocido')
    }

    return NextResponse.json(
      {
        error:
          'El asistente no está disponible en este momento. Por favor, intenta de nuevo en unos segundos.',
      },
      { status: 503 }
    )
  }

  // 5. Guardar en Supabase (no bloqueamos la respuesta si falla)
  guardarObjecion({
    objecion_original: objecion.trim(),
    perfil,
    respuesta_emocional: respuestas.emocional,
    respuesta_logica: respuestas.logica,
    respuesta_cierre: respuestas.cierre,
  }).catch((err) => {
    // Error crítico para el negocio — lo registramos pero no rompemos la UX
    console.error('[DB] ALERTA: No se guardó la interacción:', err instanceof Error ? err.message : err)
  })

  // 6. Responder al cliente
  return NextResponse.json(
    { respuestas },
    { headers: { 'X-RateLimit-Remaining': String(remaining) } }
  )
}
