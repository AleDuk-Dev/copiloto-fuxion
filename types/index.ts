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
