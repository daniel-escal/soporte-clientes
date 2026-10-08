import { describe, expect, test } from 'vitest'
import { CATEGORIAS_CLIENTE, erroresPorCampo, esquemaSolicitudManual } from '@/dominio/solicitud'
import { Constants } from '@/lib/tipos-bd'

const valida = {
  categoria: 'otro',
  titulo: '  El formulario no envía  ',
  descripcion: 'Desde ayer, al pulsar Enviar no llega nada.',
  webId: '3f6c1f2e-8b1a-4c2d-9e0f-1a2b3c4d5e6f',
}

describe('esquemaSolicitudManual', () => {
  test('acepta una incidencia válida y recorta los espacios', () => {
    const r = esquemaSolicitudManual.safeParse(valida)
    expect(r.success).toBe(true)
    expect(r.data?.titulo).toBe('El formulario no envía')
  })

  test.each(['cambio_contenido', 'nuevo_componente'])('acepta una petición (%s)', (categoria) => {
    expect(esquemaSolicitudManual.safeParse({ ...valida, categoria }).success).toBe(true)
  })

  test('no tiene prioridad: la decide la IA o Daniel, no el cliente (y si llega, se descarta)', () => {
    const r = esquemaSolicitudManual.safeParse({ ...valida, prioridad: 'urgente' })
    expect(r.success).toBe(true)
    expect(r.data).not.toHaveProperty('prioridad')
  })

  test('la web es opcional (null = "otra / no lo sé")', () => {
    expect(esquemaSolicitudManual.safeParse({ ...valida, webId: null }).success).toBe(true)
  })

  test.each([
    ['categoria', { categoria: 'web_caida' }], // el cliente no clasifica: eso lo hace la IA o Daniel
    ['titulo', { titulo: 'ab' }],
    ['titulo', { titulo: 'x'.repeat(141) }],
    ['descripcion', { descripcion: 'corta' }],
    ['descripcion', { descripcion: 'x'.repeat(4001) }],
    ['webId', { webId: 'no-es-un-uuid' }],
  ])('rechaza un %s no válido con un mensaje para ese campo', (campo, cambio) => {
    const r = esquemaSolicitudManual.safeParse({ ...valida, ...cambio })
    expect(r.success).toBe(false)
    const errores = erroresPorCampo(r.error!)
    expect(Object.keys(errores)).toEqual([campo])
    expect(errores[campo as keyof typeof errores]).toMatch(/\S/)
  })

  test('un título solo con espacios cuenta como vacío', () => {
    expect(esquemaSolicitudManual.safeParse({ ...valida, titulo: '     ' }).success).toBe(false)
  })

  test('las categorías que puede elegir el cliente existen en la base de datos', () => {
    for (const categoria of CATEGORIAS_CLIENTE) expect(Constants.public.Enums.categoria).toContain(categoria)
  })
})
