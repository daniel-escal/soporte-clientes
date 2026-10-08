import { FunctionsHttpError } from '@supabase/supabase-js'
import { esquemaRespuestaAsistente, type RespuestaAsistente } from '@/dominio/asistente'
import { supabase } from '@/lib/supabase'

// La función se da 20 s para Gemini; el resto es margen para la base de datos y el arranque en frío.
const TIEMPO_MAXIMO_MS = 30_000

/** Envía un mensaje al asistente. Nunca lanza: cualquier fallo vuelve como { ok: false, motivo }. */
export async function preguntarAlAsistente(mensaje: string, conversacionId: string | null): Promise<RespuestaAsistente> {
  try {
    const { data, error } = await supabase.functions.invoke('asistente', {
      // Sin conversación no se manda el campo: la función espera un uuid o nada.
      body: { mensaje, conversacion_id: conversacionId ?? undefined },
      timeout: TIEMPO_MAXIMO_MS,
    })
    // Los errores HTTP (429 por límite, 404 conversación…) traen el motivo en el cuerpo.
    const cuerpo = error instanceof FunctionsHttpError ? await error.context.json().catch(() => null) : data
    const resultado = esquemaRespuestaAsistente.safeParse(cuerpo)
    if (resultado.success) return resultado.data
    return { ok: false, motivo: error ? 'red' : 'respuesta_invalida' }
  } catch {
    return { ok: false, motivo: 'red' }
  }
}

// La conversación en curso se recuerda por pestaña (sessionStorage) y por usuario, para no mezclar
// sesiones. No es un secreto: RLS impide leer conversaciones ajenas aunque alguien cambie el id.
const clave = (usuarioId: string) => `soporte:conversacion:${usuarioId}`

export function leerConversacion(usuarioId: string): string | null {
  try {
    return sessionStorage.getItem(clave(usuarioId))
  } catch {
    return null
  }
}

export function guardarConversacion(usuarioId: string, conversacionId: string | null): void {
  try {
    if (conversacionId) sessionStorage.setItem(clave(usuarioId), conversacionId)
    else sessionStorage.removeItem(clave(usuarioId))
  } catch {
    // Sin almacenamiento (modo privado estricto): la conversación dura lo que dure la página.
  }
}
