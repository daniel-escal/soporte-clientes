import { ArrowLeft, Globe } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { BurbujaMensaje } from '@/componentes/BurbujaMensaje'
import { CuadroRespuesta } from '@/componentes/CuadroRespuesta'
import { EtiquetaTipo, InsigniaEstado } from '@/componentes/Insignias'
import { Marca } from '@/componentes/Marca'
import { useCambiosDelTicket, useConversacion } from '@/lib/en-directo'
import { haceCuanto } from '@/lib/formato'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

// Vista del cliente: sin prioridad (es triaje interno; docs/SPEC.md).
type Solicitud = Pick<Tables<'tickets'>, 'id' | 'numero' | 'titulo' | 'tipo' | 'estado' | 'creado_en' | 'conversacion_id'> & {
  web: { nombre: string } | null
}

export default function DetalleSolicitud() {
  const { id } = useParams()
  const [solicitud, setSolicitud] = useState<Solicitud | null>(null)
  const [estado, setEstado] = useState<'cargando' | 'listo' | 'no-encontrada' | 'error'>('cargando')
  // Las respuestas de Daniel llegan solas (Realtime con RLS: solo lo de sus conversaciones).
  const { mensajes, error: errorMensajes, anadir } = useConversacion(solicitud?.conversacion_id ?? null)

  useEffect(() => {
    let vigente = true
    supabase
      .from('tickets')
      .select('id, numero, titulo, tipo, estado, creado_en, conversacion_id, web:webs!tickets_web_del_cliente(nombre)')
      .eq('id', id!)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) return setEstado('error')
        if (!data) return setEstado('no-encontrada')
        setSolicitud(data)
        setEstado('listo')
      })
    return () => {
      vigente = false
    }
  }, [id])

  // Si Daniel cambia el estado, se ve sin recargar.
  const alCambiar = useCallback((fila: Tables<'tickets'>) => {
    setSolicitud((actual) => actual && { ...actual, estado: fila.estado, titulo: fila.titulo })
  }, [])
  useCambiosDelTicket(solicitud?.id, alCambiar)

  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-5 sm:px-6">
        <Marca />
      </header>

      <main className="mx-auto max-w-3xl px-4 pt-2 pb-16 sm:px-6">
        <Link to="/portal" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-texto-suave hover:text-texto">
          <ArrowLeft aria-hidden className="size-4" /> Volver a tu espacio
        </Link>

        {estado === 'cargando' && <div aria-busy="true" aria-label="Cargando la solicitud" className="mt-4 h-40 animate-pulse rounded-lg border bg-card" />}

        {estado === 'no-encontrada' && (
          <p className="mt-6 text-texto-suave">No hemos encontrado esta solicitud. Puede que el enlace no sea correcto.</p>
        )}

        {estado === 'error' && (
          <p role="alert" className="mt-6 text-[var(--prioridad-urgente)]">
            No hemos podido cargar la solicitud. Prueba a recargar la página.
          </p>
        )}

        {estado === 'listo' && solicitud && (
          <article className="mt-4">
            <p className="flex flex-wrap items-center gap-x-1 text-xs text-texto-tenue">
              <EtiquetaTipo tipo={solicitud.tipo} numero={solicitud.numero} /> · abierta {haceCuanto(solicitud.creado_en)}
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-balance text-texto">{solicitud.titulo}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <InsigniaEstado estado={solicitud.estado} />
              {solicitud.web && (
                <span className="flex items-center gap-1.5 text-xs text-texto-suave">
                  <Globe aria-hidden className="size-3.5" /> {solicitud.web.nombre}
                </span>
              )}
            </div>

            <section aria-labelledby="titulo-conversacion" className="mt-8">
              <h2 id="titulo-conversacion" className="text-sm font-semibold tracking-[0.08em] text-texto-tenue uppercase">
                Conversación
              </h2>
              {errorMensajes && (
                <p role="alert" className="mt-3 text-[var(--prioridad-urgente)]">
                  No se han podido cargar los mensajes. Prueba a recargar la página.
                </p>
              )}
              <div role="log" aria-label="Mensajes de la solicitud" className="mt-4">
                <ol className="grid gap-3">
                  {mensajes?.map((mensaje) => (
                    <BurbujaMensaje key={mensaje.id} mensaje={mensaje} />
                  ))}
                </ol>
              </div>

              {solicitud.estado === 'cerrado' ? (
                <p className="mt-6 text-sm text-texto-suave">Esta solicitud está cerrada. Si necesitas algo más, cuéntaselo al asistente.</p>
              ) : (
                solicitud.conversacion_id && (
                  <div className="mt-6 grid gap-2 rounded-xl border bg-card p-4">
                    <p className="text-sm text-texto-suave">Daniel te responderá aquí mismo. Si quieres añadir algo, escríbelo:</p>
                    <CuadroRespuesta
                      conversacionId={solicitud.conversacion_id}
                      autor="cliente"
                      etiqueta="Tu mensaje para Daniel"
                      placeholder="Escribe aquí…"
                      onEnviado={(mensaje) => anadir([mensaje])}
                    />
                  </div>
                )
              )}
            </section>
          </article>
        )}
      </main>
    </div>
  )
}
