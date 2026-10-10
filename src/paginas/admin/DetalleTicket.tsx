import { ArrowLeft, BellRing, Globe, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { Adjuntos } from '@/componentes/Adjuntos'
import { BurbujaMensaje } from '@/componentes/BurbujaMensaje'
import { CuadroRespuesta } from '@/componentes/CuadroRespuesta'
import { EtiquetaTipo, InsigniaEstado, InsigniaPrioridad } from '@/componentes/Insignias'
import { Label } from '@/componentes/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/componentes/ui/select'
import { seguimientoParaAdmin } from '@/dominio/seguimiento'
import {
  NOMBRE_CATEGORIA,
  NOMBRE_ESTADO_ADMIN,
  NOMBRE_PRIORIDAD,
  PRIORIDADES,
  siguientesEstados,
  type Estado,
  type Prioridad,
} from '@/dominio/tickets'
import { useCambiosDelTicket, useConversacion } from '@/lib/en-directo'
import { haceCuanto } from '@/lib/formato'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

type Ticket = Pick<
  Tables<'tickets'>,
  | 'id'
  | 'cliente_id'
  | 'numero'
  | 'titulo'
  | 'descripcion'
  | 'tipo'
  | 'categoria'
  | 'estado'
  | 'estado_desde'
  | 'recordado_en'
  | 'prioridad'
  | 'origen'
  | 'creado_en'
  | 'primera_respuesta_en'
  | 'conversacion_id'
> & { cliente: { nombre: string } | null; web: { nombre: string; dominio: string } | null }

const COLUMNAS =
  'id, cliente_id, numero, titulo, descripcion, tipo, categoria, estado, estado_desde, recordado_en, prioridad, origen, creado_en, primera_respuesta_en, conversacion_id, cliente:clientes(nombre), web:webs!tickets_web_del_cliente(nombre, dominio)'

const fechaHora = new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' })

export default function DetalleTicket() {
  const { id } = useParams()
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [carga, setCarga] = useState<'cargando' | 'listo' | 'no-encontrado' | 'error'>('cargando')
  const [errorCambio, setErrorCambio] = useState<string | null>(null)
  const { mensajes, error: errorMensajes, anadir } = useConversacion(ticket?.conversacion_id ?? null)

  useEffect(() => {
    let vigente = true
    supabase
      .from('tickets')
      .select(COLUMNAS)
      .eq('id', id!)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vigente) return
        if (error) return setCarga('error')
        if (!data) return setCarga('no-encontrado')
        setTicket(data)
        setCarga('listo')
      })
    return () => {
      vigente = false
    }
  }, [id])

  // Lo que cambie en otra pantalla (o el trigger al responder) se ve aquí al momento.
  const alCambiarEnDirecto = useCallback((fila: Tables<'tickets'>) => {
    setTicket((actual) =>
      actual && {
        ...actual,
        estado: fila.estado,
        estado_desde: fila.estado_desde,
        recordado_en: fila.recordado_en,
        prioridad: fila.prioridad,
        primera_respuesta_en: fila.primera_respuesta_en,
        titulo: fila.titulo,
      },
    )
  }, [])
  useCambiosDelTicket(ticket?.id, alCambiarEnDirecto)

  async function cambiar(campos: { estado?: Estado; prioridad?: Prioridad }) {
    if (!ticket) return
    const anterior = ticket
    // Al cambiar de estado empieza a contar el seguimiento automático (el trigger hace lo mismo en la BD).
    const reinicio = campos.estado && campos.estado !== ticket.estado ? { estado_desde: new Date().toISOString(), recordado_en: null } : {}
    setTicket({ ...ticket, ...campos, ...reinicio })
    setErrorCambio(null)
    const { error } = await supabase.from('tickets').update(campos).eq('id', ticket.id)
    if (error) {
      setTicket(anterior)
      setErrorCambio('No se ha podido guardar el cambio. Prueba de nuevo.')
    }
  }

  const seguimiento = ticket && seguimientoParaAdmin(ticket)

  return (
    <div className="grid gap-4">
      <Link to="/admin" className="inline-flex min-h-10 w-fit items-center gap-1.5 text-texto-suave hover:text-texto">
        <ArrowLeft aria-hidden className="size-4" /> Bandeja
      </Link>

      {carga === 'cargando' && <div aria-busy="true" aria-label="Cargando el ticket" className="h-64 animate-pulse rounded-xl border bg-card" />}
      {carga === 'no-encontrado' && <p className="text-texto-suave">Este ticket no existe.</p>}
      {carga === 'error' && (
        <p role="alert" className="text-coral">
          No hemos podido cargar el ticket. Prueba a recargar la página.
        </p>
      )}

      {ticket && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
          <article className="grid content-start gap-4">
            <header className="rounded-xl border bg-card p-5">
              <p className="flex flex-wrap items-center gap-x-1 text-xs text-texto-tenue">
                <EtiquetaTipo tipo={ticket.tipo} numero={ticket.numero} /> · {ticket.cliente?.nombre} · {haceCuanto(ticket.creado_en)}
              </p>
              <h1 className="mt-1 text-xl font-semibold text-balance text-texto">{ticket.titulo}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <InsigniaPrioridad prioridad={ticket.prioridad} />
                <InsigniaEstado estado={ticket.estado} paraAdmin />
                {ticket.web && (
                  <span className="flex items-center gap-1.5 text-xs text-texto-suave">
                    <Globe aria-hidden className="size-3.5" /> {ticket.web.nombre}
                  </span>
                )}
              </div>
              {ticket.origen === 'ia' && (
                <div className="mt-4 rounded-lg border bg-superficie-alta p-4">
                  <p className="flex items-center gap-1.5 text-sm font-medium text-texto">
                    <Sparkles aria-hidden className="size-4 text-agua" /> Resumen del asistente
                  </p>
                  {/* Texto plano: lo escribió el modelo, no es de fiar como HTML */}
                  <p className="mt-2 whitespace-pre-wrap text-texto">{ticket.descripcion}</p>
                </div>
              )}
            </header>

            <div className="rounded-xl border bg-card p-5">
              <Adjuntos
                clienteId={ticket.cliente_id}
                ticketId={ticket.id}
                puedeSubir={ticket.estado !== 'cerrado'}
                conversacionId={ticket.conversacion_id}
                autor="admin"
                version={mensajes?.length}
                onMensaje={(mensaje) => anadir([mensaje])}
              />
            </div>

            <section aria-labelledby="titulo-conversacion" className="rounded-xl border bg-card p-5">
              <h2 id="titulo-conversacion" className="text-base font-medium text-texto">
                Conversación
              </h2>
              {errorMensajes && (
                <p role="alert" className="mt-3 text-coral">
                  No se han podido cargar los mensajes.
                </p>
              )}
              <div role="log" aria-label="Mensajes del ticket" className="mt-4">
                <ol className="grid gap-3">
                  {mensajes?.map((mensaje) => (
                    <BurbujaMensaje key={mensaje.id} mensaje={mensaje} vista="admin" nombreCliente={ticket.cliente?.nombre} />
                  ))}
                </ol>
              </div>
              {ticket.conversacion_id && (
                <div className="mt-5 border-t pt-4">
                  <CuadroRespuesta
                    conversacionId={ticket.conversacion_id}
                    autor="admin"
                    etiqueta="Tu respuesta al cliente"
                    placeholder="Escribe la respuesta… (Ctrl + Intro para enviar)"
                    onEnviado={(mensaje) => anadir([mensaje])}
                  />
                </div>
              )}
            </section>
          </article>

          <aside aria-label="Gestión del ticket" className="grid content-start gap-4">
            <section className="grid gap-4 rounded-xl border bg-card p-5">
              <h2 className="text-base font-medium text-texto">Gestión</h2>
              <div className="grid gap-1.5">
                <Label htmlFor="estado-ticket">Estado</Label>
                <Select value={ticket.estado} onValueChange={(valor) => cambiar({ estado: valor as Estado })} disabled={ticket.estado === 'cerrado'}>
                  <SelectTrigger id="estado-ticket" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {/* Solo el estado actual y los permitidos desde él (dominio/tickets: TRANSICIONES) */}
                    {[ticket.estado, ...siguientesEstados(ticket.estado)].map((estado) => (
                      <SelectItem key={estado} value={estado}>
                        {NOMBRE_ESTADO_ADMIN[estado]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {ticket.estado === 'cerrado' && <p className="text-xs text-texto-suave">Cerrado es definitivo.</p>}
                {seguimiento && (
                  <p className="flex gap-1.5 text-xs text-texto-suave">
                    <BellRing aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                    <span>{seguimiento}</span>
                  </p>
                )}
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="prioridad-ticket">Prioridad</Label>
                <Select value={ticket.prioridad} onValueChange={(valor) => cambiar({ prioridad: valor as Prioridad })}>
                  <SelectTrigger id="prioridad-ticket" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[...PRIORIDADES].reverse().map((prioridad) => (
                      <SelectItem key={prioridad} value={prioridad}>
                        {NOMBRE_PRIORIDAD[prioridad]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p role="alert" className="text-sm text-coral empty:hidden">
                {errorCambio}
              </p>
            </section>

            <section className="rounded-xl border bg-card p-5">
              <h2 className="text-base font-medium text-texto">Datos</h2>
              <dl className="mt-3 grid gap-3">
                <Dato nombre="Cliente">{ticket.cliente?.nombre ?? '—'}</Dato>
                <Dato nombre="Web">{ticket.web ? `${ticket.web.nombre} (${ticket.web.dominio})` : 'Sin indicar'}</Dato>
                <Dato nombre="Categoría">{NOMBRE_CATEGORIA[ticket.categoria]}</Dato>
                <Dato nombre="Origen">{ticket.origen === 'ia' ? 'Abierta por el asistente' : 'Formulario del cliente'}</Dato>
                <Dato nombre="Creada">{fechaHora.format(new Date(ticket.creado_en))}</Dato>
                <Dato nombre="Primera respuesta">
                  {ticket.primera_respuesta_en ? fechaHora.format(new Date(ticket.primera_respuesta_en)) : 'Aún sin responder'}
                </Dato>
              </dl>
            </section>
          </aside>
        </div>
      )}
    </div>
  )
}

function Dato({ nombre, children }: { nombre: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-texto-tenue">{nombre}</dt>
      <dd className="text-texto">{children}</dd>
    </div>
  )
}
