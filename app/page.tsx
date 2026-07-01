import Link from 'next/link'
import ObjecionForm from '@/components/ObjecionForm'

export default function Home() {
  return (
    <main className="min-h-screen bg-crema">
      {/* Acceso discreto al dashboard (Fase A) sin tocar el flujo del Mago de Oz */}
      <div className="flex justify-end px-4 pt-3">
        <Link
          href="/login"
          className="text-xs font-medium text-morado hover:text-morado-oscuro underline"
        >
          Iniciar sesión
        </Link>
      </div>
      <ObjecionForm />
    </main>
  )
}
