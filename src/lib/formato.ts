const relativo = new Intl.RelativeTimeFormat('es', { numeric: 'auto' })
const fechaCorta = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'Europe/Madrid' })

/** "ahora mismo", "hace 5 minutos", "ayer"… y fecha corta pasada una semana. */
export function haceCuanto(fecha: Date | string, ahora: Date = new Date()): string {
  const momento = typeof fecha === 'string' ? new Date(fecha) : fecha
  const segundos = Math.round((momento.getTime() - ahora.getTime()) / 1000)
  const distancia = Math.abs(segundos)

  if (distancia < 45) return 'ahora mismo'
  if (distancia < 45 * 60) return relativo.format(Math.round(segundos / 60), 'minute')
  if (distancia < 22 * 3600) return relativo.format(Math.round(segundos / 3600), 'hour')
  if (distancia < 7 * 86400) return relativo.format(Math.round(segundos / 86400), 'day')
  return fechaCorta.format(momento)
}
