import { Globe, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Marca } from '@/componentes/Marca'
import { Button } from '@/componentes/ui/button'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

type Web = Pick<Tables<'webs'>, 'id' | 'nombre' | 'dominio'>

export default function Portal() {
  const navigate = useNavigate()
  const [webs, setWebs] = useState<Web[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    supabase
      .from('webs')
      .select('id, nombre, dominio')
      .order('nombre')
      .then(({ data, error }) => {
        if (error) setError('No hemos podido cargar tus webs. Prueba a recargar la página.')
        else setWebs(data)
      })
  }, [])

  async function salir() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-5 sm:px-6">
        <Marca />
        <Button variant="ghost" size="tactil" onClick={salir}>
          <LogOut data-icon="inline-start" />
          Salir
        </Button>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-4 pb-16 sm:px-6">
        <h1 className="text-2xl font-semibold text-texto sm:text-3xl">Tu espacio de soporte</h1>
        <p className="mt-2 max-w-2xl text-base text-texto-suave">
          Aquí podrás contarle al asistente qué le pasa a tu web y seguir tus incidencias.
        </p>

        <section aria-labelledby="titulo-webs" className="mt-10">
          <h2 id="titulo-webs" className="text-sm font-semibold tracking-[0.08em] text-texto-tenue uppercase">
            Tus webs
          </h2>

          {error && (
            <p role="alert" className="mt-4 text-[var(--prioridad-urgente)]">
              {error}
            </p>
          )}

          {!error && webs === null && (
            <ul aria-busy="true" aria-label="Cargando tus webs" className="mt-4 grid gap-3 sm:grid-cols-2">
              {[0, 1].map((i) => (
                <li key={i} className="h-[4.5rem] animate-pulse rounded-lg border bg-card" />
              ))}
            </ul>
          )}

          {webs?.length === 0 && <p className="mt-4 text-texto-suave">Todavía no tienes webs dadas de alta.</p>}

          {webs && webs.length > 0 && (
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {webs.map((web) => (
                <li key={web.id} className="flex items-center gap-3 rounded-lg border bg-card p-4 shadow-tarjeta">
                  <span aria-hidden className="grid size-10 place-items-center rounded-full bg-superficie-alta">
                    <Globe className="size-5 text-azul-texto" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-medium text-texto">{web.nombre}</span>
                    <span className="block truncate text-sm text-texto-suave">{web.dominio}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
