import { describe, expect, test } from 'vitest'
import { erroresPorCampo, esquemaIncidenciaManual } from '@/dominio/incidencia'

const valida = {
  titulo: '  El formulario no envía  ',
  descripcion: 'Desde ayer, al pulsar Enviar no llega nada.',
  prioridad: 'alta',
  webId: '3f6c1f2e-8b1a-4c2d-9e0f-1a2b3c4d5e6f',
}

describe('esquemaIncidenciaManual', () => {
  test('acepta una incidencia válida y recorta los espacios', () => {
    const r = esquemaIncidenciaManual.safeParse(valida)
    expect(r.success).toBe(true)
    expect(r.data?.titulo).toBe('El formulario no envía')
  })

  test('la web es opcional (null = "otra / no lo sé")', () => {
    expect(esquemaIncidenciaManual.safeParse({ ...valida, webId: null }).success).toBe(true)
  })

  test.each([
    ['titulo', { titulo: 'ab' }],
    ['titulo', { titulo: 'x'.repeat(141) }],
    ['descripcion', { descripcion: 'corta' }],
    ['descripcion', { descripcion: 'x'.repeat(4001) }],
    ['prioridad', { prioridad: 'altisima' }],
    ['webId', { webId: 'no-es-un-uuid' }],
  ])('rechaza un %s no válido con un mensaje para ese campo', (campo, cambio) => {
    const r = esquemaIncidenciaManual.safeParse({ ...valida, ...cambio })
    expect(r.success).toBe(false)
    const errores = erroresPorCampo(r.error!)
    expect(Object.keys(errores)).toEqual([campo])
    expect(errores[campo as keyof typeof errores]).toMatch(/\S/)
  })

  test('un título solo con espacios cuenta como vacío', () => {
    const r = esquemaIncidenciaManual.safeParse({ ...valida, titulo: '     ' })
    expect(r.success).toBe(false)
  })
})
