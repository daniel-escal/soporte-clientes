import { describe, expect, test } from 'vitest'
import {
  ACCIONES,
  CATEGORIAS,
  PRIORIDADES,
  esquemaPeticion,
  interpretarRespuesta,
} from '../../supabase/functions/_shared/esquema.ts'
import { Constants } from '@/lib/tipos-bd'

const WEB_PROPIA = '11111111-1111-4111-8111-111111111111'
const WEB_AJENA = '22222222-2222-4222-8222-222222222222'
const FAQ = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const contexto = { websIds: [WEB_PROPIA], faqIds: [FAQ] }

const respuesta = (datos: object) => JSON.stringify({ respuesta: 'Te ayudo con eso.', accion: 'responder', faq_usadas: [], ...datos })

describe('vocabulario compartido con la base de datos', () => {
  test('categorías y prioridades de la Edge Function = enums de la BD', () => {
    expect([...CATEGORIAS]).toEqual([...Constants.public.Enums.categoria])
    expect([...PRIORIDADES]).toEqual([...Constants.public.Enums.prioridad])
  })

  test('las acciones son las tres de la spec', () => {
    expect([...ACCIONES]).toEqual(['responder', 'pedir_dato', 'abrir_ticket'])
  })
})

describe('esquemaPeticion (lo que envía el navegador)', () => {
  test('acepta un mensaje con o sin conversación', () => {
    expect(esquemaPeticion.safeParse({ mensaje: 'Hola' }).success).toBe(true)
    expect(esquemaPeticion.safeParse({ mensaje: 'Hola', conversacion_id: FAQ }).success).toBe(true)
  })

  test.each([
    ['vacío', { mensaje: '   ' }],
    ['demasiado largo', { mensaje: 'x'.repeat(2001) }],
    ['conversación que no es un uuid', { mensaje: 'Hola', conversacion_id: 'abc' }],
    ['campos de más (se ignoran) pero sin mensaje', { cliente_id: FAQ }],
  ])('rechaza un cuerpo %s', (_caso, cuerpo) => {
    expect(esquemaPeticion.safeParse(cuerpo).success).toBe(false)
  })
})

describe('interpretarRespuesta (la salida del modelo no es de fiar)', () => {
  test('acepta una respuesta válida', () => {
    const r = interpretarRespuesta(respuesta({ faq_usadas: [FAQ] }), contexto)
    expect(r).toEqual({ ok: true, datos: { respuesta: 'Te ayudo con eso.', accion: 'responder', ticket: null, faq_usadas: [FAQ] } })
  })

  test('JSON roto → no válida', () => {
    expect(interpretarRespuesta('{"respuesta": "a', contexto)).toEqual({ ok: false, motivo: 'json_invalido' })
  })

  test('acción inventada → no válida', () => {
    expect(interpretarRespuesta(respuesta({ accion: 'cerrar_todos_los_tickets' }), contexto)).toEqual({ ok: false, motivo: 'esquema' })
  })

  test('respuesta vacía → no válida', () => {
    expect(interpretarRespuesta(respuesta({ respuesta: '  ' }), contexto)).toEqual({ ok: false, motivo: 'esquema' })
  })

  test('abrir_ticket sin datos del ticket → no válida', () => {
    expect(interpretarRespuesta(respuesta({ accion: 'abrir_ticket' }), contexto)).toEqual({ ok: false, motivo: 'ticket_ausente' })
  })

  test('una web que no es del cliente se descarta (web_id = null)', () => {
    const r = interpretarRespuesta(
      respuesta({
        accion: 'abrir_ticket',
        ticket: { titulo: 'La web no carga', descripcion: 'Desde esta mañana', categoria: 'web_caida', prioridad: 'urgente', web_id: WEB_AJENA },
      }),
      contexto,
    )
    expect(r.ok && r.datos.ticket?.web_id).toBe(null)
  })

  test('una web del cliente se conserva', () => {
    const r = interpretarRespuesta(
      respuesta({
        accion: 'abrir_ticket',
        ticket: { titulo: 'La web no carga', descripcion: 'Desde esta mañana', categoria: 'web_caida', prioridad: 'urgente', web_id: WEB_PROPIA },
      }),
      contexto,
    )
    expect(r.ok && r.datos.ticket?.web_id).toBe(WEB_PROPIA)
  })

  test('las FAQ citadas que no existen se descartan', () => {
    const r = interpretarRespuesta(respuesta({ faq_usadas: [FAQ, 'inventada'] }), contexto)
    expect(r.ok && r.datos.faq_usadas).toEqual([FAQ])
  })

  test('si la acción no es abrir_ticket, el ticket que mande el modelo se ignora', () => {
    const r = interpretarRespuesta(
      respuesta({ ticket: { titulo: 'Sobra', descripcion: 'x', categoria: 'otro', prioridad: 'baja', web_id: null } }),
      contexto,
    )
    expect(r.ok && r.datos.ticket).toBe(null)
  })

  test('categoría o prioridad fuera del enum → no válida', () => {
    const r = interpretarRespuesta(
      respuesta({ accion: 'abrir_ticket', ticket: { titulo: 'Algo', descripcion: 'x', categoria: 'hackeo', prioridad: 'maxima', web_id: null } }),
      contexto,
    )
    expect(r).toEqual({ ok: false, motivo: 'esquema' })
  })
})
