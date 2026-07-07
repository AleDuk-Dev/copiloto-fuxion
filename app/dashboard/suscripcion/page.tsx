// ─────────────────────────────────────────────────────────────
// /dashboard/suscripcion — Fase C1
//
// Plan actual, generaciones usadas/disponibles del mes (skill de
// token-optimization) y botones para suscribirse (checkout) o
// gestionar la suscripción existente (Customer Portal).
// Todo en modo TEST de Stripe.
// ─────────────────────────────────────────────────────────────

import { createClient } from '@/lib/supabase/server'
import { PLANES, type Plan } from '@/lib/planes'
import { obtenerUsoMensual } from '@/lib/uso'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { BotonSuscribirse, BotonGestionar } from '@/components/suscripcion/BotonesSuscripcion'

export const metadata = { title: 'Suscripción — Copiloto Fuxion' }

const ETIQUETA_ESTADO: Record<string, { texto: string; estado: 'caliente' | 'tibio' | 'neutro' }> = {
  activa: { texto: 'Activa', estado: 'caliente' },
  pago_fallido: { texto: 'Pago pendiente', estado: 'tibio' },
  cancelada: { texto: 'Cancelada', estado: 'neutro' },
}

export default async function SuscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>
}) {
  const { checkout } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: perfil }, uso] = await Promise.all([
    supabase
      .from('perfiles')
      .select('plan, estado_suscripcion, stripe_customer_id')
      .eq('id', user!.id)
      .single(),
    obtenerUsoMensual(supabase, user!.id),
  ])

  const plan: Plan = (perfil?.plan as Plan) ?? 'gratis'
  const tieneSuscripcion = plan !== 'gratis' && perfil?.estado_suscripcion !== 'cancelada'
  const etiqueta = perfil?.estado_suscripcion ? ETIQUETA_ESTADO[perfil.estado_suscripcion] : null
  const porcentaje = Math.min(100, Math.round((uso.usadas / uso.limite) * 100))

  return (
    <div>
      <h1 className="text-xl font-bold text-fx-purpura-oscuro mb-1">Suscripción</h1>
      <p className="text-sm text-fx-purpura-oscuro/60 mb-4">
        Tu plan y el uso de este mes. Los pagos los procesa Stripe — nunca guardamos tu tarjeta.
      </p>

      {checkout === 'ok' && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl px-4 py-3 text-sm mb-4">
          ✅ ¡Pago recibido! Tu plan se activará en unos segundos — recarga la página si aún no lo ves.
        </div>
      )}
      {checkout === 'cancelado' && (
        <div className="bg-fx-lila border border-fx-purpura/20 text-fx-purpura-medio rounded-xl px-4 py-3 text-sm mb-4">
          El pago se canceló. Puedes intentarlo de nuevo cuando quieras.
        </div>
      )}
      {perfil?.estado_suscripcion === 'pago_fallido' && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 rounded-xl px-4 py-3 text-sm mb-4">
          ⚠️ Tu último pago falló. Revisa tu método de pago en «Gestionar suscripción» para no
          perder el acceso a tu plan.
        </div>
      )}

      {/* Plan actual + uso del mes */}
      <Card titulo="Tu plan actual" className="mb-4">
        <div className="flex items-center gap-3 mb-4">
          <p className="text-lg font-bold text-fx-purpura-oscuro">{PLANES[plan].nombre}</p>
          {etiqueta && <Badge estado={etiqueta.estado}>{etiqueta.texto}</Badge>}
        </div>

        <p className="text-sm text-fx-purpura-oscuro/70 mb-1">
          Generaciones este mes: <strong>{uso.usadas}</strong> de {uso.limite}
        </p>
        <div className="w-full bg-fx-lila rounded-full h-2 mb-4">
          <div
            className={`h-2 rounded-full ${porcentaje >= 80 ? 'bg-fx-magenta' : 'bg-fx-purpura'}`}
            style={{ width: `${porcentaje}%` }}
          />
        </div>

        {tieneSuscripcion && <BotonGestionar />}
      </Card>

      {/* Planes disponibles — solo si no tiene suscripción viva.
          El cambio de plan con suscripción activa va por el portal. */}
      {!tieneSuscripcion && (
        <div className="grid gap-4 sm:grid-cols-2">
          {(['individual', 'lider'] as const).map((p) => (
            <Card key={p} className={p === 'lider' ? 'border-fx-magenta/40' : ''}>
              <div className="flex items-baseline justify-between mb-2">
                <h3 className="font-bold text-fx-purpura-oscuro">{PLANES[p].nombre}</h3>
                <p className="text-lg font-bold text-fx-purpura">
                  {PLANES[p].precioMes}
                  <span className="text-xs font-normal text-fx-purpura-oscuro/50">/mes</span>
                </p>
              </div>
              <p className="text-sm text-fx-purpura-oscuro/70 mb-2">{PLANES[p].descripcion}</p>
              <p className="text-xs text-fx-purpura-oscuro/50 mb-4">
                {PLANES[p].generacionesMes} generaciones al mes
              </p>
              <BotonSuscribirse plan={p} destacado={p === 'lider'} />
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
