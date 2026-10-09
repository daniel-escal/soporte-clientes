// Fotos y capturas de una incidencia o petición. Los mismos límites los impone Storage (bucket
// "adjuntos") y su política (máx. 10 por ticket): aquí solo se avisa antes de subir nada.
export const TIPOS_IMAGEN = ['image/jpeg', 'image/png', 'image/webp'] as const
export const TAMANO_MAXIMO = 5 * 1024 * 1024
export const MAXIMO_POR_SOLICITUD = 10

const EXTENSION: Record<(typeof TIPOS_IMAGEN)[number], string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

type Archivo = { name: string; type: string; size: number }

/** El primer problema de los archivos elegidos, o null si se pueden subir todos. */
export function validarAdjuntos(archivos: readonly Archivo[], yaSubidos: number): string | null {
  if (archivos.length === 0) return null
  if (yaSubidos + archivos.length > MAXIMO_POR_SOLICITUD) {
    const quedan = MAXIMO_POR_SOLICITUD - yaSubidos
    return quedan > 0 ? `Puedes añadir ${quedan} foto${quedan === 1 ? '' : 's'} más (máximo ${MAXIMO_POR_SOLICITUD}).` : `Ya hay ${MAXIMO_POR_SOLICITUD} fotos, el máximo.`
  }
  const tipoNoValido = archivos.find((archivo) => !(TIPOS_IMAGEN as readonly string[]).includes(archivo.type))
  if (tipoNoValido) return `"${tipoNoValido.name}" no es una foto JPG, PNG o WebP.`
  const grande = archivos.find((archivo) => archivo.size > TAMANO_MAXIMO)
  if (grande) return `"${grande.name}" pesa más de 5 MB.`
  return null
}

/**
 * Ruta en Storage: {cliente}/{ticket}/{id}.{ext}. La extensión sale del tipo MIME, no del nombre que
 * trae el archivo (ese lo elige quien lo sube), y el nombre es un id aleatorio.
 */
export function rutaAdjunto(clienteId: string, ticketId: string, tipo: (typeof TIPOS_IMAGEN)[number], id: string = crypto.randomUUID()): string {
  return `${clienteId}/${ticketId}/${id}.${EXTENSION[tipo]}`
}
