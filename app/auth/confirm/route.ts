import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

// Flujo token_hash para magic link / confirmación de email.
// A diferencia de /auth/callback (PKCE), verifyOtp NO depende de la
// cookie code_verifier, así que el enlace funciona aunque se abra en
// un navegador distinto al que lo pidió.
// Requiere que la plantilla de email en Supabase apunte a:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
// /auth/callback queda como fallback del flujo viejo — no se toca.

const TIPOS_VALIDOS: EmailOtpType[] = [
  'email',
  'signup',
  'magiclink',
  'recovery',
  'email_change',
]

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type && TIPOS_VALIDOS.includes(type)) {
    const supabase = await createClient()
    // verifyOtp valida el token y crea la sesión: el cliente de
    // lib/supabase/server.ts escribe las cookies de sesión en la
    // respuesta a través del cookieStore.
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    })

    if (!error) {
      return NextResponse.redirect(`${origin}/dashboard`)
    }

    // Log del error real para diagnóstico (nunca llega al cliente).
    console.error(
      `[Auth] verifyOtp falló — code: ${error.code ?? 'sin código'}, mensaje: ${error.message}`
    )

    if (error.code === 'otp_expired') {
      return NextResponse.redirect(`${origin}/login?error=enlace-expirado`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=enlace-invalido`)
}
