// ─────────────────────────────────────────────────────────────
// Generación con Claude — Fase B
//
// El system prompt COMPLETO vive aquí, versionado en el código
// (skill de token-optimization, Mecanismo 1): el usuario nunca
// escribe ni ve un prompt libre — solo pega la objeción y elige
// un modo desde el selector. La objeción entra como mensaje de
// usuario dentro de una plantilla fija, nunca como instrucción.
//
// Compliance (skills/compliance-fuxion, Regla 1): el prompt
// incluye la prohibición de health claims CON ejemplos de qué SÍ
// y qué NO — los modelos siguen mejor instrucciones con ejemplos.
//
// max_tokens: 600 — 3 respuestas de máx. 2 oraciones no necesitan
// más (tope explícito, no default).
// ─────────────────────────────────────────────────────────────

import Anthropic from '@anthropic-ai/sdk'
import type { ChunkRecuperado, Modo, Respuestas } from '@/types'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS_SALIDA = 600

const MODOS: Record<Modo, string> = {
  general: 'distribuidor general de Fuxion',
  peso: 'distribuidor especializado en la línea de control de peso de Fuxion',
  energia: 'distribuidor especializado en la línea de energía y deporte de Fuxion',
  piel: 'distribuidor especializado en la línea de cuidado de piel de Fuxion',
}

// Detección server-side de temas de salud en la objeción.
// Si aparece, la UI muestra el recordatorio de cumplimiento de
// forma visible y el prompt recibe una instrucción extra.
// Lista simple a propósito — mejor un falso positivo (recordatorio
// de más) que un falso negativo.
const TEMAS_SALUD = [
  'diabetes', 'diabétic', 'cáncer', 'cancer', 'tumor',
  'embaraz', 'lactancia', 'lactando',
  'hipertensión', 'hipertension', 'presión alta', 'presion alta',
  'tiroides', 'colesterol', 'triglicérid', 'triglicerid',
  'ansiedad', 'depresión', 'depresion', 'insomnio',
  'medicament', 'medicación', 'medicacion', 'medicina recetada',
  'tratamiento', 'enfermedad', 'enfermo', 'enferma',
  'gastritis', 'colon irritable', 'alergia', 'alérgic', 'alergic',
  'riñón', 'riñon', 'hígado', 'higado', 'corazón', 'corazon',
  'cirugía', 'cirugia', 'operad',
]

export function detectarTemaSalud(texto: string): boolean {
  const normalizado = texto.toLowerCase()
  return TEMAS_SALUD.some((t) => normalizado.includes(t))
}

function bloqueContexto(chunks: ChunkRecuperado[]): string {
  if (chunks.length === 0) {
    return `NO hay información específica de la base de conocimiento para esta objeción.
Genera respuestas generales de venta consultiva, sin inventar datos de productos,
precios ni testimonios de Fuxion que no conozcas con certeza.`
  }
  const piezas = chunks
    .map(
      (c, i) =>
        `[Fuente ${i + 1} — ${c.source_type}${c.titulo ? ` — ${c.titulo}` : ''}]\n${c.contenido}`
    )
    .join('\n\n')
  return `Basa tus respuestas en esta información de la base de conocimiento de la red
(catálogo, capacitaciones y objeciones reales). Prefiérela sobre tu conocimiento general.
No inventes precios, ingredientes ni datos que no estén aquí:

${piezas}`
}

const INSTRUCCION_SALUD = `
ATENCIÓN: la objeción menciona una condición de salud, medicación, embarazo o similar.
Reglas adicionales obligatorias para este caso:
- Ninguna respuesta puede sugerir el producto como apoyo, alivio o solución para esa condición.
- Al menos una respuesta debe sugerir de forma natural que el prospecto revise los ingredientes
  con su médico o profesional de salud antes de decidir.
- No minimices la condición ("eso no es nada", "es natural, no hace daño").`

function systemPrompt(modo: Modo, chunks: ChunkRecuperado[], temaSalud: boolean): string {
  return `
Eres un experto en ventas consultivas que asiste a un ${MODOS[modo]}.
Fuxion es una empresa latinoamericana de venta directa que comercializa suplementos
nutricionales y bebidas funcionales a base de ingredientes naturales andinos y amazónicos.

Tu salida la lee SOLO el distribuidor, que decide si la usa, la edita y la envía él mismo.
Nada se envía automáticamente a nadie.

${bloqueContexto(chunks)}

REGLA DE CUMPLIMIENTO INNEGOCIABLE — cero claims de salud:
Fuxion vende suplementos, no medicamentos. Nunca afirmes ni insinúes que un producto cura,
trata, previene o diagnostica una enfermedad o condición médica, ni prometas resultados
de salud específicos o con plazos.
- SÍ puedes decir: "aporta fibra que contribuye a tu bienestar digestivo como parte de una
  alimentación balanceada", "a mí me ayudó a sentirme con más energía" (experiencia personal).
- NO puedes decir: "regula el azúcar en la sangre", "elimina la ansiedad", "vas a bajar 5 kilos
  en dos semanas", "es mejor que tu medicación".
- Testimonios solo como experiencia personal ("a mí me..."), nunca como garantía ("esto te va a...").
${temaSalud ? INSTRUCCION_SALUD : ''}

Cuando recibas la objeción del prospecto, genera EXACTAMENTE 3 respuestas breves y naturales:
1. EMOCIONAL: conecta con el deseo o preocupación del prospecto (máximo 2 oraciones)
2. LOGICA_ROI: usa un dato, reencuadre de coste o beneficio tangible del contexto (máximo 2 oraciones)
3. CIERRE: propone el siguiente paso pequeño y concreto (máximo 2 oraciones)

Responde SIEMPRE con un JSON válido con esta estructura exacta, sin texto adicional:
{
  "emocional": "texto aquí",
  "logica": "texto aquí",
  "cierre": "texto aquí"
}

Reglas de tono:
- Cálido, cercano, de igual a igual; nunca agresivo ni presionante.
- Sin jerga técnica ni términos de MLM como "upline", "downline", "matriz".
- En español latinoamericano.
`.trim()
}

export interface ResultadoGeneracion {
  respuestas: Respuestas
  tokensEntrada: number
  tokensSalida: number
}

export async function generarRespuestas(
  objecion: string,
  modo: Modo,
  chunks: ChunkRecuperado[],
  temaSalud: boolean
): Promise<ResultadoGeneracion> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS_SALIDA,
    system: systemPrompt(modo, chunks, temaSalud),
    messages: [
      {
        role: 'user',
        // Plantilla fija: la objeción es un dato, no una instrucción.
        content: `Objeción del prospecto: "${objecion}"`,
      },
    ],
  })

  const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
  const jsonMatch = rawText.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('La IA no devolvió un JSON válido')
  }

  const parsed = JSON.parse(jsonMatch[0])
  if (!parsed.emocional || !parsed.logica || !parsed.cierre) {
    throw new Error('Estructura de respuesta incompleta')
  }

  return {
    respuestas: {
      emocional: String(parsed.emocional),
      logica: String(parsed.logica),
      cierre: String(parsed.cierre),
    },
    tokensEntrada: message.usage.input_tokens,
    tokensSalida: message.usage.output_tokens,
  }
}
