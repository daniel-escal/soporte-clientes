import { ESTADOS_PENDIENTES } from '@/dominio/bandeja'
import { CATEGORIAS, type Categoria, type Estado, type Prioridad } from '@/dominio/tickets'

// KPI del panel (docs/SPEC.md, módulo panel). Lógica pura sobre los datos que RLS deja leer al admin.

export type DatosKpi = {
  tickets: readonly { estado: Estado; prioridad: Prioridad; categoria: Categoria; creado_en: string; primera_respuesta_en: string | null }[]
  conversaciones: readonly { estado: 'activa' | 'resuelta_ia' | 'escalada' }[]
}

export type Kpi = {
  /** Pendientes: abiertos, en curso o esperando al cliente. */
  abiertos: number
  /** Pendientes con prioridad urgente. */
  urgentes: number
  /** % de conversaciones terminadas que resolvió el asistente sin ticket (null si aún no hay ninguna). */
  resueltoPorIa: number | null
  conversacionesTerminadas: number
  /** Minutos de media hasta la primera respuesta de Daniel (null si aún no ha respondido ninguno). */
  primeraRespuestaMin: number | null
  /** Tickets de cada categoría, de más a menos (solo las que tienen alguno). */
  porCategoria: { categoria: Categoria; total: number }[]
}

export function calcularKpi({ tickets, conversaciones }: DatosKpi): Kpi {
  const pendientes = tickets.filter((ticket) => ESTADOS_PENDIENTES.includes(ticket.estado))
  const resueltas = conversaciones.filter((conversacion) => conversacion.estado === 'resuelta_ia').length
  const terminadas = resueltas + conversaciones.filter((conversacion) => conversacion.estado === 'escalada').length
  const esperas = tickets.flatMap((ticket) =>
    ticket.primera_respuesta_en ? [Date.parse(ticket.primera_respuesta_en) - Date.parse(ticket.creado_en)] : [],
  )

  return {
    abiertos: pendientes.length,
    urgentes: pendientes.filter((ticket) => ticket.prioridad === 'urgente').length,
    resueltoPorIa: terminadas ? Math.round((resueltas / terminadas) * 100) : null,
    conversacionesTerminadas: terminadas,
    primeraRespuestaMin: esperas.length ? Math.round(esperas.reduce((suma, ms) => suma + ms, 0) / esperas.length / 60_000) : null,
    porCategoria: CATEGORIAS.map((categoria) => ({ categoria, total: tickets.filter((ticket) => ticket.categoria === categoria).length }))
      .filter(({ total }) => total > 0)
      .sort((a, b) => b.total - a.total),
  }
}

/** "8 min", "1 h 5 min", "2 d 3 h". */
export function formatoDuracion(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const horas = Math.floor(minutos / 60)
  if (horas < 24) return minutos % 60 ? `${horas} h ${minutos % 60} min` : `${horas} h`
  const dias = Math.floor(horas / 24)
  return horas % 24 ? `${dias} d ${horas % 24} h` : `${dias} d`
}
