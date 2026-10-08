import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

type EstadoSesion = { cargando: boolean; sesion: Session | null }

const ContextoSesion = createContext<EstadoSesion>({ cargando: true, sesion: null })

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [estado, setEstado] = useState<EstadoSesion>({ cargando: true, sesion: null })

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEstado({ cargando: false, sesion: data.session }))
    const { data } = supabase.auth.onAuthStateChange((_evento, sesion) => setEstado({ cargando: false, sesion }))
    return () => data.subscription.unsubscribe()
  }, [])

  return <ContextoSesion value={estado}>{children}</ContextoSesion>
}

export function useSesion() {
  return useContext(ContextoSesion)
}
