// Contrato del asistente. TypeScript sin APIs de Deno: lo usan la Edge Function y los tests (Vitest).
// tests/asistente/esquema.test.ts comprueba que categorías y prioridades coinciden con la BD.
import { z } from 'zod'

export const CATEGORIAS = [
  'web_caida',
  'error_funcional',
  'cambio_contenido',
  'nuevo_componente',
  'correo',
  'dominio_hosting',
  'facturacion',
  'otro',
] as const
export const PRIORIDADES = ['baja', 'media', 'alta', 'urgente'] as const
export const ACCIONES = ['responder', 'pedir_dato', 'abrir_ticket'] as const

/** Lo que envía el navegador. Solo el mensaje y, si sigue una conversación, su id. */
export const esquemaPeticion = z.object({
  conversacion_id: z.uuid().optional(),
  mensaje: z.string().trim().min(1).max(2000),
})
export type Peticion = z.infer<typeof esquemaPeticion>

const esquemaTicket = z.object({
  titulo: z.string().trim().min(3).max(140),
  descripcion: z.string().trim().min(1).max(4000),
  categoria: z.enum(CATEGORIAS),
  prioridad: z.enum(PRIORIDADES),
  web_id: z.string().nullable(),
})

const esquemaRespuestaModelo = z.object({
  respuesta: z.string().trim().min(1).max(1500),
  accion: z.enum(ACCIONES),
  ticket: esquemaTicket.nullable().optional(),
  faq_usadas: z.array(z.string()).max(10).default([]),
})

export type TicketPropuesto = z.infer<typeof esquemaTicket>
export type RespuestaAsistente = {
  respuesta: string
  accion: (typeof ACCIONES)[number]
  ticket: TicketPropuesto | null
  faq_usadas: string[]
}

/** El mismo contrato en JSON Schema, para pedírselo a Gemini como salida estructurada. */
export const ESQUEMA_JSON_RESPUESTA = {
  type: 'object',
  properties: {
    respuesta: { type: 'string', description: 'Texto para el cliente, en español, sin markdown, como máximo 5 frases.' },
    accion: { type: 'string', enum: [...ACCIONES] },
    ticket: {
      type: ['object', 'null'],
      description: 'Solo si accion = abrir_ticket.',
      properties: {
        titulo: { type: 'string' },
        descripcion: { type: 'string' },
        categoria: { type: 'string', enum: [...CATEGORIAS] },
        prioridad: { type: 'string', enum: [...PRIORIDADES] },
        web_id: { type: ['string', 'null'] },
      },
      required: ['titulo', 'descripcion', 'categoria', 'prioridad', 'web_id'],
    },
    faq_usadas: { type: 'array', items: { type: 'string' }, description: 'Ids de las entradas de la FAQ en las que te basas.' },
  },
  required: ['respuesta', 'accion', 'faq_usadas'],
} as const

export type Interpretacion = { ok: true; datos: RespuestaAsistente } | { ok: false; motivo: 'json_invalido' | 'esquema' | 'ticket_ausente' }

/**
 * Valida la salida del modelo. Nunca se fía de los ids que diga: la web solo se conserva si es del
 * cliente y la FAQ solo si existe. El ticket solo cuenta si la acción es abrir_ticket.
 */
export function interpretarRespuesta(texto: string, contexto: { websIds: string[]; faqIds: string[] }): Interpretacion {
  let bruto: unknown
  try {
    bruto = JSON.parse(texto)
  } catch {
    return { ok: false, motivo: 'json_invalido' }
  }

  const resultado = esquemaRespuestaModelo.safeParse(bruto)
  if (!resultado.success) return { ok: false, motivo: 'esquema' }
  const { respuesta, accion, ticket, faq_usadas } = resultado.data

  if (accion === 'abrir_ticket' && !ticket) return { ok: false, motivo: 'ticket_ausente' }

  return {
    ok: true,
    datos: {
      respuesta,
      accion,
      ticket:
        accion === 'abrir_ticket' && ticket
          ? { ...ticket, web_id: ticket.web_id && contexto.websIds.includes(ticket.web_id) ? ticket.web_id : null }
          : null,
      faq_usadas: faq_usadas.filter((id) => contexto.faqIds.includes(id)),
    },
  }
}
