import { describe, expect, test } from 'vitest'
import { unirMensajes, type MensajeConversacion } from '@/lib/en-directo'

const mensaje = (id: string, creado_en: string, contenido = id): MensajeConversacion => ({ id, autor: 'cliente', contenido, creado_en })

describe('unirMensajes', () => {
  test('no repite un mensaje que llega por los dos caminos (carga y tiempo real)', () => {
    const cargados = [mensaje('a', '2026-10-09T10:00:00Z'), mensaje('b', '2026-10-09T10:01:00Z')]
    const enDirecto = [mensaje('b', '2026-10-09T10:01:00Z')]
    expect(unirMensajes(cargados, enDirecto).map((m) => m.id)).toEqual(['a', 'b'])
  })

  test('no pierde uno que llegó en directo antes de terminar la carga, y ordena por fecha', () => {
    const enDirecto = [mensaje('c', '2026-10-09T10:02:00Z')]
    const cargados = [mensaje('a', '2026-10-09T10:00:00Z'), mensaje('b', '2026-10-09T10:01:00Z')]
    expect(unirMensajes(enDirecto, cargados).map((m) => m.id)).toEqual(['a', 'b', 'c'])
  })
})
