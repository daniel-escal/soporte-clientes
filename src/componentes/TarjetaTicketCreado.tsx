import { ArrowRight, CircleCheck, Globe } from 'lucide-react'
import { Link } from 'react-router'
import { InsigniaEstado } from '@/componentes/Insignias'
import type { TicketCreado } from '@/dominio/asistente'
import { NOMBRE_TIPO } from '@/dominio/tickets'

/** Confirmación en el chat de que la incidencia o la petición existe, con enlace a su detalle (donde responde Daniel). */
export function TarjetaTicketCreado({ ticket, nombreWeb }: { ticket: TicketCreado; nombreWeb?: string }) {
  return (
    <li className="w-full max-w-md rounded-xl border border-[color-mix(in_srgb,var(--estado-resuelto)_45%,transparent)] bg-superficie-alta p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-texto">
        <CircleCheck aria-hidden className="size-4 text-[var(--estado-resuelto)]" />
        <span>
          {NOMBRE_TIPO[ticket.tipo]} <span className="cifras">#{ticket.numero}</span> creada
        </span>
      </p>
      <p className="mt-2 font-medium text-balance text-texto">{ticket.titulo}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <InsigniaEstado estado={ticket.estado} />
        {nombreWeb && (
          <span className="flex items-center gap-1.5 text-xs text-texto-suave">
            <Globe aria-hidden className="size-3.5" /> {nombreWeb}
          </span>
        )}
      </div>
      <p className="mt-2 text-xs text-texto-suave">En el detalle puedes añadir fotos o capturas.</p>
      <Link
        to={`/portal/solicitudes/${ticket.id}`}
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-azul-texto hover:underline"
      >
        Ver {ticket.tipo === 'peticion' ? 'la petición' : 'la incidencia'} <ArrowRight aria-hidden className="size-4" />
      </Link>
    </li>
  )
}
