import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Destino del magic link y de la confirmación de email:
// intercambia el código por una sesión y redirige al dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`)
    }

    // Log del error real para diagnóstico (nunca llega al cliente).
    console.error(
      `[Auth] exchangeCodeForSession falló — code: ${error.code ?? 'sin código'}, mensaje: ${error.message}`
    )

    // PKCE: el exchange requiere la cookie code_verifier que se creó
    // en el navegador donde se PIDIÓ el enlace. Si falta (enlace abierto
    // en otro navegador/perfil/incógnito), damos un mensaje específico.
    const esErrorDeVerifier =
      error.message.toLowerCase().includes('code verifier') ||
      error.code === 'validation_failed' ||
      error.code === 'flow_state_not_found' ||
      error.code === 'bad_code_verifier'

    if (esErrorDeVerifier) {
      return NextResponse.redirect(`${origin}/login?error=otro-navegador`)
    }
  }

  // Supabase también puede redirigir aquí con ?error=...&error_code=otp_expired
  // (token del email ya usado/expirado) en vez de ?code=
  const errorCode = searchParams.get('error_code')
  if (errorCode === 'otp_expired') {
    return NextResponse.redirect(`${origin}/login?error=enlace-expirado`)
  }

  // Enlace inválido o expirado → de vuelta al login
  return NextResponse.redirect(`${origin}/login?error=enlace-invalido`)
}
