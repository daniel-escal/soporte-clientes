import { ChevronRight, Globe, Sparkles } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router'
import { FiltrosBandeja } from '@/componentes/FiltrosBandeja'
import { EtiquetaTipo, InsigniaEstado, InsigniaPrioridad } from '@/componentes/Insignias'
import { TarjetasKpi, TicketsPorCategoria } from '@/componentes/TarjetasKpi'
import { FILTROS_INICIALES, clientesDeLaBandeja, filtrarBandeja, ordenarBandeja, type TicketBandeja } from '@/dominio/bandeja'
import { haceCuanto } from '@/lib/formato'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'
import { cn } from '@/lib/utils'

type FilaBandeja = TicketBandeja &
  Pick<Tables<'tickets'>, 'titulo' | 'origen' | 'categoria' | 'primera_respuesta_en'> & { web: { nombre: string } | null }

// El admin ve todos los tickets: lo permite RLS (privado.es_admin), no esta consulta.
const COLUMNAS =
  'id, numero, titulo, tipo, categoria, estado, prioridad, origen, creado_en, primera_respuesta_en, cliente:clientes(id, nombre), web:webs!tickets_web_del_cliente(nombre)'
const DESTACADO_MS = 12_000

export default function Bandeja() {
  const [tickets, setTickets] = useState<FilaBandeja[] | null>(null)
  const [error, setError] = useState(false)
  const [filtros, setFiltros] = useState(FILTROS_INICIALES)
  const [nuevos, setNuevos] = useState<ReadonlySet<string>>(new Set())
  const [aviso, setAviso] = useState('')
  // null mientras se conecta: no es lo mismo "conectando" que "sin conexión"
  const [enDirecto, setEnDirecto] = useState<boolean | null>(null)

  useEffect(() => {
    let vigente = true
    supabase
      .from('tickets')
      .select(COLUMNAS)
      .then(({ data, error: errorCarga }) => {
        if (!vigente) return
        if (errorCarga) setError(true)
        else setTickets(data)
      })

    // Tiempo real: lo nuevo entra destacado; los cambios de estado o prioridad se aplican al momento.
    const canal = supabase
      .channel('bandeja-admin')
      .on<Tables<'tickets'>>('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, async ({ new: fila }) => {
        const { data } = await supabase.from('tickets').select(COLUMNAS).eq('id', fila.id).maybeSingle()
        if (!vigente || !data) return
        setTickets((actuales) => [data, ...(actuales ?? []).filter((t) => t.id !== data.id)])
        setNuevos((actuales) => new Set(actuales).add(data.id))
        setAviso(`Nueva ${data.tipo === 'peticion' ? 'petición' : 'incidencia'} #${data.numero}: ${data.titulo}`)
        setTimeout(() => {
          setNuevos((actuales) => {
            const siguientes = new Set(actuales)
            siguientes.delete(data.id)
            return siguientes
          })
        }, DESTACADO_MS)
      })
      .on<Tables<'tickets'>>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets' }, ({ new: fila }) => {
        setTickets((actuales) =>
          actuales?.map((t) =>
            t.id === fila.id
              ? {
                  ...t,
                  titulo: fila.titulo,
                  tipo: fila.tipo,
                  categoria: fila.categoria,
                  estado: fila.estado,
                  prioridad: fila.prioridad,
                  primera_respuesta_en: fila.primera_respuesta_en,
                }
              : t,
          ) ?? null,
        )
      })
      .subscribe((estado) => {
        // Al desmontar, el propio cierre del canal no es una caída de la conexión
        if (!vigente) return
        if (estado === 'SUBSCRIBED') setEnDirecto(true)
        else if (estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') setEnDirecto(false)
      })

    return () => {
      vigente = false
      supabase.removeChannel(canal)
    }
  }, [])

  const clientes = useMemo(() => clientesDeLaBandeja(tickets ?? []), [tickets])
  const visibles = useMemo(() => ordenarBandeja(filtrarBandeja(tickets ?? [], filtros)), [tickets, filtros])

  return (
    <div className="grid gap-4">
      <TarjetasKpi tickets={tickets} />
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 xl:grid-cols-[minmax(0,1fr)_16rem]">
        <section aria-labelledby="titulo-bandeja" className="rounded-xl border bg-card">
          <header className="grid gap-4 border-b p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 id="titulo-bandeja" aria-label={tickets ? `Bandeja, ${visibles.length} tickets` : 'Bandeja'} className="text-lg font-semibold text-texto">
                Bandeja{' '}
                {tickets && <span className="cifras ml-1 text-sm font-normal text-texto-suave">{visibles.length}</span>}
              </h1>
              <span className="flex items-center gap-2 text-xs text-texto-suave">
                <span aria-hidden className={cn('size-2 rounded-full', enDirecto ? 'bg-agua' : enDirecto === null ? 'animate-pulse bg-texto-tenue' : 'bg-coral')} />
                {enDirecto ? 'En directo' : enDirecto === null ? 'Conectando…' : 'Sin conexión en directo'}
              </span>
            </div>
            <FiltrosBandeja filtros={filtros} clientes={clientes} onCambio={setFiltros} />
          </header>

          {/* Anuncia lo que llega en directo a quien usa lector de pantalla */}
          <p aria-live="polite" className="sr-only">
            {aviso}
          </p>

          {error && (
            <p role="alert" className="p-5 text-coral">
              No hemos podido cargar la bandeja. Prueba a recargar la página.
            </p>
          )}
          {!error && !tickets && <div aria-busy="true" aria-label="Cargando la bandeja" className="m-5 h-40 animate-pulse rounded-lg bg-superficie-alta" />}
          {tickets && visibles.length === 0 && <p className="p-5 text-texto-suave">No hay nada con estos filtros.</p>}

          {visibles.length > 0 && (
            <ul className="grid grid-cols-[minmax(0,1fr)] divide-y">
              {visibles.map((ticket) => (
                <FilaTicket key={ticket.id} ticket={ticket} nuevo={nuevos.has(ticket.id)} />
              ))}
            </ul>
          )}
        </section>
        <TicketsPorCategoria tickets={tickets} />
      </div>
    </div>
  )
}

