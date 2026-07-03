export type Perfil = 'general' | 'peso' | 'energia' | 'piel'

export interface GenerarRequest {
  objecion: string
  perfil: Perfil
}

export interface Respuestas {
  emocional: string
  logica: string
  cierre: string
}

export interface GenerarResponse {
  respuestas: Respuestas
  error?: never
}

export interface ErrorResponse {
  error: string
  respuestas?: never
}

// ── Fase B ───────────────────────────────────────────────────

// "Modo" es el mismo concepto que Perfil (selector producto/perfil).
export type Modo = Perfil

export interface ChunkRecuperado {
  id: string
  contenido: string
  source_type: string
  product_tag: string | null
  titulo: string | null
  similitud: number
}

export interface GenerarObjecionResponse {
  respuestas: Respuestas
  // La objeción menciona una condición médica → la UI muestra el
  // recordatorio de cumplimiento de forma visible (Regla 1).
  alertaSalud: boolean
  // false → el RAG no encontró chunks suficientemente similares y
  // la respuesta es más general (la UI lo avisa, no lo disimula).
  contextoSuficiente: boolean
}

export type ResultadoHistorial = 'cerro_venta' | 'no_funciono'

export interface HistorialItem {
  id: string
  objecion: string
  modo: Modo
  respuestas: Respuestas
  alerta_salud: boolean
  contexto_suficiente: boolean
  resultado: ResultadoHistorial | null
  creado_en: string
}

export type EstadoProspecto = 'caliente' | 'tibio' | 'frio'

export interface Prioridad {
  id: string
  apodo: string
  estado: EstadoProspecto
  nota: string | null
  creado_en: string
}
