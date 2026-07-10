import type { EstadoProspectoCrm } from '@/types'

// Estados del CRM (Fase C2) — compartido entre lista, ficha y
// pantalla de pegado de WhatsApp.
export const ESTADOS_CRM: { value: EstadoProspectoCrm; label: string; emoji: string }[] = [
  { value: 'caliente', label: 'Caliente', emoji: '🔥' },
  { value: 'tibio', label: 'Tibio', emoji: '🌤️' },
  { value: 'frio', label: 'Frío', emoji: '❄️' },
  { value: 'cliente', label: 'Cliente', emoji: '⭐' },
  { value: 'perdido', label: 'Perdido', emoji: '🚫' },
]

// Orden de seguimiento: primero a quién contactar hoy.
export const ORDEN_CRM: Record<EstadoProspectoCrm, number> = {
  caliente: 0,
  tibio: 1,
  frio: 2,
  cliente: 3,
  perdido: 4,
}

export function etiquetaEstado(estado: EstadoProspectoCrm): string {
  const e = ESTADOS_CRM.find((x) => x.value === estado)
  return e ? `${e.emoji} ${e.label}` : estado
}