function FilaTicket({ ticket, nuevo }: { ticket: FilaBandeja; nuevo: boolean }) {
  return (
    <li>
      <Link
        to={`/admin/tickets/${ticket.id}`}
        className={cn(
          'group grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3 px-4 py-3 transition-colors hover:bg-superficie-alta sm:px-5',
          // Lo recién llegado se distingue un rato por la superficie y la etiqueta "Nuevo" (sin brillos: ESTETICA).
          nuevo && 'bg-superficie-alta',
        )}
      >
        <Avatar nombre={ticket.cliente?.nombre ?? '?'} />
        <span className="min-w-0">
          <span className="flex flex-wrap items-center gap-x-1 text-xs text-texto-tenue">
            {/* --primary es el agua y el texto va en --sobre-agua (10,6:1) */}
            {nuevo && <span className="mr-1 rounded-full bg-primary px-1.5 font-semibold text-primary-foreground">Nuevo</span>}
            <EtiquetaTipo tipo={ticket.tipo} numero={ticket.numero} /> · {ticket.cliente?.nombre} · {haceCuanto(ticket.creado_en)}
          </span>
          <span className="mt-0.5 block truncate font-medium text-texto">{ticket.titulo}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-texto-suave">
            {ticket.web && (
              <span className="flex items-center gap-1">
                <Globe aria-hidden className="size-3.5" /> {ticket.web.nombre}
              </span>
            )}
            {ticket.origen === 'ia' && (
              <span className="flex items-center gap-1">
                <Sparkles aria-hidden className="size-3.5 text-agua" /> Abierta por el asistente
              </span>
            )}
          </span>
        </span>
        <span className="hidden flex-col items-end gap-1.5 sm:flex">
          <InsigniaPrioridad prioridad={ticket.prioridad} />
          <InsigniaEstado estado={ticket.estado} paraAdmin />
        </span>
        <ChevronRight aria-hidden className="size-4 text-texto-tenue transition-transform group-hover:translate-x-0.5" />
        <span className="col-span-full flex flex-wrap gap-1.5 sm:hidden">
          <InsigniaPrioridad prioridad={ticket.prioridad} />
          <InsigniaEstado estado={ticket.estado} paraAdmin />
        </span>
      </Link>
    </li>
  )
}

/** Iniciales del cliente en un círculo. */
function Avatar({ nombre }: { nombre: string }) {
  const iniciales = nombre
    .split(/\s+/)
    .filter((palabra) => /^[\p{L}\d]/u.test(palabra))
    .slice(0, 2)
    .map((palabra) => palabra[0]!.toUpperCase())
    .join('')
  return (
    <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-superficie-alta text-xs font-semibold text-texto-suave">
      {iniciales || '?'}
    </span>
  )
}
