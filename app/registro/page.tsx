import AuthForm from '@/components/auth/AuthForm'

export const metadata = { title: 'Crear cuenta — Copiloto Fuxion' }

export default function RegistroPage() {
  return (
    <main className="min-h-screen bg-fx-crema flex items-center justify-center px-4">
      <AuthForm modo="registro" />
    </main>
  )
}
