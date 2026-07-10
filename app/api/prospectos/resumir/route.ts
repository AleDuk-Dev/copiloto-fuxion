// ─────────────────────────────────────────────────────────────
// POST /api/prospectos/resumir — Fase C2
//
// Recibe la conversación de WhatsApp pegada por el distribuidor,
// devuelve un resumen + estado SUGERIDO. Flujo:
//   auth → rate limit por usuario → límite mensual por plan →
//   validación de longitud → detección de tema de salud → Claude.
//
// REGLA NO NEGOCIABLE (Fase C2): la conversación cruda NO se
// persiste ni se loguea en ninguna parte de este handler:
//   - No hay ningún insert aquí. El guardado ocurre después, desde
//     el cliente, SOLO con el resumen + el estado que el humano
//     confirma (Regla 1: humano en el loop — si el distribuidor
//     abandona sin confirmar, no se guarda nada).
//   - Ningún console.* recibe `conversacion` ni el body.
//
// Checklist del skill de token-optimization:
//   - Sin prompt libre: plantilla fija en lib/claude.ts (resumirConversacion).
//   - Entrada acotada: MAX_CARACTERES_CONVERSACION (6000), con aviso
//     explícito si se excede — nunca truncado silencioso.
//   - max_tokens explícito: 350 (lib/claude.ts).
//   - Cuenta contra el límite mensual del plan (lib/uso.ts) + rate
//     limit horario anti-abuso.
// ─────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkRateLimit } from '@/lib/rateLimit'
import {
  resumirConversacion,
  detectarTemaSalud,
  MAX_CARACTERES_CONVERSACION,
} from '@/lib/claude'
import { obtenerUsoMensual } from '@/lib/uso'
import { PLANES, UMBRAL_AVISO_LIMITE } from '@/lib/planes'

const MAX_RESUMENES_HORA = 10

export async function POST(request: NextRequest) {
  // 1. Autenticación
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  }

  // 2. Rate limit por usuario (bucket separado del generador)
  const { allowed } = checkRateLimit(`resumen:user:${user.id}`, MAX_RESUMENES_HORA)
  if (!allowed) {
    return NextResponse.json(
      { error: `Alcanzaste el límite de ${MAX_RESUMENES_HORA} resúmenes por hora. Vuelve en un rato.` },
      { status: 429 }
    )
  }

  // 2b. Límite mensual por plan — ANTES de llamar a Claude.
  const uso = await obtenerUsoMensual(supabase, user.id)
  if (uso.usadas >= uso.limite) {
    return NextResponse.json(
      {
        error: `Alcanzaste las ${uso.limite} generaciones de tu plan ${PLANES[uso.plan].nombre} este mes. Puedes mejorar tu plan en Suscripción.`,
        limiteMensual: true,
      },
      { status: 403 }
    )
  }
  const cercaDelLimite = uso.usadas + 1 >= Math.ceil(uso.limite * UMBRAL_AVISO_LIMITE)

  // 3. Validación del body. La conversación vive SOLO en esta
  //    variable local — no se guarda, no se loguea.
  let body: { conversacion?: unknown; prospectoId?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Formato de solicitud inválido.' }, { status: 400 })
  }

  const conversacion = typeof body.conversacion === 'string' ? body.conversacion.trim() : ''

  if (conversacion.length === 0) {
    return NextResponse.json(
      { error: 'Pega el texto de la conversación antes de generar el resumen.' },
      { status: 400 }
    )
  }
  // Aviso explícito, nunca truncado silencioso (PRD Fase C2).
  if (conversacion.length > MAX_CARACTERES_CONVERSACION) {
    return NextResponse.json(
      {
        error: `La conversación supera el límite de ${MAX_CARACTERES_CONVERSACION.toLocaleString('es')} caracteres (tiene ${conversacion.length.toLocaleString('es')}). Recorta las partes menos relevantes y vuelve a intentarlo — no la cortamos por ti para no perder contexto sin que lo sepas.`,
        excedeLimite: true,
      },
      { status: 400 }
    )
  }

  // 4. Verificar que el prospecto existe y es del usuario (RLS
  //    devuelve vacío si no es suyo). El resumen se asocia a un
  //    prospecto que ya pasó el gate de consentimiento.
  const prospectoId = typeof body.prospectoId === 'string' ? body.prospectoId : ''
  const { data: prospecto } = await supabase
    .from('prospectos')
    .select('id')
    .eq('id', prospectoId)
    .maybeSingle()
  if (!prospecto) {
    return NextResponse.json({ error: 'Prospecto no encontrado.' }, { status: 404 })
  }

  // 5. Detección de tema de salud (Regla 1 del skill de cumplimiento):
  //    la UI muestra la misma alerta visible del generador de objeciones.
  const alertaSalud = detectarTemaSalud(conversacion)

  // 6. Resumen con plantilla fija. La conversación se descarta al
  //    salir de este scope — no se persiste en ningún lado.
  let resultado
  try {
    resultado = await resumirConversacion(conversacion, alertaSalud)
  } catch (err) {
    // Solo el mensaje del error — nunca el contenido de la conversación.
    console.error(
      '[Anthropic] Error al resumir:',
      err instanceof Error ? err.message : 'Error desconocido'
    )
    return NextResponse.json(
      { error: 'El asistente no está disponible en este momento. Intenta de nuevo en unos segundos.' },
      { status: 503 }
    )
  }

  // 7. Responder SIN guardar nada. El cliente muestra el resumen y el
  //    estado sugerido; solo si el distribuidor confirma se inserta en
  //    resumenes_whatsapp (resumen + estado confirmado, nunca el texto
  //    crudo). Si abandona, no queda rastro.
  return NextResponse.json({
    resumen: resultado.resumen,
    estadoSugerido: resultado.estadoSugerido,
    alertaSalud,
    tokensEntrada: resultado.tokensEntrada,
    tokensSalida: resultado.tokensSalida,
    usoMensual: {
      usadas: uso.usadas + 1,
      limite: uso.limite,
      cercaDelLimite,
    },
  })
}
