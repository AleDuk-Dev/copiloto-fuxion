import Link from 'next/link'
import NavLinks from '@/components/dashboard/NavLinks'

export const metadata = { title: 'Dashboard — Copiloto Fuxion' }

// El middleware ya garantiza que solo llegan usuarios con sesión.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-fx-crema">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-60 flex-col bg-fx-purpura-oscuro p-4">
        <Link href="/dashboard" className="flex items-center gap-2 px-2 py-3 mb-4">
          <span className="text-2xl">🚀</span>
          <span className="text-white font-bold">Copiloto Fuxion</span>
        </Link>
        <NavLinks orientacion="lateral" />
      </aside>

      {/* Barra superior — móvil */}
      <header className="md:hidden bg-fx-purpura-oscuro px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-xl">🚀</span>
          <span className="text-white font-bold text-sm">Copiloto Fuxion</span>
        </Link>
      </header>

      {/* Contenido */}
      <main className="md:ml-60 px-4 md:px-8 py-6 pb-24 md:pb-8 max-w-3xl">
        {children}
      </main>

      {/* Nav inferior — móvil */}
      <div className="md:hidden fixed bottom-0 inset-x-0 bg-fx-purpura-oscuro border-t border-white/10">
        <NavLinks orientacion="inferior" />
      </div>
    </div>
  )
}
