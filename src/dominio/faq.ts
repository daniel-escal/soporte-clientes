import { z } from 'zod'
import { CATEGORIAS } from '@/dominio/tickets'

// Entradas de la base de conocimiento (las edita el admin; el asistente solo recibe las activas).
// Los límites coinciden con los check de la BD (faq.pregunta 3–300, faq.respuesta 3–2000).
export const esquemaEntradaFaq = z.object({
  pregunta: z
    .string()
    .trim()
    .min(3, 'Escribe la pregunta (al menos 3 caracteres).')
    .max(300, 'La pregunta no puede pasar de 300 caracteres.'),
  respuesta: z
    .string()
    .trim()
    .min(3, 'Escribe la respuesta (al menos 3 caracteres).')
    .max(2000, 'La respuesta no puede pasar de 2000 caracteres.'),
  categoria: z.enum(CATEGORIAS, 'Elige una categoría.'),
})

export type EntradaFaq = z.infer<typeof esquemaEntradaFaq>
export type CampoFaq = keyof EntradaFaq
