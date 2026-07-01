import AuthForm from '@/components/auth/AuthForm'

export const metadata = { title: 'Iniciar sesión — Copiloto Fuxion' }

const MENSAJES_ERROR: Record<string, string> = {
  'otro-navegador':
    'El enlace debe abrirse en el mismo navegador donde lo pediste. Vuelve a pedir uno desde aquí, o entra con tu contraseña.',
  'enlace-expirado':
    'Ese enlace ya se usó o expiró. Pide uno nuevo.',
  'enlace-invalido':
    'No pudimos validar el enlace. Pide uno nuevo o entra con tu contraseña.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const mensaje = error ? MENSAJES_ERROR[error] ?? MENSAJES_ERROR['enlace-invalido'] : null

  return (
    <main className="min-h-screen bg-fx-crema flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {mensaje && (
          <div className="bg-fx-magenta/10 border border-fx-magenta/30 text-fx-magenta rounded-xl px-4 py-3 text-sm mb-4">
            {mensaje}
          </div>
        )}
        <AuthForm modo="login" />
      </div>
    </main>
  )
}
