import { z } from 'zod'
import { PRIORIDADES } from '@/dominio/tickets'

// Formulario "abrir incidencia a mano" (plan B). Los límites coinciden con los check de la BD
// (tickets.titulo 3–140, descripcion hasta 4000); la descripción pide algo más de contexto.
export const esquemaIncidenciaManual = z.object({
  titulo: z
    .string()
    .trim()
    .min(3, 'Escribe un título de al menos 3 caracteres.')
    .max(140, 'El título no puede pasar de 140 caracteres.'),
  descripcion: z
    .string()
    .trim()
    .min(10, 'Cuéntanos un poco más: al menos 10 caracteres.')
    .max(4000, 'La descripción no puede pasar de 4000 caracteres.'),
  prioridad: z.enum(PRIORIDADES, 'Elige cómo de urgente es.'),
  webId: z.uuid('Elige una de tus webs.').nullable(),
})

export type IncidenciaManual = z.infer<typeof esquemaIncidenciaManual>
export type CampoIncidencia = keyof IncidenciaManual

/** Primer mensaje de error de cada campo, para mostrarlo junto a él. */
export function erroresPorCampo(error: z.ZodError): Partial<Record<CampoIncidencia, string>> {
  const { fieldErrors } = z.flattenError(error) as { fieldErrors: Partial<Record<CampoIncidencia, string[]>> }
  return Object.fromEntries(
    Object.entries(fieldErrors).flatMap(([campo, mensajes]) => (mensajes?.[0] ? [[campo, mensajes[0]]] : [])),
  )
}
