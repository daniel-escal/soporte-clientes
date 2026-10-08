import {
  Archive,
  ArrowDown,
  ArrowUp,
  CircleCheck,
  CircleDot,
  Equal,
  Hourglass,
  LifeBuoy,
  PencilLine,
  TriangleAlert,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { NOMBRE_ESTADO, NOMBRE_ESTADO_ADMIN, NOMBRE_PRIORIDAD, NOMBRE_TIPO, type Estado, type Prioridad, type Tipo } from '@/dominio/tickets'

// Texto del color del estado sobre su tinte al 16 % (contrastes comprobados en tests/tema.test.ts).
// Siempre texto + icono: el color nunca es el único indicador.
const TONO = {
  azul: 'text-[var(--estado-abierto)] bg-[color-mix(in_srgb,var(--estado-abierto)_16%,var(--superficie))]',
  violeta: 'text-[var(--estado-en-curso)] bg-[color-mix(in_srgb,var(--estado-en-curso)_16%,var(--superficie))]',
  ambar: 'text-[var(--estado-esperando)] bg-[color-mix(in_srgb,var(--estado-esperando)_16%,var(--superficie))]',
  verde: 'text-[var(--estado-resuelto)] bg-[color-mix(in_srgb,var(--estado-resuelto)_16%,var(--superficie))]',
  gris: 'text-[var(--estado-cerrado)] bg-[color-mix(in_srgb,var(--estado-cerrado)_16%,var(--superficie))]',
  rosa: 'text-[var(--prioridad-urgente)] bg-[color-mix(in_srgb,var(--prioridad-urgente)_16%,var(--superficie))]',
  naranja: 'text-[var(--prioridad-alta)] bg-[color-mix(in_srgb,var(--prioridad-alta)_16%,var(--superficie))]',
} as const

const ESTILO_ESTADO: Record<Estado, { tono: keyof typeof TONO; icono: LucideIcon }> = {
  abierto: { tono: 'azul', icono: CircleDot },
  en_curso: { tono: 'violeta', icono: Wrench },
  esperando_cliente: { tono: 'ambar', icono: Hourglass },
  resuelto: { tono: 'verde', icono: CircleCheck },
  cerrado: { tono: 'gris', icono: Archive },
}

const ESTILO_PRIORIDAD: Record<Prioridad, { tono: keyof typeof TONO; icono: LucideIcon }> = {
  baja: { tono: 'gris', icono: ArrowDown },
  media: { tono: 'azul', icono: Equal },
  alta: { tono: 'naranja', icono: ArrowUp },
  urgente: { tono: 'rosa', icono: TriangleAlert },
}

function Insignia({ tono, icono: Icono, texto, className }: { tono: keyof typeof TONO; icono: LucideIcon; texto: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', TONO[tono], className)}>
      <Icono aria-hidden className="size-3.5" strokeWidth={2.25} />
      {texto}
    </span>
  )
}

export function InsigniaEstado({ estado, paraAdmin = false, className }: { estado: Estado; paraAdmin?: boolean; className?: string }) {
  const { tono, icono } = ESTILO_ESTADO[estado]
  return <Insignia tono={tono} icono={icono} texto={(paraAdmin ? NOMBRE_ESTADO_ADMIN : NOMBRE_ESTADO)[estado]} className={className} />
}

export function InsigniaPrioridad({ prioridad, className }: { prioridad: Prioridad; className?: string }) {
  const { tono, icono } = ESTILO_PRIORIDAD[prioridad]
  return <Insignia tono={tono} icono={icono} texto={`Prioridad ${NOMBRE_PRIORIDAD[prioridad].toLowerCase()}`} className={className} />
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
