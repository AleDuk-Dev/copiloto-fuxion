'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Navegación del dashboard: lateral en desktop, inferior en móvil.
// Decisión de Fase A (ver DESIGN_BRIEF) — mantener consistente en
// todas las pantallas de fases siguientes.
const SECCIONES = [
  { href: '/dashboard/objeciones', label: 'Objeciones', icono: '💬' },
  { href: '/dashboard/prioridades', label: 'Prioridades', icono: '🎯' },
  { href: '/dashboard/prospectos', label: 'Prospectos', icono: '👥' },
  { href: '/dashboard/ajustes', label: 'Ajustes', icono: '⚙️' },
]

export default function NavLinks({ orientacion }: { orientacion: 'lateral' | 'inferior' }) {
  const pathname = usePathname()

  if (orientacion === 'inferior') {
    return (
      <nav className="flex justify-around">
        {SECCIONES.map((s) => {
          const activo = pathname.startsWith(s.href)
          return (
            <Link
              key={s.href}
              href={s.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-2 text-xs font-medium ${
                activo ? 'text-fx-magenta' : 'text-white/70 hover:text-white'
              }`}
            >
              <span className="text-lg">{s.icono}</span>
              {s.label}
            </Link>
          )
        })}
      </nav>
    )
  }

  return (
    <nav className="space-y-1">
      {SECCIONES.map((s) => {
        const activo = pathname.startsWith(s.href)
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
              activo
                ? 'bg-fx-magenta text-white'
                : 'text-white/80 hover:bg-white/10 hover:text-white'
            }`}
          >
            <span>{s.icono}</span>
            {s.label}
          </Link>
        )
      })}
    </nav>
  )
}
