import type { Estado, Prioridad, Tipo } from '@/dominio/tickets'

// Bandeja del panel (docs/SPEC.md, módulo panel): orden por prioridad y antigüedad, y filtros.
// Lógica pura: la página solo pinta lo que devuelven estas funciones.

/** Lo que la bandeja necesita de cada ticket. */
export type TicketBandeja = {
  id: string
  numero: number
  tipo: Tipo
  estado: Estado
  prioridad: Prioridad
  creado_en: string
  cliente: { id: string; nombre: string } | null
}

export const ESTADOS_PENDIENTES: readonly Estado[] = ['abierto', 'en_curso', 'esperando_cliente']

const PESO_PRIORIDAD: Record<Prioridad, number> = { urgente: 0, alta: 1, media: 2, baja: 3 }

/**
 * Primero lo más urgente; a igual prioridad, lo que más tiempo lleva esperando (cola de soporte).
 * Lo ya resuelto o cerrado va al final, de lo más reciente a lo más antiguo.
 */
export function ordenarBandeja<T extends TicketBandeja>(tickets: readonly T[]): T[] {
  return [...tickets].sort((a, b) => {
    const pendienteA = ESTADOS_PENDIENTES.includes(a.estado)
    const pendienteB = ESTADOS_PENDIENTES.includes(b.estado)
    if (pendienteA !== pendienteB) return pendienteA ? -1 : 1
    if (!pendienteA) return b.creado_en.localeCompare(a.creado_en)
    return PESO_PRIORIDAD[a.prioridad] - PESO_PRIORIDAD[b.prioridad] || a.creado_en.localeCompare(b.creado_en)
  })
}

export type FiltrosBandeja = {
  /** 'pendientes' = abierto, en curso o esperando al cliente. */
  estado: 'pendientes' | 'todos' | Estado
  prioridad: 'todas' | Prioridad
  tipo: 'todos' | Tipo
  clienteId: 'todos' | string
}

export const FILTROS_INICIALES: FiltrosBandeja = { estado: 'pendientes', prioridad: 'todas', tipo: 'todos', clienteId: 'todos' }

export function filtrarBandeja<T extends TicketBandeja>(tickets: readonly T[], filtros: FiltrosBandeja): T[] {
  return tickets.filter(
    (ticket) =>
      (filtros.estado === 'todos' ||
        (filtros.estado === 'pendientes' ? ESTADOS_PENDIENTES.includes(ticket.estado) : ticket.estado === filtros.estado)) &&
      (filtros.prioridad === 'todas' || ticket.prioridad === filtros.prioridad) &&
      (filtros.tipo === 'todos' || ticket.tipo === filtros.tipo) &&
      (filtros.clienteId === 'todos' || ticket.cliente?.id === filtros.clienteId),
  )
}

/** Clientes con tickets, sin repetir y por nombre, para el filtro. */
export function clientesDeLaBandeja(tickets: readonly TicketBandeja[]): { id: string; nombre: string }[] {
  const porId = new Map(tickets.flatMap((ticket) => (ticket.cliente ? [[ticket.cliente.id, ticket.cliente] as const] : [])))
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
