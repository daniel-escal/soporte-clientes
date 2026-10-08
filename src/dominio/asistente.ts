import { z } from 'zod'
import { ESTADOS, PRIORIDADES } from '@/dominio/tickets'

// Contrato de la respuesta de la Edge Function `asistente` (supabase/functions/asistente/index.ts).
// El navegador también la valida: si algo no cuadra, el chat ofrece el plan B en vez de romperse.

const esquemaTicketCreado = z.object({
  id: z.uuid(),
  numero: z.number().int(),
  titulo: z.string(),
  estado: z.enum(ESTADOS),
  prioridad: z.enum(PRIORIDADES),
  creado_en: z.string(),
  web_id: z.uuid().nullable(),
})
export type TicketCreado = z.infer<typeof esquemaTicketCreado>

export const esquemaRespuestaAsistente = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    conversacion_id: z.uuid(),
    accion: z.enum(['responder', 'pedir_dato', 'abrir_ticket']),
    respuesta: z.string().min(1),
    mensaje: z.object({ id: z.uuid(), creado_en: z.string() }),
    ticket: esquemaTicketCreado.nullable(),
  }),
  z.object({
    ok: z.literal(false),
    conversacion_id: z.uuid().optional(),
    motivo: z.string(),
  }),
])
export type RespuestaAsistente = z.infer<typeof esquemaRespuestaAsistente>

/** Qué decirle al cliente cuando el asistente no responde. Siempre con salida: abrirla a mano. */
export function mensajeDeFallo(motivo: string): string {
  switch (motivo) {
    case 'limite_cliente':
      return 'Has enviado muchos mensajes en poco tiempo. Espera un rato o abre la incidencia a mano: Daniel la verá igual.'
    case 'limite_global':
      return 'El asistente está atendiendo a mucha gente ahora mismo. Abre la incidencia a mano y Daniel la verá igual.'
    default:
      return 'El asistente no ha podido responder ahora mismo. Abre la incidencia a mano y Daniel la verá igual.'
  }
}

type EntradaChat = { tipo: 'mensaje'; autor: string; contenido: string } | { tipo: 'ticket' }

/**
 * Lo que el cliente ha escrito en la conversación en curso: desde la última incidencia creada, porque
 * lo anterior ya está en esa incidencia y no debe colarse en la siguiente.
 */
export function loQueHaContado(entradas: EntradaChat[]): string[] {
  const inicio = entradas.findLastIndex((entrada) => entrada.tipo === 'ticket') + 1
  return entradas.slice(inicio).flatMap((entrada) => (entrada.tipo === 'mensaje' && entrada.autor === 'cliente' ? [entrada.contenido] : []))
}

/**
 * Lo que el cliente ya ha contado en el chat, para que el plan B no le haga repetirlo.
 * Título: el primer mensaje con algo de contenido (no un "hola"). Descripción: todo lo que ha escrito.
 */
export function borradorIncidencia(mensajesCliente: string[]): { titulo: string; descripcion: string } {
  const textos = mensajesCliente.map((texto) => texto.trim()).filter(Boolean)
  const conContenido = textos.find((texto) => texto.split(/\s+/).length >= 3) ?? textos[0] ?? ''
  return { titulo: recortar(conContenido, 140), descripcion: recortar(textos.join('\n\n'), 4000) }
}

/** Recorta por la última palabra completa y añade "…" (el total no pasa de `maximo`). */
function recortar(texto: string, maximo: number): string {
  if (texto.length <= maximo) return texto
  const corte = texto.slice(0, maximo - 1)
  const espacio = corte.lastIndexOf(' ')
  return `${(espacio > maximo / 2 ? corte.slice(0, espacio) : corte).trimEnd()}…`
}
