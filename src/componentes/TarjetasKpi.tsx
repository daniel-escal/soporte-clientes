import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { calcularKpi, formatoDuracion, type DatosKpi } from '@/dominio/kpi'
import { NOMBRE_CATEGORIA } from '@/dominio/tickets'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

/** tickets es null mientras carga la bandeja: entonces no se enseña ningún número (un 0 provisional parece un dato). */
type Props = { tickets: DatosKpi['tickets'] | null }

/** KPI del panel: tarjetas pequeñas (como en la referencia) que se recalculan con la bandeja en directo. */
export function TarjetasKpi({ tickets }: Props) {
  // null mientras carga: un 0 provisional se leería como un dato real ("— de 0 conversaciones")
  const [conversaciones, setConversaciones] = useState<DatosKpi['conversaciones'] | null>(null)
  const totalTickets = tickets?.length ?? 0

  // Las conversaciones cambian al escalar (llega un ticket) o al resolverse: se releen entonces y cada minuto.
  useEffect(() => {
    let vigente = true
    const leer = () =>
      supabase
        .from('conversaciones')
        .select('estado')
        .then(({ data }) => {
          if (vigente && data) setConversaciones(data)
        })
    leer()
    const intervalo = setInterval(leer, 60_000)
    return () => {
      vigente = false
      clearInterval(intervalo)
    }
  }, [totalTickets])

  const kpi = useMemo(() => calcularKpi({ tickets: tickets ?? [], conversaciones: conversaciones ?? [] }), [tickets, conversaciones])
  const cargando = tickets === null

  return (
    <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tarjeta titulo="Pendientes" valor={cargando ? <Cargando /> : kpi.abiertos} detalle="abiertos, en curso o esperando" />
      <Tarjeta
        titulo="Urgentes"
        valor={cargando ? <Cargando /> : kpi.urgentes}
        detalle="pendientes con prioridad urgente"
        alerta={kpi.urgentes > 0}
      />
      <Tarjeta
        titulo="Resuelto por la IA"
        valor={cargando || conversaciones === null ? <Cargando /> : kpi.resueltoPorIa === null ? '—' : `${kpi.resueltoPorIa} %`}
        detalle={cargando || conversaciones === null ? 'Calculando…' : `de ${kpi.conversacionesTerminadas} conversaciones terminadas`}
        progreso={cargando || conversaciones === null ? undefined : (kpi.resueltoPorIa ?? undefined)}
      />
      <Tarjeta
        titulo="Primera respuesta"
        valor={cargando ? <Cargando /> : kpi.primeraRespuestaMin === null ? '—' : formatoDuracion(kpi.primeraRespuestaMin)}
        detalle="de media, desde que llega"
      />
    </section>
  )
}

function Tarjeta({
  titulo,
  valor,
  detalle,
  alerta = false,
  progreso,
}: {
  titulo: string
  valor: ReactNode
  detalle: string
  alerta?: boolean
  progreso?: number
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-tarjeta">
      <p className="text-xs text-texto-suave">{titulo}</p>
      <p className={cn('cifras mt-1 text-2xl font-semibold', alerta ? 'text-[var(--prioridad-urgente)]' : 'text-texto')}>{valor}</p>
      {progreso !== undefined && (
        <div aria-hidden className="mt-2 h-1.5 overflow-hidden rounded-full bg-superficie-alta">
          <div className="degradado-marca h-full rounded-full" style={{ width: `${progreso}%` }} />
        </div>
      )}
      <p className="mt-1.5 text-xs text-texto-tenue">{detalle}</p>
    </div>
  )
}

/** Hueco del valor mientras llega el dato. */
function Cargando() {
  return <span aria-label="Cargando" className="inline-block h-7 w-16 animate-pulse rounded-md bg-superficie-alta align-middle" />
}

/** Tickets por categoría en barras horizontales con el degradado de marca. */
export function TicketsPorCategoria({ tickets }: Props) {
  const { porCategoria } = useMemo(() => calcularKpi({ tickets: tickets ?? [], conversaciones: [] }), [tickets])
  const maximo = porCategoria[0]?.total ?? 0

  return (
    <section aria-labelledby="titulo-categorias" className="rounded-xl border bg-card p-5 shadow-tarjeta">
      <h2 id="titulo-categorias" className="text-xs font-semibold tracking-[0.08em] text-texto-tenue uppercase">
        Tickets por categoría
      </h2>
      {tickets === null ? (
        <div aria-busy="true" aria-label="Cargando" className="mt-4 grid gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-8 animate-pulse rounded-md bg-superficie-alta" />
          ))}
        </div>
      ) : porCategoria.length === 0 ? (
        <p className="mt-3 text-texto-suave">Aún no hay tickets.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {porCategoria.map(({ categoria, total }) => (
            <li key={categoria} className="grid gap-1">
              <span className="flex justify-between gap-2 text-xs">
                <span className="text-texto-suave">{NOMBRE_CATEGORIA[categoria]}</span>
                <span className="cifras text-texto">{total}</span>
              </span>
              <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-superficie-alta">
                <span className="degradado-marca block h-full rounded-full" style={{ width: `${(total / maximo) * 100}%` }} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
