'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'

interface AuthFormProps {
  modo: 'login' | 'registro'
}

// Traducción de errores de Supabase a mensajes claros (ver PRD:
// "email ya registrado → mensaje claro, no error genérico").
function mensajeError(codigo: string | undefined, mensaje: string): string {
  if (mensaje.includes('already registered') || codigo === 'user_already_exists') {
    return 'Ese email ya tiene una cuenta. Prueba iniciar sesión.'
  }
  if (mensaje.includes('Invalid login credentials')) {
    return 'Email o contraseña incorrectos. Revisa e intenta de nuevo.'
  }
  if (mensaje.includes('Email not confirmed')) {
    return 'Tu email aún no está confirmado. Revisa tu bandeja de entrada.'
  }
  if (mensaje.includes('rate limit') || mensaje.includes('rate_limit')) {
    return 'Demasiados intentos seguidos. Espera un momento e intenta de nuevo.'
  }
  if (mensaje.includes('confirmation email') || mensaje.includes('sending email')) {
    return 'No pudimos enviar el correo de confirmación. Es un problema del servicio de email, no tuyo — intenta más tarde.'
  }
  return 'Algo salió mal. Intenta de nuevo en unos segundos.'
}

export default function AuthForm({ modo }: AuthFormProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [usarMagicLink, setUsarMagicLink] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const esRegistro = modo === 'registro'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setAviso(null)

    if (!usarMagicLink && password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setCargando(true)
    const supabase = createClient()

    try {
      if (usarMagicLink) {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) {
          setError(mensajeError(error.code, error.message))
        } else {
          setAviso('Te enviamos un enlace a tu correo. Ábrelo para entrar — puedes cerrar esta pestaña.')
        }
        return
      }

      if (esRegistro) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        })
        if (error) {
          setError(mensajeError(error.code, error.message))
        } else if (data.user && data.user.identities?.length === 0) {
          // Supabase devuelve un usuario "fantasma" si el email ya existe
          setError('Ese email ya tiene una cuenta. Prueba iniciar sesión.')
        } else if (data.session) {
          router.push('/dashboard')
          router.refresh()
        } else {
          setAviso('Cuenta creada. Revisa tu correo para confirmar tu email antes de entrar.')
        }
        return
      }

      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setError(mensajeError(error.code, error.message))
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      // Sin este catch, cualquier excepción (ej. env vars ausentes al
      // crear el cliente) moría en silencio y el usuario no veía nada.
      console.error('[AuthForm] excepción no controlada:', err)
      setError('Algo salió mal. Intenta de nuevo en unos segundos.')
    } finally {
      setCargando(false)
    }
  }

  return (
    <Card className="w-full max-w-sm">
      <h1 className="text-xl font-bold text-fx-purpura-oscuro mb-1">
        {esRegistro ? 'Crea tu cuenta' : 'Inicia sesión'}
      </h1>
      <p className="text-sm text-fx-purpura-oscuro/60 mb-5">
        {esRegistro
          ? 'Solo necesitas tu email para empezar.'
          : 'Bienvenido de vuelta.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          id="email"
          type="email"
          label="Email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
        />

        {!usarMagicLink && (
          <Input
            id="password"
            type="password"
            label="Contraseña"
            required
            autoComplete={esRegistro ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
          />
        )}

        {error && (
          <div className="bg-fx-magenta/10 border border-fx-magenta/30 text-fx-magenta rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {aviso && (
          <div className="bg-fx-lila border border-fx-purpura/20 text-fx-purpura rounded-xl px-4 py-3 text-sm">
            {aviso}
          </div>
        )}

        <Button type="submit" disabled={cargando} className="w-full">
          {cargando
            ? 'Un momento...'
            : usarMagicLink
              ? 'Enviarme el enlace'
              : esRegistro
                ? 'Crear cuenta'
                : 'Entrar'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => {
          setUsarMagicLink(!usarMagicLink)
          setError(null)
          setAviso(null)
        }}
        className="w-full text-center text-xs text-fx-purpura-medio hover:text-fx-purpura mt-3 underline"
      >
        {usarMagicLink
          ? 'Prefiero usar contraseña'
          : 'Prefiero un enlace por correo (sin contraseña)'}
      </button>

      <p className="text-center text-sm text-fx-purpura-oscuro/60 mt-5">
        {esRegistro ? (
          <>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-fx-magenta font-medium hover:underline">
              Inicia sesión
            </Link>
          </>
        ) : (
          <>
            ¿Primera vez aquí?{' '}
            <Link href="/registro" className="text-fx-magenta font-medium hover:underline">
              Crea tu cuenta
            </Link>
          </>
        )}
      </p>
    </Card>
  )
}
