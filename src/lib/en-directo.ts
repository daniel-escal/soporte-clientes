import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

export type MensajeConversacion = Pick<Tables<'mensajes'>, 'id' | 'autor' | 'contenido' | 'creado_en'>

/** Une dos listas de mensajes sin repetir (por id) y en orden de llegada. */
export function unirMensajes(a: readonly MensajeConversacion[], b: readonly MensajeConversacion[]): MensajeConversacion[] {
  const porId = new Map([...a, ...b].map((mensaje) => [mensaje.id, mensaje]))
  return [...porId.values()].sort((x, y) => x.creado_en.localeCompare(y.creado_en))
}

/**
 * Mensajes de una conversación, en directo (Supabase Realtime, que respeta RLS: cada uno recibe
 * solo lo que puede leer). Lo que llega mientras se carga la lista no se pierde ni se duplica.
 */
export function useConversacion(conversacionId: string | null) {
  const [mensajes, setMensajes] = useState<MensajeConversacion[] | null>(null)
  const [error, setError] = useState(false)

  const anadir = useCallback((nuevos: MensajeConversacion[]) => {
    setMensajes((actuales) => unirMensajes(actuales ?? [], nuevos))
  }, [])

  useEffect(() => {
    if (!conversacionId) return
    let vigente = true
    supabase
      .from('mensajes')
      .select('id, autor, contenido, creado_en')
      .eq('conversacion_id', conversacionId)
      .order('creado_en')
      .then(({ data, error: errorCarga }) => {
        if (!vigente) return
        if (errorCarga) setError(true)
        else anadir(data)
      })

    const canal = supabase
      .channel(`conversacion-${conversacionId}`)
      .on<Tables<'mensajes'>>(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${conversacionId}` },
        ({ new: mensaje }) => anadir([{ id: mensaje.id, autor: mensaje.autor, contenido: mensaje.contenido, creado_en: mensaje.creado_en }]),
      )
      .subscribe()

    return () => {
      vigente = false
      supabase.removeChannel(canal)
    }
  }, [conversacionId, anadir])

  return { mensajes: conversacionId ? mensajes : [], error, anadir }
}

/** Cambios de un ticket en directo (estado, prioridad…), para que ambas pantallas vean lo mismo. */
export function useCambiosDelTicket(ticketId: string | undefined, alCambiar: (fila: Tables<'tickets'>) => void) {
  useEffect(() => {
    if (!ticketId) return
    const canal = supabase
      .channel(`ticket-${ticketId}`)
      .on<Tables<'tickets'>>('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'tickets', filter: `id=eq.${ticketId}` }, ({ new: fila }) =>
        alCambiar(fila),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(canal)
    }
  }, [ticketId, alCambiar])
}
