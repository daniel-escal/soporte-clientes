import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { esRutaDelPanel } from '../src/lib/tema'

// Lee los tokens hexadecimales de las dos paletas de tema.css (fuente de verdad: docs/ESTETICA.md).
const css = readFileSync(new URL('../src/estilos/tema.css', import.meta.url), 'utf8')

function bloque(selector: string): Record<string, string> {
  const inicio = css.indexOf(`${selector} {`)
  if (inicio < 0) throw new Error(`No encuentro "${selector}" en tema.css`)
  const cuerpo = css.slice(inicio, css.indexOf('}', inicio))
  return Object.fromEntries([...cuerpo.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(([, nombre, valor]) => [nombre, valor.toLowerCase()]))
}

const oscura = bloque(':root')
// La clara solo redefine colores: lo que no cambia se hereda de la oscura.
const PALETAS = { oscura, clara: { ...oscura, ...bloque(":root:not([data-tema='oscuro'])") } }

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

const FONDOS = ['fondo', 'superficie', 'superficie-alta']

describe.each(Object.entries(PALETAS))('contrastes de la paleta %s (docs/ESTETICA.md)', (_, paleta) => {
  const color = (nombre: string) => {
    const valor = paleta[nombre]
    if (!valor) throw new Error(`Falta el token --${nombre} en tema.css`)
    return valor
  }

  test.each(['texto', 'texto-suave', 'texto-tenue', 'agua', 'coral', 'sodio'])(
    'el texto en --%s cumple 4,5:1 sobre todas las superficies',
    (texto) => {
      for (const fondo of FONDOS) expect(contraste(color(texto), color(fondo))).toBeGreaterThanOrEqual(4.5)
    },
  )

  test('el borde de los controles y el foco (agua) cumplen 3:1 sobre todas las superficies (WCAG 1.4.11)', () => {
    for (const fondo of FONDOS) {
      expect(contraste(color('borde-control'), color(fondo))).toBeGreaterThanOrEqual(3)
      expect(contraste(color('agua'), color(fondo))).toBeGreaterThanOrEqual(3)
    }
  })

  test('el texto del botón principal cumple 4,5:1 sobre el agua', () => {
    expect(contraste(color('sobre-agua'), color('agua'))).toBeGreaterThanOrEqual(4.5)
  })

  test('una costilla encendida se distingue de una apagada (3:1), en agua y en sodio', () => {
    expect(contraste(color('agua'), color('costilla-apagada'))).toBeGreaterThanOrEqual(3)
    expect(contraste(color('sodio'), color('costilla-apagada'))).toBeGreaterThanOrEqual(3)
  })
})

describe('qué rutas van siempre en oscuro', () => {
  test.each(['/admin', '/admin/', '/admin/faq', '/admin/tickets/1', '/admin/entrar', '/soporte-clientes/admin/entrar'])('%s es del panel', (ruta) => {
    expect(esRutaDelPanel(ruta)).toBe(true)
  })

  test.each(['/', '/portal', '/portal/solicitudes/1', '/soporte-clientes/', '/administracion'])('%s sigue el modo del sistema', (ruta) => {
    expect(esRutaDelPanel(ruta)).toBe(false)
  })
})
