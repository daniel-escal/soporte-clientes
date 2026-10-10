import { z } from 'zod'
import { erroresPorCampo as erroresPorCampoGenerico } from '@/dominio/formularios'

// Formulario "abrir a mano" (plan B). El cliente solo dice si algo falla o si quiere un cambio: es lo
// que sabe decir con seguridad. La prioridad no la elige él; la fija la base de datos (incidencia →
// media, petición → baja) y luego la ajusta Daniel. Los límites coinciden con los check de la BD
// (tickets.titulo 3–140, descripcion hasta 4000); la descripción pide algo más de contexto.
export const CATEGORIAS_CLIENTE = ['otro', 'cambio_contenido', 'nuevo_componente'] as const
export type CategoriaCliente = (typeof CATEGORIAS_CLIENTE)[number]

/** Cómo se presenta cada opción en el formulario. */
export const OPCION_SOLICITUD: Record<
  CategoriaCliente,
  { nombre: string; ayuda: string; etiquetaTitulo: string; ejemploTitulo: string; ejemploDetalles: string }
> = {
  otro: {
    nombre: 'Algo no funciona',
    ayuda: 'Un error, una página que no carga, un formulario que no envía…',
    etiquetaTitulo: 'Qué pasa, en pocas palabras',
    ejemploTitulo: 'Ej.: el formulario de contacto no envía',
    ejemploDetalles: 'Desde cuándo pasa, en qué página, si ves algún mensaje de error…',
  },
  cambio_contenido: {
    nombre: 'Cambiar algo de la web',
    ayuda: 'Textos, fotos, precios, horarios o datos de contacto.',
    etiquetaTitulo: 'Qué quieres cambiar, en pocas palabras',
    ejemploTitulo: 'Ej.: cambiar el horario de verano',
    ejemploDetalles: 'Qué hay que cambiar, en qué página y cómo debe quedar…',
  },
  nuevo_componente: {
    nombre: 'Añadir algo nuevo',
    ayuda: 'Una sección, una galería, reservas, un formulario…',
    etiquetaTitulo: 'Qué quieres añadir, en pocas palabras',
    ejemploTitulo: 'Ej.: una galería con fotos del local',
    ejemploDetalles: 'Qué te gustaría añadir, dónde y para qué lo necesitas…',
  },
}

export const esquemaSolicitudManual = z.object({
  categoria: z.enum(CATEGORIAS_CLIENTE, 'Elige qué necesitas.'),
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
  webId: z.uuid('Elige una de tus webs.').nullable(),
})

export type SolicitudManual = z.infer<typeof esquemaSolicitudManual>
export type CampoSolicitud = keyof SolicitudManual

/** Primer mensaje de error de cada campo, para mostrarlo junto a él. */
export const erroresPorCampo = (error: z.ZodError) => erroresPorCampoGenerico<CampoSolicitud>(error)
