// Utilidades comunes de los scripts de prueba: leen la URL y la clave PUBLICABLE de .env.local
// (nunca la secreta) y abren sesiones anónimas reales, como un visitante de la demo.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

export const entorno = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((linea) => linea.startsWith('VITE_'))
    .map((linea) => [linea.slice(0, linea.indexOf('=')), linea.slice(linea.indexOf('=') + 1)]),
)

export const URL_FUNCION = `${entorno.VITE_SUPABASE_URL}/functions/v1/asistente`

/** Cliente de Supabase con una sesión anónima nueva (el trigger le crea su propio cliente de demo). */
export async function nuevaSesion() {
  const db = createClient(entorno.VITE_SUPABASE_URL, entorno.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
  const { data, error } = await db.auth.signInAnonymously()
  if (error) throw error
  const { data: perfil } = await db.from('perfiles').select('cliente_id').eq('id', data.user.id).single()
  return { db, usuarioId: data.user.id, clienteId: perfil.cliente_id, token: data.session.access_token }
}

/** Llama al asistente y devuelve el estado HTTP y el cuerpo, sea cual sea el resultado. */
export async function invocarAsistente(db, cuerpo) {
  const { data, error } = await db.functions.invoke('asistente', { body: cuerpo })
  if (!error) return { estado: 200, cuerpo: data }
  const respuesta = error.context
  return { estado: respuesta?.status ?? 0, cuerpo: respuesta ? await respuesta.json().catch(() => null) : null }
}
