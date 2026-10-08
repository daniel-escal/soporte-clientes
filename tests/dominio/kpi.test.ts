import { describe, expect, test } from 'vitest'
import { calcularKpi, formatoDuracion, type DatosKpi } from '@/dominio/kpi'

type Ticket = DatosKpi['tickets'][number]
const ticket = (cambios: Partial<Ticket> = {}): Ticket => ({
  estado: 'abierto',
  prioridad: 'media',
  categoria: 'error_funcional',
  creado_en: '2026-10-09T10:00:00Z',
  primera_respuesta_en: null,
  ...cambios,
})

describe('calcularKpi', () => {
  const tickets: Ticket[] = [
    ticket({ prioridad: 'urgente', categoria: 'web_caida', primera_respuesta_en: '2026-10-09T10:10:00Z' }), // 10 min
    ticket({ estado: 'en_curso', prioridad: 'urgente', categoria: 'web_caida' }),
    ticket({ estado: 'esperando_cliente', categoria: 'cambio_contenido', primera_respuesta_en: '2026-10-09T10:30:00Z' }), // 30 min
    ticket({ estado: 'resuelto', prioridad: 'urgente', categoria: 'web_caida' }), // urgente pero ya no pendiente
    ticket({ estado: 'cerrado', categoria: 'correo' }),
  ]
  const conversaciones: DatosKpi['conversaciones'] = [
    { estado: 'resuelta_ia' },
    { estado: 'resuelta_ia' },
    { estado: 'resuelta_ia' },
    { estado: 'escalada' },
    { estado: 'activa' }, // aún sin terminar: no cuenta
  ]
  const kpi = calcularKpi({ tickets, conversaciones })

  test('abiertos = pendientes (abierto, en curso, esperando al cliente)', () => {
    expect(kpi.abiertos).toBe(3)
  })

  test('urgentes = pendientes con prioridad urgente', () => {
    expect(kpi.urgentes).toBe(2)
  })

  test('% resuelto por la IA sobre las conversaciones terminadas (3 de 4)', () => {
    expect(kpi.resueltoPorIa).toBe(75)
    expect(kpi.conversacionesTerminadas).toBe(4)
  })

  test('tiempo medio hasta la primera respuesta, solo de los respondidos', () => {
    expect(kpi.primeraRespuestaMin).toBe(20)
  })

  test('tickets por categoría, de más a menos y sin las vacías', () => {
    expect(kpi.porCategoria).toEqual([
      { categoria: 'web_caida', total: 3 },
      { categoria: 'cambio_contenido', total: 1 },
      { categoria: 'correo', total: 1 },
    ])
  })

  test('sin datos no se inventa nada', () => {
    expect(calcularKpi({ tickets: [], conversaciones: [] })).toEqual({
      abiertos: 0,
      urgentes: 0,
      resueltoPorIa: null,
      conversacionesTerminadas: 0,
      primeraRespuestaMin: null,
      porCategoria: [],
    })
  })
})

describe('formatoDuracion', () => {
  test.each([
    [8, '8 min'],
    [60, '1 h'],
    [65, '1 h 5 min'],
    [1440, '1 d'],
    [3060, '2 d 3 h'],
  ])('%i minutos → "%s"', (minutos, texto) => {
    expect(formatoDuracion(minutos)).toBe(texto)
  })
})
