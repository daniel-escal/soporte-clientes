import { describe, expect, test } from 'vitest'
import { borradorIncidencia, esquemaRespuestaAsistente, loQueHaContado, mensajeDeFallo } from '@/dominio/asistente'

// Respuesta real de la función (prueba del 2026-10-09), sin los campos de diagnóstico.
const respuestaConTicket = {
  ok: true,
  conversacion_id: '8107cd28-6946-40f0-ac1d-c9d1ec0da870',
  accion: 'abrir_ticket',
  respuesta: 'He abierto una incidencia urgente para que Daniel revise la web de Brocha & Latón lo antes posible.',
  mensaje: { id: '61b78a73-8c03-4be6-ab8b-e4b77d743538', creado_en: '2026-10-08T22:59:55.766992+00:00' },
  ticket: {
    id: '76164763-292d-4329-983d-4a14b04aeb3c',
    numero: 23,
    titulo: 'Web caída: Brocha & Latón',
    estado: 'abierto',
    prioridad: 'urgente',
    creado_en: '2026-10-08T22:59:55.681712+00:00',
    web_id: 'd9acaaea-57c3-4882-85de-a539573bf767',
  },
  duracion_ms: 2929,
  modelo: 'gemini-3.6-flash',
}

describe('esquemaRespuestaAsistente', () => {
  test('acepta una respuesta con ticket creado', () => {
    const resultado = esquemaRespuestaAsistente.parse(respuestaConTicket)
    expect(resultado.ok && resultado.ticket?.numero).toBe(23)
  })

  test('acepta una respuesta sin ticket', () => {
    expect(esquemaRespuestaAsistente.safeParse({ ...respuestaConTicket, accion: 'pedir_dato', ticket: null }).success).toBe(true)
  })

  test('acepta un fallo, con o sin conversación', () => {
    expect(esquemaRespuestaAsistente.safeParse({ ok: false, motivo: 'timeout', conversacion_id: respuestaConTicket.conversacion_id }).success).toBe(true)
    expect(esquemaRespuestaAsistente.safeParse({ ok: false, motivo: 'limite_cliente' }).success).toBe(true)
  })

  test('rechaza lo que no cumple el contrato (y el chat pasa al plan B)', () => {
    expect(esquemaRespuestaAsistente.safeParse({ ...respuestaConTicket, accion: 'borrar_todo' }).success).toBe(false)
    expect(esquemaRespuestaAsistente.safeParse({ ...respuestaConTicket, mensaje: undefined }).success).toBe(false)
    expect(esquemaRespuestaAsistente.safeParse(null).success).toBe(false)
    expect(esquemaRespuestaAsistente.safeParse('<html>Bad gateway</html>').success).toBe(false)
  })
})

describe('mensajeDeFallo', () => {
  test.each(['limite_cliente', 'limite_global', 'timeout', 'esquema', 'red', 'cualquier_otro'])(
    '"%s" siempre ofrece abrir la incidencia a mano',
    (motivo) => {
      expect(mensajeDeFallo(motivo)).toMatch(/a mano/)
    },
  )

  test('el límite por cliente explica que hay que esperar', () => {
    expect(mensajeDeFallo('limite_cliente')).toMatch(/muchos mensajes/)
  })
})

describe('loQueHaContado', () => {
  const cliente = (contenido: string) => ({ tipo: 'mensaje' as const, autor: 'cliente', contenido })
  const ia = (contenido: string) => ({ tipo: 'mensaje' as const, autor: 'ia', contenido })

  test('solo lo que ha escrito el cliente (no las respuestas del asistente)', () => {
    expect(loQueHaContado([cliente('Mi web no carga'), ia('¿Qué web?'), cliente('La del taller')])).toEqual(['Mi web no carga', 'La del taller'])
  })

  test('lo anterior a una incidencia ya creada no entra en la siguiente', () => {
    const entradas = [cliente('El formulario no envía'), ia('He abierto una incidencia'), { tipo: 'ticket' as const }, cliente('Ahora la web del taller va lenta')]
    expect(loQueHaContado(entradas)).toEqual(['Ahora la web del taller va lenta'])
  })
})

describe('borradorIncidencia', () => {
  test('el título es el primer mensaje con contenido (no un saludo) y la descripción, todo lo contado', () => {
    const borrador = borradorIncidencia(['Hola', 'El formulario de contacto no envía', 'Desde ayer, en Brocha & Latón'])
    expect(borrador.titulo).toBe('El formulario de contacto no envía')
    expect(borrador.descripcion).toBe('Hola\n\nEl formulario de contacto no envía\n\nDesde ayer, en Brocha & Latón')
  })

  test('recorta el título por una palabra completa sin pasar de 140 caracteres', () => {
    const largo = 'La web se queda en blanco cuando entro desde el móvil '.repeat(5).trim()
    const { titulo } = borradorIncidencia([largo])
    expect(titulo.length).toBeLessThanOrEqual(140)
    expect(titulo.endsWith('…')).toBe(true)
    expect(largo.startsWith(titulo.slice(0, -1))).toBe(true)
  })

  test('sin mensajes, el borrador queda vacío', () => {
    expect(borradorIncidencia([])).toEqual({ titulo: '', descripcion: '' })
    expect(borradorIncidencia(['   '])).toEqual({ titulo: '', descripcion: '' })
  })
})
