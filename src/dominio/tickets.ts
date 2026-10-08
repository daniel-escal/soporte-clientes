// Vocabulario de las incidencias. Debe coincidir con los enums de la base de datos (supabase/migrations).
export const ESTADOS = ['abierto', 'en_curso', 'esperando_cliente', 'resuelto', 'cerrado'] as const
export type Estado = (typeof ESTADOS)[number]

export const PRIORIDADES = ['baja', 'media', 'alta', 'urgente'] as const
export type Prioridad = (typeof PRIORIDADES)[number]

export const NOMBRE_ESTADO: Record<Estado, string> = {
  abierto: 'Abierto',
  en_curso: 'En curso',
  esperando_cliente: 'Esperando tu respuesta',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

export const NOMBRE_PRIORIDAD: Record<Prioridad, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
}
