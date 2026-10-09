import { describe, expect, test } from 'vitest'
import { MAXIMO_POR_SOLICITUD, TAMANO_MAXIMO, rutaAdjunto, validarAdjuntos } from '@/dominio/adjuntos'

const foto = (nombre = 'error.jpg', tipo = 'image/jpeg', tamano = 200_000) => ({ name: nombre, type: tipo, size: tamano })

describe('validarAdjuntos', () => {
  test('acepta fotos JPG, PNG y WebP de hasta 5 MB', () => {
    expect(validarAdjuntos([foto(), foto('a.png', 'image/png'), foto('b.webp', 'image/webp', TAMANO_MAXIMO)], 0)).toBeNull()
  })

  test.each([
    ['un SVG (podría llevar scripts)', foto('logo.svg', 'image/svg+xml'), /no es una foto/],
    ['un PDF', foto('factura.pdf', 'application/pdf'), /no es una foto/],
    ['una "foto" que en realidad es HTML', foto('captura.png', 'text/html'), /no es una foto/],
    ['una foto de más de 5 MB', foto('grande.jpg', 'image/jpeg', TAMANO_MAXIMO + 1), /más de 5 MB/],
  ])('rechaza %s', (_caso, archivo, mensaje) => {
    expect(validarAdjuntos([archivo], 0)).toMatch(mensaje)
  })

  test(`no deja pasar de ${MAXIMO_POR_SOLICITUD} por solicitud y dice cuántas quedan`, () => {
    expect(validarAdjuntos([foto(), foto(), foto()], MAXIMO_POR_SOLICITUD - 2)).toMatch(/Puedes añadir 2 fotos más/)
    expect(validarAdjuntos([foto()], MAXIMO_POR_SOLICITUD)).toMatch(/Ya hay 10 fotos/)
  })

  test('sin archivos no hay nada que validar', () => {
    expect(validarAdjuntos([], 0)).toBeNull()
  })
})

describe('rutaAdjunto', () => {
  test('{cliente}/{ticket}/{id}.{ext}, con la extensión según el tipo y no según el nombre del archivo', () => {
    expect(rutaAdjunto('c1', 't1', 'image/png', 'abc')).toBe('c1/t1/abc.png')
    expect(rutaAdjunto('c1', 't1', 'image/jpeg', 'abc')).toBe('c1/t1/abc.jpg')
  })

  test('por defecto el nombre es un id aleatorio', () => {
    expect(rutaAdjunto('c1', 't1', 'image/webp')).toMatch(/^c1\/t1\/[0-9a-f-]{36}\.webp$/)
  })
})
