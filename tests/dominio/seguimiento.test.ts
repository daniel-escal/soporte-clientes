import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import {
  DIAS_HASTA_CERRAR,
  DIAS_HASTA_DAR_POR_RESUELTA,
  DIAS_HASTA_RECORDAR,
  seguimientoParaAdmin,
  seguimientoParaCliente,
} from '@/dominio/seguimiento'

// Viernes 9 de octubre de 2026, 12:00 en Madrid.
const DESDE = '2026-10-09T10:00:00Z'
const AHORA = new Date('2026-10-09T12:00:00Z')

describe('plazos sincronizados con la migración', () => {
  const migracion = readFileSync('supabase/migrations/20261009102750_seguimiento_automatico.sql', 'utf8')

  test.each([
    ['recordatorio', DIAS_HASTA_RECORDAR, "recordado_en is null and estado_desde <= now() - interval '2 days'"],
    ['dar por resuelta', DIAS_HASTA_DAR_POR_RESUELTA, "estado = 'esperando_cliente' and estado_desde <= now() - interval '7 days'"],
    ['cierre', DIAS_HASTA_CERRAR, "estado = 'resuelto' and estado_desde <= now() - interval '3 days'"],
  ])('%s: %i días', (_, dias, condicion) => {
    expect(condicion).toContain(`interval '${dias} days'`)
    expect(migracion).toContain(condicion)
  })
})

describe('seguimientoParaAdmin', () => {
  test('resuelta: cuándo se cerrará sola', () => {
    expect(seguimientoParaAdmin({ estado: 'resuelto', estado_desde: DESDE, recordado_en: null }, AHORA)).toBe(
      'Se cerrará sola el lunes 12 de octubre si el cliente no contesta.',
    )
  })

  test('esperando al cliente: recordatorio y fecha en que se dará por resuelta', () => {
    expect(seguimientoParaAdmin({ estado: 'esperando_cliente', estado_desde: DESDE, recordado_en: null }, AHORA)).toBe(
      'Si el cliente no contesta, se le recordará el domingo 11 de octubre y se dará por resuelta el viernes 16 de octubre.',
    )
  })

  test('esperando al cliente con el recordatorio ya enviado', () => {
    expect(seguimientoParaAdmin({ estado: 'esperando_cliente', estado_desde: DESDE, recordado_en: '2026-10-11T10:07:00Z' }, AHORA)).toBe(
      'Ya se le ha recordado al cliente. Si no contesta, se dará por resuelta el viernes 16 de octubre.',
    )
  })

  test('si el plazo ya pasó (el trabajo corre cada hora), "en breve"', () => {
    expect(seguimientoParaAdmin({ estado: 'resuelto', estado_desde: DESDE, recordado_en: null }, new Date('2026-10-12T10:30:00Z'))).toBe(
      'Se cerrará sola en breve si el cliente no contesta.',
    )
  })

  test('la fecha es la de Madrid, no la UTC', () => {
    // 22:30 UTC del viernes = 00:30 del sábado en Madrid; tres días después es martes en Madrid.
    expect(seguimientoParaAdmin({ estado: 'resuelto', estado_desde: '2026-10-09T22:30:00Z', recordado_en: null }, AHORA)).toBe(
      'Se cerrará sola el martes 13 de octubre si el cliente no contesta.',
    )
  })

  test.each(['abierto', 'en_curso', 'cerrado'] as const)('%s: el sistema no hará nada solo', (estado) => {
    expect(seguimientoParaAdmin({ estado, estado_desde: DESDE, recordado_en: null }, AHORA)).toBeNull()
  })
})

describe('seguimientoParaCliente', () => {
  test('resuelta: cómo volver a abrirla y cuándo se cerrará', () => {
    expect(seguimientoParaCliente({ estado: 'resuelto', estado_desde: DESDE, recordado_en: null }, AHORA)).toBe(
      'Si sigue fallando o falta algo, contesta aquí y se volverá a abrir. Si no, se cerrará sola el lunes 12 de octubre.',
    )
  })

  test('esperando su respuesta', () => {
    expect(seguimientoParaCliente({ estado: 'esperando_cliente', estado_desde: DESDE, recordado_en: null }, AHORA)).toBe(
      'Daniel está esperando tu respuesta para seguir.',
    )
  })

  test.each(['abierto', 'en_curso', 'cerrado'] as const)('%s: sin aviso', (estado) => {
    expect(seguimientoParaCliente({ estado, estado_desde: DESDE, recordado_en: null }, AHORA)).toBeNull()
  })
})
