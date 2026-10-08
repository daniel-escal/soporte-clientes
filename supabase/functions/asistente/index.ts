// Edge Function `asistente` (docs/SPEC.md, módulo asistente).
//
// Seguridad:
//   · La identidad sale del JWT verificado (el gateway lo exige: verify_jwt) y el cliente, de su perfil
//     (con RLS). Nunca del cuerpo de la petición ni de lo que diga el modelo.
//   · Lo del cliente (su mensaje, abrir conversación) se escribe con SU sesión: RLS se aplica.
//   · Lo de la IA (mensaje con autor 'ia', ticket con origen 'ia', conversación escalada) solo lo puede
//     escribir el servidor, con la clave secreta que solo existe aquí, y siempre con ids verificados:
//     el cliente y la conversación salen de la sesión del usuario, y la web se filtra contra sus webs.
//     Además, las claves foráneas compuestas de tickets impiden en la BD mezclar webs o conversaciones
//     de otro cliente.
//   · La salida del modelo se valida con zod (interpretarRespuesta) y se guarda como texto.
//   · Límites de uso por hora (la demo es pública), comprobados antes de guardar nada y de llamar a Gemini.
//   · CORS solo para los orígenes de la app.
import { createClient } from '@supabase/supabase-js'
import { esquemaPeticion, interpretarRespuesta } from '../_shared/esquema.ts'
import { ErrorIA, type Intento, crearGemini } from '../_shared/gemini.ts'
import { MAX_HISTORIAL, construirContenidos, construirInstrucciones } from '../_shared/prompt.ts'

const ORIGENES_PERMITIDOS = ['https://daniel-escal.github.io', 'http://localhost:5180', 'http://localhost:5173']
// Modelos rápidos de tres familias distintas, para que una saturación no los tumbe a todos; si uno
// falla se prueba el siguiente (todos con nivel gratuito). Medido el 08/10/2026 con thinkingLevel
// 'low': 3.6-flash respondió en ~2,3 s; 3.8-flash (el más nuevo, pensado para agentes) superó los 8 s.
const MODELOS_POR_DEFECTO = ['gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite']
// Límites por hora (spec): protegen la cuota gratuita de Gemini. Por cliente (en la demo, cada
// visitante es un cliente) y un tope global para todo el servicio.
const LIMITE_CLIENTE_POR_HORA = 30
const LIMITE_GLOBAL_POR_HORA = 200

function cabecerasCors(origen: string | null): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': origen && ORIGENES_PERMITIDOS.includes(origen) ? origen : ORIGENES_PERMITIDOS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(cuerpo: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(cuerpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
}

/** Claves de Supabase del entorno de la función (formato nuevo con respaldo al antiguo). */
function clave(variableJson: string, variableAntigua: string): string {
  const lista = Deno.env.get(variableJson)
  if (lista) {
    try {
      const valor = (JSON.parse(lista) as Record<string, string>).default
      if (valor) return valor
    } catch {
      // formato inesperado: probamos la variable antigua
    }
  }
  const antigua = Deno.env.get(variableAntigua)
  if (antigua) return antigua
  throw new Error(`Falta la variable ${variableJson}`)
}

