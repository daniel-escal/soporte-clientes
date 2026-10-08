import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

// Lee los tokens hexadecimales de :root en tema.css (fuente de verdad: docs/ESTETICA.md).
const css = readFileSync(new URL('../src/estilos/tema.css', import.meta.url), 'utf8')
const tokens = Object.fromEntries(
  [...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, nombre, valor]) => [nombre, valor.toLowerCase()]),
)

function luminancia(hex: string): number {
  const canal = (i: number) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * canal(1) + 0.7152 * canal(3) + 0.0722 * canal(5)
}

function contraste(a: string, b: string): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x)
  return (claro + 0.05) / (oscuro + 0.05)
}

function mezclar(color: string, fondo: string, alfa: number): string {
  const c = (hex: string, i: number) => parseInt(hex.slice(i, i + 2), 16)
  return (
    '#' +
    [1, 3, 5].map((i) => Math.round(c(color, i) * alfa + c(fondo, i) * (1 - alfa)).toString(16).padStart(2, '0')).join('')
  )
}

const color = (nombre: string) => {
  const valor = tokens[nombre]
  if (!valor) throw new Error(`Falta el token --${nombre} en tema.css`)
  return valor
}

const FONDOS = ['fondo', 'superficie', 'superficie-alta']

describe('contrastes de docs/ESTETICA.md', () => {
  test.each(['texto', 'texto-suave', 'texto-tenue', 'azul-texto', 'violeta-texto'])(
    'el texto --%s cumple 4,5:1 sobre todas las superficies',
    (texto) => {
      for (const fondo of FONDOS) expect(contraste(color(texto), color(fondo))).toBeGreaterThanOrEqual(4.5)
    },
  )

  test.each(['foco', 'borde-control'])('--%s cumple 3:1 sobre todas las superficies (WCAG 1.4.11)', (token) => {
    for (const fondo of FONDOS) expect(contraste(color(token), color(fondo))).toBeGreaterThanOrEqual(3)
  })

  test('el texto blanco cumple 4,5:1 en los dos extremos del degradado del botón', () => {
    expect(contraste('#ffffff', color('boton-inicio'))).toBeGreaterThanOrEqual(4.5)
    expect(contraste('#ffffff', color('boton-fin'))).toBeGreaterThanOrEqual(4.5)
  })

  test.each([
    'estado-abierto',
    'estado-en-curso',
    'estado-esperando',
    'estado-resuelto',
    'estado-cerrado',
    'prioridad-urgente',
    'prioridad-alta',
  ])('la insignia --%s cumple 4,5:1 sobre su tinte al 16 %%', (token) => {
    const tinte = mezclar(color(token), color('superficie'), 0.16)
    expect(contraste(color(token), tinte)).toBeGreaterThanOrEqual(4.5)
  })
})
