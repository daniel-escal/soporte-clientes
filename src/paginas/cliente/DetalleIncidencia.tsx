import { ArrowLeft, Globe } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { BurbujaMensaje } from '@/componentes/BurbujaMensaje'
import { InsigniaEstado, InsigniaPrioridad } from '@/componentes/Insignias'
import { Marca } from '@/componentes/Marca'
import { haceCuanto } from '@/lib/formato'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

type Ticket = Pick<
  Tables<'tickets'>,
  'id' | 'numero' | 'titulo' | 'estado' | 'prioridad' | 'creado_en' | 'conversacion_id'
> & { web: { nombre: string } | null }
type Mensaje = Pick<Tables<'mensajes'>, 'id' | 'autor' | 'contenido' | 'creado_en'>

export default function DetalleIncidencia() {
  const { id } = useParams()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'no-encontrada' | 'error'>('cargando')

  useEffect(() => {
    async function cargar() {
      const { data, error } = await supabase
        .from('tickets')
        .select('id, numero, titulo, estado, prioridad, creado_en, conversacion_id, web:webs!tickets_web_del_cliente(nombre)')
        .eq('id', id!)
        .maybeSingle()
      if (error) return setEstado('error')
      if (!data) return setEstado('no-encontrada')
      setTicket(data)
      if (data.conversacion_id) {
        const respuesta = await supabase
          .from('mensajes')
          .select('id, autor, contenido, creado_en')
          .eq('conversacion_id', data.conversacion_id)
          .order('creado_en')
        if (respuesta.error) return setEstado('error')
        setMensajes(respuesta.data)
      }
      setEstado('listo')
    }
    cargar()
  }, [id])

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Marca />
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-2 pb-16 sm:px-6">
        <Link to="/portal" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-texto-suave hover:text-texto">
          <ArrowLeft aria-hidden className="size-4" /> Tus incidencias
        </Link>

        {estado === 'cargando' && <div aria-busy="true" aria-label="Cargando la incidencia" className="mt-4 h-40 animate-pulse rounded-lg border bg-card" />}

        {estado === 'no-encontrada' && (
          <p className="mt-6 text-texto-suave">No hemos encontrado esta incidencia. Puede que el enlace no sea correcto.</p>
        )}

        {estado === 'error' && (
          <p role="alert" className="mt-6 text-[var(--prioridad-urgente)]">
            No hemos podido cargar la incidencia. Prueba a recargar la página.
          </p>
        )}

        {estado === 'listo' && ticket && (
          <article className="mt-4">
            <p className="cifras text-xs text-texto-tenue">
              Incidencia #{ticket.numero} · abierta {haceCuanto(ticket.creado_en)}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-balance text-texto">{ticket.titulo}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <InsigniaEstado estado={ticket.estado} />
              <InsigniaPrioridad prioridad={ticket.prioridad} />
              {ticket.web && (
                <span className="flex items-center gap-1.5 text-xs text-texto-suave">
                  <Globe aria-hidden className="size-3.5" /> {ticket.web.nombre}
                </span>
              )}
            </div>

            <section aria-labelledby="titulo-conversacion" className="mt-8">
              <h2 id="titulo-conversacion" className="text-sm font-semibold tracking-[0.08em] text-texto-tenue uppercase">
                Conversación
              </h2>
              <ol className="mt-4 grid gap-3">
                {mensajes.map((mensaje) => (
                  <BurbujaMensaje key={mensaje.id} mensaje={mensaje} />
                ))}
              </ol>
              <p className="mt-6 text-sm text-texto-suave">Daniel te responderá en esta misma conversación.</p>
            </section>
          </article>
        )}
      </main>
    </div>
  )
}

