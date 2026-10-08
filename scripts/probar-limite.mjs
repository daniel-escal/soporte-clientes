// Comprueba el límite de mensajes por cliente sin gastar cuota de Gemini: con una sesión anónima real,
// llena la última hora con 30 mensajes del cliente (los escribe con su propia sesión, como permite RLS)
// y llama al asistente. Debe responder 429 con motivo "limite_cliente".
// Uso: node scripts/probar-limite.mjs
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const entorno = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((linea) => linea.startsWith('VITE_'))
    .map((linea) => [linea.slice(0, linea.indexOf('=')), linea.slice(linea.indexOf('=') + 1)]),
)

const db = createClient(entorno.VITE_SUPABASE_URL, entorno.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const { data: sesion, error: errorSesion } = await db.auth.signInAnonymously()
if (errorSesion) throw errorSesion

const { data: perfil } = await db.from('perfiles').select('cliente_id').eq('id', sesion.user.id).single()
const { data: conversacion, error: errorConversacion } = await db
  .from('conversaciones')
  .insert({ cliente_id: perfil.cliente_id, perfil_id: sesion.user.id })
  .select('id')
  .single()
if (errorConversacion) throw errorConversacion

const relleno = Array.from({ length: 30 }, (_, i) => ({ conversacion_id: conversacion.id, autor: 'cliente', contenido: `Mensaje de relleno ${i + 1}` }))
const { error: errorRelleno } = await db.from('mensajes').insert(relleno)
if (errorRelleno) throw errorRelleno

const { data, error } = await db.functions.invoke('asistente', { body: { mensaje: 'Uno más' } })
const cuerpo = error?.context ? await error.context.json() : data
console.log(JSON.stringify({ estado: error?.context?.status ?? 200, ...cuerpo }))
