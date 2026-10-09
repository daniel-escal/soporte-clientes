import type { Estado } from '@/dominio/tickets'

// Plazos del seguimiento automático. Quien los aplica es privado.seguimiento_automatico(), cada hora
// con pg_cron (supabase/migrations/20261009102750_seguimiento_automatico.sql). Aquí solo se enseñan, y
// tests/dominio/seguimiento.test.ts comprueba que son los mismos que en la migración.
export const DIAS_HASTA_RECORDAR = 2
export const DIAS_HASTA_DAR_POR_RESUELTA = 7
export const DIAS_HASTA_CERRAR = 3

const DIA_MS = 24 * 60 * 60 * 1000
const dia = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' })

type TicketEnSeguimiento = { estado: Estado; estado_desde: string; recordado_en: string | null }

/** "el lunes 12 de octubre", o "en breve" si el plazo ya pasó (el trabajo se ejecuta una vez por hora). */
function cuando(desde: string, dias: number, ahora: Date): string {
  const fecha = new Date(new Date(desde).getTime() + dias * DIA_MS)
  if (fecha <= ahora) return 'en breve'
  const partes = dia.formatToParts(fecha)
  const parte = (tipo: Intl.DateTimeFormatPartTypes) => partes.find((p) => p.type === tipo)?.value
  return `el ${parte('weekday')} ${parte('day')} de ${parte('month')}`
}

/** Para el panel de Daniel: lo que hará el sistema solo con este ticket, y cuándo. */
export function seguimientoParaAdmin(ticket: TicketEnSeguimiento, ahora: Date = new Date()): string | null {
  if (ticket.estado === 'resuelto') {
    return `Se cerrará sola ${cuando(ticket.estado_desde, DIAS_HASTA_CERRAR, ahora)} si el cliente no contesta.`
  }
  if (ticket.estado === 'esperando_cliente') {
    const resolucion = cuando(ticket.estado_desde, DIAS_HASTA_DAR_POR_RESUELTA, ahora)
    return ticket.recordado_en
      ? `Ya se le ha recordado al cliente. Si no contesta, se dará por resuelta ${resolucion}.`
      : `Si el cliente no contesta, se le recordará ${cuando(ticket.estado_desde, DIAS_HASTA_RECORDAR, ahora)} y se dará por resuelta ${resolucion}.`
  }
  return null
}

/** Para el cliente, encima del cuadro de respuesta: qué pasa si contesta (o si no). */
export function seguimientoParaCliente(ticket: TicketEnSeguimiento, ahora: Date = new Date()): string | null {
  if (ticket.estado === 'resuelto') {
    return `Si sigue fallando o falta algo, contesta aquí y se volverá a abrir. Si no, se cerrará sola ${cuando(ticket.estado_desde, DIAS_HASTA_CERRAR, ahora)}.`
  }
  if (ticket.estado === 'esperando_cliente') return 'Daniel está esperando tu respuesta para seguir.'
  return null
}
