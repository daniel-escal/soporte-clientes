import { BookOpenText, Inbox, LogOut } from 'lucide-react'
import { Suspense } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router'
import { Marca } from '@/componentes/Marca'
import { Button } from '@/componentes/ui/button'
import { useSesion } from '@/lib/sesion'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

// La bandeja incluye el detalle de cada ticket; la FAQ es aparte (un NavLink sin "end" marcaría las dos).
const SECCIONES = [
  { a: '/admin', nombre: 'Bandeja', icono: Inbox, activa: (ruta: string) => ruta === '/admin' || ruta.startsWith('/admin/tickets') },
  { a: '/admin/faq', nombre: 'Base de conocimiento', icono: BookOpenText, activa: (ruta: string) => ruta.startsWith('/admin/faq') },
] as const

/** Marco del panel (cargado aparte del portal del cliente). Texto base de 14 px: denso, como la referencia. */
export default function Panel() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { sesion } = useSesion()

  async function salir() {
    await supabase.auth.signOut()
    navigate('/admin/entrar', { replace: true })
  }

  return (
    <div className="min-h-svh text-sm">
      <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
        <Link to="/admin" className="flex items-center gap-3" aria-label="Panel de soporte: bandeja">
          <Marca />
          <span className="rounded-full bg-superficie-alta px-2.5 py-0.5 text-xs font-medium text-texto-suave">Panel</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="hidden truncate text-texto-suave sm:inline">{sesion?.user.email}</span>
          <Button variant="ghost" onClick={salir} className="h-10">
            <LogOut data-icon="inline-start" />
            Salir
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[13rem_minmax(0,1fr)]">
        <nav aria-label="Secciones del panel">
          <ul className="flex gap-2 overflow-x-auto lg:flex-col">
            {SECCIONES.map(({ a, nombre, icono: Icono, activa }) => {
              const esActiva = activa(pathname)
              return (
                <li key={a}>
                  <Link
                    to={a}
                    aria-current={esActiva ? 'page' : undefined}
                    className={cn(
                      'relative flex min-h-10 items-center gap-2.5 overflow-hidden rounded-lg px-3 whitespace-nowrap text-texto-suave transition-colors hover:bg-superficie-alta hover:text-texto',
                      // Franja de degradado en la sección activa (ESTETICA: panel activo).
                      esActiva && 'bg-card text-texto before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-linear-to-b before:from-azul before:to-violeta',
                    )}
                  >
                    <Icono aria-hidden className="size-4" />
                    {nombre}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        <main className="min-w-0">
          <Suspense fallback={<div aria-busy="true" aria-label="Cargando" className="h-64 animate-pulse rounded-xl border bg-card" />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  )
}
