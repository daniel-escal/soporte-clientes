import { ArrowDown, ArrowUp, Equal, LifeBuoy, PencilLine, TriangleAlert, type LucideIcon } from 'lucide-react'
import { Costillas } from '@/componentes/Costillas'
import { cn } from '@/lib/utils'
import { NOMBRE_ESTADO, NOMBRE_ESTADO_ADMIN, NOMBRE_PRIORIDAD, NOMBRE_TIPO, type Estado, type Prioridad, type Tipo } from '@/dominio/tickets'

/**
 * El estado: su texto con las cuatro costillas al lado (docs/ESTETICA.md).
 * Solo "esperando al cliente" lleva color (sodio): es una pausa, no un avance.
 */
export function InsigniaEstado({ estado, paraAdmin = false, className }: { estado: Estado; paraAdmin?: boolean; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-xs font-medium whitespace-nowrap',
        estado === 'esperando_cliente' ? 'text-sodio' : 'text-texto-suave',
        className,
      )}
    >
      <Costillas estado={estado} />
      {(paraAdmin ? NOMBRE_ESTADO_ADMIN : NOMBRE_ESTADO)[estado]}
    </span>
  )
}

const ICONO_PRIORIDAD: Record<Prioridad, LucideIcon> = { baja: ArrowDown, media: Equal, alta: ArrowUp, urgente: TriangleAlert }

/** La prioridad solo lleva color si es urgente (coral). Siempre con icono y texto: el color nunca es el único indicador. */
export function InsigniaPrioridad({ prioridad, className }: { prioridad: Prioridad; className?: string }) {
  const Icono = ICONO_PRIORIDAD[prioridad]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs whitespace-nowrap',
        prioridad === 'urgente' ? 'font-semibold text-coral' : 'font-medium text-texto-suave',
        className,
      )}
    >
      <Icono aria-hidden className="size-3.5" strokeWidth={2.25} />
      {`Prioridad ${NOMBRE_PRIORIDAD[prioridad].toLowerCase()}`}
    </span>
  )
}

const ICONO_TIPO: Record<Tipo, LucideIcon> = { incidencia: LifeBuoy, peticion: PencilLine }

/** "Incidencia #24" o "Petición #27": tipo y número, sin color (no es un estado). */
export function EtiquetaTipo({ tipo, numero, className }: { tipo: Tipo; numero: number; className?: string }) {
  const Icono = ICONO_TIPO[tipo]
  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <Icono aria-hidden className="size-3.5" />
      {NOMBRE_TIPO[tipo]} <span className="cifras">#{numero}</span>
    </span>
  )
}
