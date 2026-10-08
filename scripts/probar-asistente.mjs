// Prueba el asistente desplegado con una sesión anónima real (como un visitante de la demo).
// Uso:
//   node scripts/probar-asistente.mjs "Mensaje 1" "Mensaje 2" …
// Cada mensaje sigue la misma conversación. Lee la URL y la clave publicable de .env.local.
// Crea un cliente de demostración nuevo en cada ejecución (es_demo = true).
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const entorno = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((linea) => linea.startsWith('VITE_'))
    .map((linea) => [linea.slice(0, linea.indexOf('=')), linea.slice(linea.indexOf('=') + 1)]),
)

const mensajes = process.argv.slice(2)
if (mensajes.length === 0) {
  console.error('Uso: node scripts/probar-asistente.mjs "mensaje" ["otro mensaje" …]')
  process.exit(1)
}

const db = createClient(entorno.VITE_SUPABASE_URL, entorno.VITE_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false } })
const { error: errorSesion } = await db.auth.signInAnonymously()
if (errorSesion) throw errorSesion

let conversacionId
for (const mensaje of mensajes) {
  const inicio = Date.now()
  const { data, error } = await db.functions.invoke('asistente', { body: { mensaje, conversacion_id: conversacionId } })
  const ms = Date.now() - inicio
  if (error) {
    console.log(JSON.stringify({ mensaje, ms, error: error.message, estado: error.context?.status }))
    break
  }
  conversacionId = data.conversacion_id
  console.log(JSON.stringify({ mensaje, ms, ...data }))
}
