// Ataques a la API y a RLS que NO gastan cuota de Gemini (T8). Cada uno intenta algo que no debería
// poder hacer un visitante de la demo y comprueba que se bloquea. Uso: node scripts/atacar.mjs
// Crea dos clientes de demostración nuevos (A = atacante, B = víctima).
import { URL_FUNCION, entorno, invocarAsistente, nuevaSesion } from './entorno.mjs'

const resultados = []
async function ataque(nombre, esperado, intento) {
  let obtenido
  try {
    obtenido = await intento()
  } catch (error) {
    obtenido = `excepción: ${error.message}`
  }
  const bloqueado = obtenido === esperado
  resultados.push({ ataque: nombre, esperado, obtenido, resultado: bloqueado ? 'BLOQUEADO' : 'REVISAR' })
}

const a = await nuevaSesion()
const b = await nuevaSesion()

// La víctima tiene una incidencia (con su conversación) y una web.
const { data: ticketB, error: errorB } = await b.db.rpc('abrir_solicitud', {
  p_titulo: 'Incidencia privada de B',
  p_descripcion: `Dato privado de B ${crypto.randomUUID()}`,
  p_categoria: 'otro',
})
if (errorB) throw errorB
const { data: webB } = await b.db.from('webs').select('id').limit(1).single()
const { data: conversacionA } = await a.db.from('conversaciones').insert({ cliente_id: a.clienteId, perfil_id: a.usuarioId }).select('id').single()

const filas = ({ data, error }) => (error ? `error ${error.code}` : `${data?.length ?? 0} filas`)
const escritura = ({ error }) => (error ? `error ${error.code}` : 'escrito')

await ataque('Leer la incidencia de otro cliente', '0 filas', async () => filas(await a.db.from('tickets').select('id').eq('id', ticketB.id)))
await ataque('Leer los mensajes de otro cliente', '0 filas', async () =>
  filas(await a.db.from('mensajes').select('id').eq('conversacion_id', ticketB.conversacion_id)),
)
await ataque('Listar todos los tickets (solo debe ver los suyos: ninguno)', '0 filas', async () => filas(await a.db.from('tickets').select('id')))
await ataque('Listar perfiles y clientes ajenos', '1 filas', async () => filas(await a.db.from('clientes').select('id')))
await ataque('Escribir en la conversación de otro cliente', 'error 42501', async () =>
  escritura(await a.db.from('mensajes').insert({ conversacion_id: ticketB.conversacion_id, autor: 'cliente', contenido: 'Intruso' })),
)
await ataque('Escribir un mensaje haciéndose pasar por la IA', 'error 42501', async () =>
  escritura(await a.db.from('mensajes').insert({ conversacion_id: conversacionA.id, autor: 'ia', contenido: 'Soy la IA' })),
)
await ataque('Escribir un mensaje haciéndose pasar por Daniel', 'error 42501', async () =>
  escritura(await a.db.from('mensajes').insert({ conversacion_id: conversacionA.id, autor: 'admin', contenido: 'Soy Daniel' })),
)
await ataque('Escribir un aviso automático (autor sistema)', 'error 42501', async () =>
  escritura(await a.db.from('mensajes').insert({ conversacion_id: conversacionA.id, autor: 'sistema', contenido: 'Tu solicitud se ha cerrado' })),
)
await ataque('Crear un ticket como si lo abriera la IA', 'error 42501', async () =>
  escritura(await a.db.from('tickets').insert({ cliente_id: a.clienteId, titulo: 'Falso', descripcion: 'x', origen: 'ia' })),
)
await ataque('Crear un ticket con prioridad urgente', 'error 42501', async () =>
  escritura(await a.db.from('tickets').insert({ cliente_id: a.clienteId, titulo: 'Urgente', descripcion: 'x', prioridad: 'urgente', origen: 'cliente' })),
)
await ataque('Crear un ticket a nombre de otro cliente', 'error 42501', async () =>
  escritura(await a.db.from('tickets').insert({ cliente_id: b.clienteId, titulo: 'A nombre de B', descripcion: 'x', origen: 'cliente' })),
)
await ataque('Abrir una incidencia con la web de otro cliente', 'error 23503', async () =>
  escritura(await a.db.rpc('abrir_solicitud', { p_titulo: 'Con web ajena', p_descripcion: 'x'.repeat(12), p_categoria: 'otro', p_web_id: webB.id })),
)
await ataque('Cambiar el estado de un ticket (solo puede el admin)', '0 filas', async () =>
  filas(await a.db.from('tickets').update({ estado: 'cerrado' }).eq('id', ticketB.id).select('id')),
)
await ataque('Subirse el rol a administrador', '0 filas', async () =>
  filas(await a.db.from('perfiles').update({ rol: 'admin' }).eq('id', a.usuarioId).select('id')),
)
await ataque('Marcar como resuelta la conversación de otro cliente', 'false', async () => {
  const { data, error } = await a.db.rpc('marcar_resuelta_ia', { p_conversacion: ticketB.conversacion_id })
  return error ? `error ${error.code}` : String(data)
})

