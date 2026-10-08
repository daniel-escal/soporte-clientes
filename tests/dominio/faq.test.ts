import { describe, expect, test } from 'vitest'
import { esquemaEntradaFaq } from '@/dominio/faq'
import { erroresPorCampo } from '@/dominio/formularios'

const valida = {
  pregunta: '  ¿Puedo cambiar yo los textos de mi web?  ',
  respuesta: 'No hace falta: pídelo aquí y Daniel hace el cambio.',
  categoria: 'cambio_contenido',
}

describe('esquemaEntradaFaq', () => {
  test('acepta una entrada válida y recorta los espacios', () => {
    const r = esquemaEntradaFaq.safeParse(valida)
    expect(r.success).toBe(true)
    expect(r.data?.pregunta).toBe('¿Puedo cambiar yo los textos de mi web?')
  })

  test.each([
    ['pregunta', { pregunta: 'ab' }],
    ['pregunta', { pregunta: 'x'.repeat(301) }],
    ['respuesta', { respuesta: '  ' }],
    ['respuesta', { respuesta: 'x'.repeat(2001) }],
    ['categoria', { categoria: 'spam' }],
  ])('rechaza un %s no válido con un mensaje para ese campo', (campo, cambio) => {
    const r = esquemaEntradaFaq.safeParse({ ...valida, ...cambio })
    expect(r.success).toBe(false)
    const errores = erroresPorCampo<keyof typeof valida>(r.error!)
    expect(Object.keys(errores)).toEqual([campo])
    expect(errores[campo as keyof typeof valida]).toMatch(/\S/)
  })
})
