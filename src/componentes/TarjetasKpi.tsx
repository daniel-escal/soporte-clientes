import { useEffect, useMemo, useState } from 'react'
import { calcularKpi, formatoDuracion, type DatosKpi } from '@/dominio/kpi'
import { NOMBRE_CATEGORIA } from '@/dominio/tickets'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

type Props = { tickets: DatosKpi['tickets'] }

/** KPI del panel: tarjetas pequeñas (como en la referencia) que se recalculan con la bandeja en directo. */
export function TarjetasKpi({ tickets }: Props) {
  const [conversaciones, setConversaciones] = useState<DatosKpi['conversaciones']>([])
  const totalTickets = tickets.length

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

  const kpi = useMemo(() => calcularKpi({ tickets, conversaciones }), [tickets, conversaciones])

  return (
    <section aria-label="Indicadores" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Tarjeta titulo="Pendientes" valor={kpi.abiertos} detalle="abiertos, en curso o esperando" />
      <Tarjeta titulo="Urgentes" valor={kpi.urgentes} detalle="pendientes con prioridad urgente" alerta={kpi.urgentes > 0} />
      <Tarjeta
        titulo="Resuelto por la IA"
        valor={kpi.resueltoPorIa === null ? '—' : `${kpi.resueltoPorIa} %`}
        detalle={`de ${kpi.conversacionesTerminadas} conversaciones terminadas`}
        progreso={kpi.resueltoPorIa ?? undefined}
      />
      <Tarjeta
        titulo="Primera respuesta"
        valor={kpi.primeraRespuestaMin === null ? '—' : formatoDuracion(kpi.primeraRespuestaMin)}
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
  valor: number | string
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

/** Tickets por categoría en barras horizontales con el degradado de marca. */
export function TicketsPorCategoria({ tickets }: Props) {
  const { porCategoria } = useMemo(() => calcularKpi({ tickets, conversaciones: [] }), [tickets])
  const maximo = porCategoria[0]?.total ?? 0

  return (
    <section aria-labelledby="titulo-categorias" className="rounded-xl border bg-card p-5 shadow-tarjeta">
      <h2 id="titulo-categorias" className="text-xs font-semibold tracking-[0.08em] text-texto-tenue uppercase">
        Tickets por categoría
      </h2>
      {porCategoria.length === 0 ? (
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