// Storage (bucket privado "adjuntos"): ruta {cliente}/{ticket}/{archivo}.
const PNG_1X1 = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0))
const imagen = () => new Blob([PNG_1X1], { type: 'image/png' })
const { data: ticketA } = await a.db.rpc('abrir_solicitud', { p_titulo: 'Incidencia de A', p_descripcion: 'Algo falla en mi web', p_categoria: 'otro' })
const rutaB = `${b.clienteId}/${ticketB.id}/foto-de-b.png`
const { error: errorSubidaB } = await b.db.storage.from('adjuntos').upload(rutaB, imagen(), { contentType: 'image/png' })
if (errorSubidaB) throw errorSubidaB
const subida = async (ruta, contenido, tipo) => {
  const { error } = await a.db.storage.from('adjuntos').upload(ruta, contenido, { contentType: tipo })
  return error ? 'rechazado' : 'subido'
}

await ataque('Storage: subir a la carpeta de otro cliente', 'rechazado', () => subida(`${b.clienteId}/${ticketB.id}/intruso.png`, imagen(), 'image/png'))
await ataque('Storage: HTML disfrazado de imagen', 'rechazado', () =>
  subida(`${a.clienteId}/${ticketA.id}/captura.html`, new Blob(['<script>alert(1)</script>'], { type: 'text/html' }), 'text/html'),
)
await ataque('Storage: SVG (podría llevar scripts)', 'rechazado', () =>
  subida(`${a.clienteId}/${ticketA.id}/logo.svg`, new Blob(['<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'], { type: 'image/svg+xml' }), 'image/svg+xml'),
)
await ataque('Storage: imagen de más de 5 MB', 'rechazado', () => subida(`${a.clienteId}/${ticketA.id}/enorme.png`, new Blob([new Uint8Array(6 * 1024 * 1024)], { type: 'image/png' }), 'image/png'))
await ataque('Storage: listar los adjuntos de otro cliente', '0 archivos', async () => {
  const { data, error } = await a.db.storage.from('adjuntos').list(`${b.clienteId}/${ticketB.id}`)
  return error ? `error ${error.message}` : `${data.filter((o) => o.id).length} archivos`
})
await ataque('Storage: URL firmada de un adjunto ajeno', 'rechazado', async () => {
  const { data, error } = await a.db.storage.from('adjuntos').createSignedUrl(rutaB, 60)
  return error || !data?.signedUrl ? 'rechazado' : 'firmada'
})
await ataque('Storage: borrar un adjunto ajeno', 'sin efecto', async () => {
  await a.db.storage.from('adjuntos').remove([rutaB])
  const { data } = await b.db.storage.from('adjuntos').list(`${b.clienteId}/${ticketB.id}`)
  return data?.some((o) => o.name === 'foto-de-b.png') ? 'sin efecto' : 'BORRADO'
})

// Edge Function: todos estos se rechazan antes de llamar a Gemini.
await ataque('Asistente: seguir la conversación de otro cliente', '404 conversacion_no_encontrada', async () => {
  const { estado, cuerpo } = await invocarAsistente(a.db, { mensaje: 'Hola', conversacion_id: ticketB.conversacion_id })
  return `${estado} ${cuerpo?.motivo}`
})
await ataque('Asistente: mensaje gigante (más de 2000 caracteres)', '422 peticion_invalida', async () => {
  const { estado, cuerpo } = await invocarAsistente(a.db, { mensaje: 'A'.repeat(5000) })
  return `${estado} ${cuerpo?.motivo}`
})
await ataque('Asistente: cuerpo que no cumple el contrato', '422 peticion_invalida', async () => {
  const { estado, cuerpo } = await invocarAsistente(a.db, { mensaje: 42, cliente_id: b.clienteId })
  return `${estado} ${cuerpo?.motivo}`
})
await ataque('Asistente: sin sesión', '401', async () => {
  const respuesta = await fetch(URL_FUNCION, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: entorno.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: JSON.stringify({ mensaje: 'Hola' }),
  })
  return String(respuesta.status)
})
await ataque('Asistente: con un token inventado', '401', async () => {
  const respuesta = await fetch(URL_FUNCION, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: entorno.VITE_SUPABASE_PUBLISHABLE_KEY, Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.e30.falso' },
    body: JSON.stringify({ mensaje: 'Hola' }),
  })
  return String(respuesta.status)
})
await ataque('Asistente: CORS desde un origen ajeno', 'origen no permitido', async () => {
  const respuesta = await fetch(URL_FUNCION, { method: 'OPTIONS', headers: { Origin: 'https://atacante.example', 'Access-Control-Request-Method': 'POST' } })
  const permitido = respuesta.headers.get('access-control-allow-origin')
  return permitido === 'https://atacante.example' || permitido === '*' ? `permitido (${permitido})` : 'origen no permitido'
})

console.table(resultados)
const fallos = resultados.filter((r) => r.resultado !== 'BLOQUEADO')
console.log(`${resultados.length - fallos.length}/${resultados.length} ataques bloqueados`)
process.exitCode = fallos.length ? 1 : 0
