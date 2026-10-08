import { describe, expect, test } from 'vitest'
import { ESTADOS, PRIORIDADES, puedeCambiar, siguientesEstados, type Estado } from '@/dominio/tickets'
import { Constants } from '@/lib/tipos-bd'

describe('vocabulario sincronizado con la base de datos', () => {
  test('los estados del dominio son exactamente los del enum estado_ticket', () => {
    expect([...ESTADOS]).toEqual([...Constants.public.Enums.estado_ticket])
  })

  test('las prioridades del dominio son exactamente las del enum prioridad', () => {
    expect([...PRIORIDADES]).toEqual([...Constants.public.Enums.prioridad])
  })
})

describe('transiciones de estado (docs/SPEC.md, módulo tickets)', () => {
  test.each<[Estado, Estado]>([
    ['abierto', 'en_curso'],
    ['abierto', 'cerrado'],
    ['en_curso', 'esperando_cliente'],
    ['en_curso', 'resuelto'],
    ['esperando_cliente', 'en_curso'],
    ['esperando_cliente', 'resuelto'],
    ['resuelto', 'cerrado'],
    ['resuelto', 'en_curso'],
  ])('permite %s → %s', (de, a) => {
    expect(puedeCambiar(de, a)).toBe(true)
  })

  test.each<[Estado, Estado]>([
    ['abierto', 'resuelto'], // no se resuelve sin haberlo trabajado
    ['abierto', 'esperando_cliente'],
    ['en_curso', 'abierto'],
    ['esperando_cliente', 'cerrado'],
    ['cerrado', 'abierto'], // cerrado es definitivo
    ['cerrado', 'en_curso'],
  ])('rechaza %s → %s', (de, a) => {
    expect(puedeCambiar(de, a)).toBe(false)
  })

  test('ningún estado puede "cambiar" a sí mismo', () => {
    for (const estado of ESTADOS) expect(puedeCambiar(estado, estado)).toBe(false)
  })

  test('cerrado no tiene salidas', () => {
    expect(siguientesEstados('cerrado')).toEqual([])
  })

  test('siguientesEstados ofrece justo las transiciones permitidas', () => {
    for (const de of ESTADOS) {
      const esperadas = ESTADOS.filter((a) => puedeCambiar(de, a))
      expect(siguientesEstados(de)).toEqual(esperadas)
    }
  })
})
