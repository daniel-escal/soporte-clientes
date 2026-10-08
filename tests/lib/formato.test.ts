import { describe, expect, test } from 'vitest'
import { haceCuanto } from '@/lib/formato'

const ahora = new Date('2026-10-08T18:00:00Z')
const antes = (segundos: number) => new Date(ahora.getTime() - segundos * 1000)

describe('haceCuanto', () => {
  test('menos de 45 s → "ahora mismo"', () => {
    expect(haceCuanto(antes(10), ahora)).toBe('ahora mismo')
  })

  test('minutos', () => {
    expect(haceCuanto(antes(5 * 60), ahora)).toBe('hace 5 minutos')
  })

  test('horas', () => {
    expect(haceCuanto(antes(3 * 3600), ahora)).toBe('hace 3 horas')
  })

  test('un día → "ayer"', () => {
    expect(haceCuanto(antes(24 * 3600), ahora)).toBe('ayer')
  })

  test('más de una semana → fecha corta', () => {
    expect(haceCuanto(antes(10 * 86400), ahora)).toMatch(/^28 sept?\.?$/)
  })

  test('acepta la fecha como texto ISO (como llega de Supabase)', () => {
    expect(haceCuanto(antes(120).toISOString(), ahora)).toBe('hace 2 minutos')
  })
})
