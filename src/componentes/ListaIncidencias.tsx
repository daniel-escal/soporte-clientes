import { ChevronRight, Globe } from 'lucide-react'
import { Link } from 'react-router'
import { InsigniaEstado, InsigniaPrioridad } from '@/componentes/Insignias'
import { haceCuanto } from '@/lib/formato'
import type { Tables } from '@/lib/tipos-bd'

export type FilaIncidencia = Pick<Tables<'tickets'>, 'id' | 'numero' | 'titulo' | 'estado' | 'prioridad' | 'creado_en'> & {
  web: { nombre: string } | null
}

/** Consulta de las incidencias del cliente (RLS solo devuelve las suyas). */
export const COLUMNAS_INCIDENCIA = 'id, numero, titulo, estado, prioridad, creado_en, web:webs!tickets_web_del_cliente(nombre)'

export function ListaIncidencias({ incidencias }: { incidencias: FilaIncidencia[] }) {
  return (
    <ul className="grid gap-2">
      {incidencias.map((incidencia) => (
        <li key={incidencia.id}>
          <Link
            to={`/portal/incidencias/${incidencia.id}`}
            className="group flex items-center gap-3 rounded-lg border bg-card p-4 shadow-tarjeta transition-colors hover:border-borde-control"
          >
            <span className="min-w-0 flex-1">
              <span className="cifras block text-xs text-texto-tenue">
                Incidencia #{incidencia.numero} · {haceCuanto(incidencia.creado_en)}
              </span>
              <span className="mt-0.5 block truncate font-medium text-texto">{incidencia.titulo}</span>
              {incidencia.web && (
                <span className="mt-1 flex items-center gap-1.5 text-xs text-texto-suave">
                  <Globe aria-hidden className="size-3.5" /> {incidencia.web.nombre}
                </span>
              )}
              <span className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
                <InsigniaPrioridad prioridad={incidencia.prioridad} />
                <InsigniaEstado estado={incidencia.estado} />
              </span>
            </span>
            <span className="hidden shrink-0 flex-col items-end gap-1.5 sm:flex">
              <InsigniaEstado estado={incidencia.estado} />
              <InsigniaPrioridad prioridad={incidencia.prioridad} />
            </span>
            <ChevronRight aria-hidden className="size-4 shrink-0 text-texto-tenue transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
