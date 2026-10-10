import { Globe, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ChatAsistente } from '@/componentes/ChatAsistente'
import { FormularioSolicitud } from '@/componentes/FormularioSolicitud'
import { COLUMNAS_SOLICITUD, ListaSolicitudes, type FilaSolicitud } from '@/componentes/ListaSolicitudes'
import { Marca } from '@/componentes/Marca'
import { Button } from '@/componentes/ui/button'
import { guardarConversacion } from '@/lib/asistente'
import { useSesion } from '@/lib/sesion'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

type Web = Pick<Tables<'webs'>, 'id' | 'nombre' | 'dominio'>
type SolicitudNueva = Pick<Tables<'tickets'>, 'id' | 'numero' | 'titulo' | 'tipo' | 'estado' | 'creado_en' | 'web_id'>

export default function Portal() {
  const navigate = useNavigate()
  const { sesion } = useSesion()
  const [webs, setWebs] = useState<Web[] | null>(null)
  const [solicitudes, setSolicitudes] = useState<FilaSolicitud[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      supabase.from('webs').select('id, nombre, dominio').order('nombre'),
      supabase.from('tickets').select(COLUMNAS_SOLICITUD).order('creado_en', { ascending: false }),
    ]).then(([respuestaWebs, respuestaSolicitudes]) => {
      if (respuestaWebs.error || respuestaSolicitudes.error) {
        setError('No hemos podido cargar tus datos. Prueba a recargar la página.')
        return
      }
      setWebs(respuestaWebs.data)
      setSolicitudes(respuestaSolicitudes.data)
    })
  }, [])

  // Solicitudes nuevas (del asistente o del formulario): arriba de la lista, sin recargar.
  function alCrear(ticket: SolicitudNueva) {
    const web = webs?.find((w) => w.id === ticket.web_id)
    const fila: FilaSolicitud = { ...ticket, web: web ? { nombre: web.nombre } : null }
    setSolicitudes((actuales) => [fila, ...(actuales ?? []).filter((solicitud) => solicitud.id !== ticket.id)])
  }

  async function salir() {
    if (sesion) guardarConversacion(sesion.user.id, null)
    await supabase.auth.signOut()
    navigate('/', { replace: true })
  }

  const cargando = !error && (webs === null || solicitudes === null)

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
          Cuéntanos qué le pasa a tu web o qué quieres cambiar, y sigue aquí cómo va.
        </p>

        {error && (
          <p role="alert" className="mt-6 text-coral">
            {error}
          </p>
        )}

        {cargando && (
          <div aria-busy="true" aria-label="Cargando" className="mt-8 grid gap-3">
            <div className="h-72 animate-pulse rounded-xl border bg-card" />
            {[0, 1].map((i) => (
              <div key={i} className="h-[4.5rem] animate-pulse rounded-lg border bg-card" />
            ))}
          </div>
        )}

        {webs && solicitudes && (
          <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
            <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-10">
              {sesion && <ChatAsistente usuarioId={sesion.user.id} webs={webs} onSolicitudCreada={alCrear} />}

              <section aria-labelledby="titulo-solicitudes">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 id="titulo-solicitudes" className="text-lg font-semibold text-texto">
                    Tus incidencias y peticiones
                  </h2>
                  <FormularioSolicitud webs={webs} onCreada={alCrear} varianteBoton="outline" />
                </div>
                <div className="mt-4">
                  {solicitudes.length === 0 ? (
                    <p className="rounded-lg border border-dashed p-6 text-texto-suave">
                      Aún no tienes incidencias ni peticiones. Si algo no va bien o quieres un cambio, cuéntaselo al asistente.
                    </p>
                  ) : (
                    <ListaSolicitudes solicitudes={solicitudes} />
                  )}
                </div>
              </section>
            </div>

            <section aria-labelledby="titulo-webs">
              <h2 id="titulo-webs" className="text-lg font-semibold text-texto">
                Tus webs
              </h2>
              {webs.length === 0 ? (
                <p className="mt-4 text-texto-suave">Todavía no tienes webs dadas de alta.</p>
              ) : (
                <ul className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-2">
                  {webs.map((web) => (
                    <li key={web.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie-alta">
                        <Globe className="size-4 text-texto-suave" />
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