Deno.serve(async (peticion) => {
  const cors = cabecerasCors(peticion.headers.get('origin'))
  if (peticion.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (peticion.method !== 'POST') return json({ ok: false, motivo: 'metodo' }, 405, cors)

  const autorizacion = peticion.headers.get('Authorization') ?? ''
  const jwt = autorizacion.replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ ok: false, motivo: 'sin_sesion' }, 401, cors)

  const apiKey = Deno.env.get('GEMINI_API_KEY')
  if (!apiKey) {
    console.error(JSON.stringify({ evento: 'configuracion', falta: 'GEMINI_API_KEY' }))
    return json({ ok: false, motivo: 'ia_no_configurada' }, 503, cors)
  }

  const url = Deno.env.get('SUPABASE_URL')!
  const opciones = { auth: { persistSession: false, autoRefreshToken: false } }
  // Cliente con la sesión del usuario: todo lo que lee o escribe pasa por RLS.
  const db = createClient(url, clave('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY'), {
    ...opciones,
    global: { headers: { Authorization: `Bearer ${jwt}` } },
  })
  // Cliente de servidor: SOLO para lo que escribe la IA (mensaje, ticket, escalado) con ids ya verificados,
  // y para contar el uso global.
  const servidor = createClient(url, clave('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY'), opciones)

  const { data: usuario, error: errorUsuario } = await db.auth.getUser(jwt)
  if (errorUsuario || !usuario.user) return json({ ok: false, motivo: 'sin_sesion' }, 401, cors)
  const usuarioId = usuario.user.id

  let cuerpo
  try {
    cuerpo = esquemaPeticion.parse(await peticion.json())
  } catch {
    return json({ ok: false, motivo: 'peticion_invalida' }, 422, cors)
  }

  const { data: perfil } = await db.from('perfiles').select('cliente_id').eq('id', usuarioId).maybeSingle()
  if (!perfil?.cliente_id) return json({ ok: false, motivo: 'sin_cliente' }, 403, cors)

  // Límites de uso: antes de guardar nada y de llamar a Gemini.
  const haceUnaHora = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const [usoCliente, usoGlobal] = await Promise.all([
    // Con la sesión del usuario: RLS solo deja contar los mensajes de sus conversaciones.
    db.from('mensajes').select('id', { count: 'exact', head: true }).eq('autor', 'cliente').gte('creado_en', haceUnaHora),
    servidor.from('mensajes').select('id', { count: 'exact', head: true }).eq('autor', 'ia').gte('creado_en', haceUnaHora),
  ])
  if (usoCliente.error || usoGlobal.error) return json({ ok: false, motivo: 'error_interno' }, 500, cors)
  if ((usoCliente.count ?? 0) >= LIMITE_CLIENTE_POR_HORA) return json({ ok: false, motivo: 'limite_cliente' }, 429, cors)
  if ((usoGlobal.count ?? 0) >= LIMITE_GLOBAL_POR_HORA) {
    console.error(JSON.stringify({ evento: 'limite_global', uso: usoGlobal.count }))
    return json({ ok: false, motivo: 'limite_global' }, 429, cors)
  }

  // Conversación: la indicada (RLS garantiza que es suya) o una nueva si no hay o ya terminó.
  let conversacionId: string | undefined
  if (cuerpo.conversacion_id) {
    const { data: conversacion } = await db
      .from('conversaciones')
      .select('id, estado')
      .eq('id', cuerpo.conversacion_id)
      .maybeSingle()
    if (!conversacion) return json({ ok: false, motivo: 'conversacion_no_encontrada' }, 404, cors)
    if (conversacion.estado === 'activa') conversacionId = conversacion.id
  }
  if (!conversacionId) {
    const { data: nueva, error } = await db
      .from('conversaciones')
      .insert({ cliente_id: perfil.cliente_id, perfil_id: usuarioId })
      .select('id')
      .single()
    if (error || !nueva) return json({ ok: false, motivo: 'error_interno' }, 500, cors)
    conversacionId = nueva.id
  }

  const { error: errorMensaje } = await db
    .from('mensajes')
    .insert({ conversacion_id: conversacionId, autor: 'cliente', contenido: cuerpo.mensaje })
  if (errorMensaje) return json({ ok: false, motivo: 'error_interno' }, 500, cors)

  const [webs, faq, historial] = await Promise.all([
    db.from('webs').select('id, nombre, dominio').order('nombre'),
    db.from('faq').select('id, pregunta, respuesta, categoria').eq('activa', true),
    db
      .from('mensajes')
      .select('autor, contenido')
      .eq('conversacion_id', conversacionId)
      .order('creado_en', { ascending: false })
      .limit(MAX_HISTORIAL),
  ])
  if (webs.error || faq.error || historial.error) return json({ ok: false, motivo: 'error_interno' }, 500, cors)

  const modelos = (Deno.env.get('GEMINI_MODELOS') ?? '').split(',').map((m) => m.trim()).filter(Boolean)
  const ia = crearGemini({ apiKey, modelos: modelos.length ? modelos : MODELOS_POR_DEFECTO })
  const inicio = Date.now()
  let interpretacion
  let detalleError = ''
  let modeloUsado = ''
  let intentos: Intento[] = []
  try {
    const generado = await ia.generar({
      instrucciones: construirInstrucciones({ webs: webs.data, faq: faq.data }),
      contenidos: construirContenidos([...historial.data].reverse()),
    })
    modeloUsado = generado.modelo
    intentos = generado.intentos
    interpretacion = interpretarRespuesta(generado.texto, {
      websIds: webs.data.map((w) => w.id),
      faqIds: faq.data.map((f) => f.id),
    })
  } catch (error) {
    interpretacion = { ok: false as const, motivo: error instanceof ErrorIA ? error.codigo : 'servicio' }
    detalleError = error instanceof Error ? error.message : String(error)
    if (error instanceof ErrorIA) intentos = error.intentos
  }
  const duracionMs = Date.now() - inicio
  // Logs sin contenido del cliente (privacidad): modelo, resultado y tiempo de cada intento.
  const registro = { modelo: modeloUsado, intentos, duracion_ms: duracionMs }

  if (!interpretacion.ok) {
    // El detalle técnico (código HTTP, error de red) no lleva ni la clave ni el mensaje del cliente.
    console.error(JSON.stringify({ evento: 'ia_fallo', motivo: interpretacion.motivo, detalle: detalleError, ...registro }))
    return json({ ok: false, conversacion_id: conversacionId, motivo: interpretacion.motivo }, 200, cors)
  }

  const { respuesta, accion, ticket: propuesta } = interpretacion.datos

  // abrir_ticket: el ticket se crea antes que el mensaje de la IA, para no decir "he abierto una
  // incidencia" si no se ha podido crear. Del modelo solo se toman el texto y la clasificación; la web
  // ya viene filtrada contra las del cliente (interpretarRespuesta).
  let ticket: Record<string, unknown> | null = null
  if (accion === 'abrir_ticket' && propuesta) {
    const { data, error } = await servidor
      .from('tickets')
      .insert({
        cliente_id: perfil.cliente_id,
        conversacion_id: conversacionId,
        web_id: propuesta.web_id,
        titulo: propuesta.titulo,
        descripcion: propuesta.descripcion,
        categoria: propuesta.categoria,
        prioridad: propuesta.prioridad,
        origen: 'ia',
      })
      .select('id, numero, titulo, estado, prioridad, creado_en, web_id')
      .single()
    if (error || !data) {
      console.error(JSON.stringify({ evento: 'ticket_fallo', detalle: error?.message ?? '', ...registro }))
      return json({ ok: false, conversacion_id: conversacionId, motivo: 'error_interno' }, 500, cors)
    }
    ticket = data
    // La conversación queda escalada: el siguiente mensaje del cliente abre una nueva.
    const { error: errorEscalar } = await servidor.from('conversaciones').update({ estado: 'escalada' }).eq('id', conversacionId)
    if (errorEscalar) console.error(JSON.stringify({ evento: 'escalar_fallo', detalle: errorEscalar.message }))
  }

  const { data: mensajeIa, error: errorIa } = await servidor
    .from('mensajes')
    .insert({ conversacion_id: conversacionId, autor: 'ia', contenido: respuesta })
    .select('id, creado_en')
    .single()
  if (errorIa || !mensajeIa) return json({ ok: false, motivo: 'error_interno' }, 500, cors)

  console.log(JSON.stringify({ evento: 'ia_ok', accion, ticket: ticket?.numero ?? null, ...registro }))
  return json(
    {
      ok: true,
      conversacion_id: conversacionId,
      accion,
      respuesta,
      mensaje: { id: mensajeIa.id, creado_en: mensajeIa.creado_en },
      ticket,
      duracion_ms: duracionMs,
      modelo: modeloUsado,
    },
    200,
    cors,
  )
})
