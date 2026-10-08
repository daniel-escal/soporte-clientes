import { useEffect, useState } from 'react'
import { Link, Navigate, Outlet } from 'react-router'
import { OrbeAsistente } from '@/componentes/OrbeAsistente'
import { useSesion } from '@/lib/sesion'
import { supabase } from '@/lib/supabase'

/**
 * Solo el administrador entra en /admin. Es navegación: aunque alguien se saltase esta guardia,
 * RLS (privado.es_admin) no le devolvería datos de otros clientes ni le dejaría cambiar nada.
 */
export function RutaAdmin() {
  const { cargando, sesion } = useSesion()
  const [rol, setRol] = useState<{ usuario: string; esAdmin: boolean } | null>(null)
  const usuarioId = sesion?.user.id

  useEffect(() => {
    if (!usuarioId) return
    let vigente = true
    supabase
      .from('perfiles')
      .select('rol')
      .eq('id', usuarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (vigente) setRol({ usuario: usuarioId, esAdmin: data?.rol === 'admin' })
      })
    return () => {
      vigente = false
    }
  }, [usuarioId])

  if (cargando || (usuarioId && rol?.usuario !== usuarioId)) return <CargandoPanel />
  if (!sesion) return <Navigate to="/admin/entrar" replace />
  if (!rol?.esAdmin) return <SinAcceso />
  return <Outlet />
}

export function CargandoPanel() {
  return (
    <div role="status" className="grid min-h-svh place-items-center">
      <div className="flex flex-col items-center gap-3 text-texto-suave">
        <OrbeAsistente estado="pensando" className="size-14" />
        Cargando…
      </div>
    </div>
  )
}

function SinAcceso() {
  return (
    <main className="mx-auto grid min-h-svh max-w-md place-content-center gap-3 px-4 text-center">
      <h1 className="text-xl font-semibold text-texto">Esta zona es solo para el administrador</h1>
      <p className="text-texto-suave">Tu cuenta no tiene acceso al panel.</p>
      <p className="flex justify-center gap-4 text-sm">
        <Link to="/portal" className="text-azul-texto hover:underline">
          Ir a tu espacio
        </Link>
        <Link to="/admin/entrar" className="text-azul-texto hover:underline">
          Entrar con otra cuenta
        </Link>
      </p>
    </main>
  )
}
