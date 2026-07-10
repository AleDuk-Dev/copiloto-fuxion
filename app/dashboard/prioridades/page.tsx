// Fase C2: el panel de prioridades de Fase B se consolidó dentro del
// CRM de /dashboard/prospectos (mismos datos, migrados en
// db/schema_fase_c2.sql). Se mantiene el redirect para no romper
// marcadores ni hábitos de los usuarios de Fase B.

import { redirect } from 'next/navigation'

export default function PrioridadesPage() {
  redirect('/dashboard/prospectos')
}
