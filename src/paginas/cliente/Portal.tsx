import { Globe, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { FormularioIncidencia } from '@/componentes/FormularioIncidencia'
import { COLUMNAS_INCIDENCIA, ListaIncidencias, type FilaIncidencia } from '@/componentes/ListaIncidencias'
import { Marca } from '@/componentes/Marca'
import { Button } from '@/componentes/ui/button'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

type Web = Pick<Tables<'webs'>, 'id' | 'nombre' | 'dominio'>

export default function Portal() {
  const navigate = useNavigate()
  const [webs, setWebs] = useState<Web[] | null>(null)
  const [incidencias, setIncidencias] = useState<FilaIncidencia[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('webs').select('id, nombre, dominio').order('nombre'),
      supabase.from('tickets').select(COLUMNAS_INCIDENCIA).order('creado_en', { ascending: false }),
    ]).then(([respuestaWebs, respuestaIncidencias]) => {
      if (respuestaWebs.error || respuestaIncidencias.error) {
        setError('No hemos podido cargar tus datos. Prueba a recargar la página.')
        return
      }
      setWebs(respuestaWebs.data)
      setIncidencias(respuestaIncidencias.data)
    })
  }, [])

  function alCrear(ticket: Tables<'tickets'>) {
    const web = webs?.find((w) => w.id === ticket.web_id)
    setIncidencias((actuales) => [{ ...ticket, web: web ? { nombre: web.nombre } : null }, ...(actuales ?? [])])
  }

  async function salir() {
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const cargando = !error && (webs === null || incidencias === null)

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
        <p className="mt-2 max-w-2xl text-base text-texto-suave">Cuéntanos qué le pasa a tu web y sigue aquí tus incidencias.</p>

        {error && (
          <p role="alert" className="mt-6 text-[var(--prioridad-urgente)]">
            {error}
          </p>
        )}

        {cargando && (
          <div aria-busy="true" aria-label="Cargando" className="mt-10 grid gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-[4.5rem] animate-pulse rounded-lg border bg-card" />
            ))}
          </div>
        )}

        {webs && incidencias && (
          <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_18rem]">
            <section aria-labelledby="titulo-incidencias">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 id="titulo-incidencias" className="text-lg font-semibold text-texto">
                  Tus incidencias
                </h2>
                <FormularioIncidencia webs={webs} onCreada={alCrear} />
              </div>
              <div className="mt-4">
                {incidencias.length === 0 ? (
                  <p className="rounded-lg border border-dashed p-6 text-texto-suave">
                    No tienes incidencias. Si algo no va bien en tu web, ábrela y te respondemos aquí.
                  </p>
                ) : (
                  <ListaIncidencias incidencias={incidencias} />
                )}
              </div>
            </section>

            <section aria-labelledby="titulo-webs">
              <h2 id="titulo-webs" className="text-lg font-semibold text-texto">
                Tus webs
              </h2>
              {webs.length === 0 ? (
                <p className="mt-4 text-texto-suave">Todavía no tienes webs dadas de alta.</p>
              ) : (
                <ul className="mt-4 grid gap-2">
                  {webs.map((web) => (
                    <li key={web.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie-alta">
                        <Globe className="size-4 text-azul-texto" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-texto">{web.nombre}</span>
                        <span className="block truncate text-xs text-texto-suave">{web.dominio}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
