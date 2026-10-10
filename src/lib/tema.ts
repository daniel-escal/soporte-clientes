/**
 * El panel es siempre oscuro; la entrada y el portal siguen el modo del sistema (docs/ESTETICA.md).
 * index.html hace lo mismo antes de pintar la primera vez, para que no haya un destello claro en el panel.
 */
export function esRutaDelPanel(ruta: string): boolean {
  return /(^|\/)admin(\/|$)/.test(ruta)
}

export function aplicarTema(ruta: string): void {
  const raiz = document.documentElement
  if (esRutaDelPanel(ruta)) raiz.dataset.tema = 'oscuro'
  else delete raiz.dataset.tema
}
