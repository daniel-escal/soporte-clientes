import type { Tables } from '@/lib/tipos-bd'

export type MensajeConversacion = Pick<Tables<'mensajes'>, 'id' | 'autor' | 'contenido' | 'creado_en'>

/** Une dos listas de mensajes sin repetir (por id) y en orden de llegada. */
export function unirMensajes(a: readonly MensajeConversacion[], b: readonly MensajeConversacion[]): MensajeConversacion[] {
  const porId = new Map([...a, ...b].map((mensaje) => [mensaje.id, mensaje]))
  return [...porId.values()].sort((x, y) => x.creado_en.localeCompare(y.creado_en))
}
