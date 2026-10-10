import { Navigate, Outlet } from 'react-router'
import { IndicadorAsistente } from '@/componentes/Costillas'
import { useSesion } from '@/lib/sesion'

/** Sin sesión, de vuelta a la entrada. RLS protege los datos igualmente: esto es solo navegación. */
export function RutaProtegida() {
  const { cargando, sesion } = useSesion()

  if (cargando) {
    return (
      <div role="status" className="grid min-h-svh place-items-center">
        <div className="flex flex-col items-center gap-3 text-texto-suave">
          <IndicadorAsistente estado="pensando" />
          Cargando…
        </div>
      </div>
    )
  }

  if (!sesion) return <Navigate to="/" replace />
  return <Outlet />
}
