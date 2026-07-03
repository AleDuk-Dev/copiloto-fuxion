/**
 * Rate limiter en memoria por clave (IP en el Mago de Oz, user id en
 * el dashboard de Fase B). Default: 5 peticiones por hora.
 *
 * NOTA: En un despliegue serverless (Vercel) cada instancia tiene su propia
 * memoria, por lo que este límite aplica por instancia. Para una validación
 * "Mago de Oz" con poco tráfico esto es suficiente. Si el uso escala,
 * migrar a Upstash Redis (@upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number
  resetAt: number // timestamp en ms
}

const store = new Map<string, RateLimitEntry>()

const WINDOW_MS = 60 * 60 * 1000 // 1 hora
const MAX_REQUESTS = 5

export function checkRateLimit(
  clave: string,
  maxRequests: number = MAX_REQUESTS
): { allowed: boolean; remaining: number } {
  const now = Date.now()
  const entry = store.get(clave)

  if (!entry || now > entry.resetAt) {
    // Primera petición o ventana expirada: reiniciar contador
    store.set(clave, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: maxRequests - 1 }
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0 }
  }

  entry.count += 1
  return { allowed: true, remaining: maxRequests - entry.count }
}
