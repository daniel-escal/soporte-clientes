import { ChevronRight, Globe } from 'lucide-react'
import { Link } from 'react-router'
import { EtiquetaTipo, InsigniaEstado } from '@/componentes/Insignias'
import { haceCuanto } from '@/lib/formato'
import type { Tables } from '@/lib/tipos-bd'

// Vista del cliente: tipo, estado y web. La prioridad no se muestra (es triaje interno; docs/SPEC.md).
export type FilaSolicitud = Pick<Tables<'tickets'>, 'id' | 'numero' | 'titulo' | 'tipo' | 'estado' | 'creado_en'> & {
  web: { nombre: string } | null
}

/** Consulta de las incidencias y peticiones del cliente (RLS solo devuelve las suyas). */
export const COLUMNAS_SOLICITUD = 'id, numero, titulo, tipo, estado, creado_en, web:webs!tickets_web_del_cliente(nombre)'

export function ListaSolicitudes({ solicitudes }: { solicitudes: FilaSolicitud[] }) {
  return (
    // minmax(0, 1fr): sin él, la columna crece hasta el título más largo (truncate no parte líneas)
    <ul className="grid grid-cols-[minmax(0,1fr)] gap-2">
      {solicitudes.map((solicitud) => (
        <li key={solicitud.id}>
          <Link
            to={`/portal/solicitudes/${solicitud.id}`}
            className="group flex items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-borde-control"
          >
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-1 text-xs text-texto-tenue">
                <EtiquetaTipo tipo={solicitud.tipo} numero={solicitud.numero} /> · {haceCuanto(solicitud.creado_en)}
              </span>
              <span className="mt-0.5 block truncate font-medium text-texto">{solicitud.titulo}</span>
              {solicitud.web && (
                <span className="mt-1 flex items-center gap-1.5 text-xs text-texto-suave">
                  <Globe aria-hidden className="size-3.5" /> {solicitud.web.nombre}
                </span>
              )}
              <InsigniaEstado estado={solicitud.estado} className="mt-2 sm:hidden" />
            </span>
            <InsigniaEstado estado={solicitud.estado} className="hidden shrink-0 sm:inline-flex" />
            <ChevronRight aria-hidden className="size-4 shrink-0 text-texto-tenue transition-transform group-hover:translate-x-0.5" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
