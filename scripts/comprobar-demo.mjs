// Comprobación previa de la demo: recorre lo que se enseña y dice "todo listo" o qué falla y qué hacer.
// Pensado para la noche anterior y para justo antes de la reunión.
//
// Uso:
//   node scripts/comprobar-demo.mjs            no crea tickets (no ensucia la bandeja)
//   node scripts/comprobar-demo.mjs --ticket   además abre una solicitud de prueba: comprueba el tiempo
//                                              real y dispara el aviso de Telegram. Después hay que volver a
//                                              sembrar la demo (select privado.sembrar_demo();) o esperar a
//                                              la renovación automática de las 7:00.
//
// Cada ejecución crea una sesión anónima con su propio negocio de demostración, como un visitante.
// La siguiente siembra de la demo la borra.
import { entorno, invocarAsistente, nuevaSesion } from './entorno.mjs'

const WEB = 'https://daniel-escal.github.io/soporte-clientes/'
const LENTO_MS = 8000
const conTicket = process.argv.includes('--ticket')

const resultados = []
function anotar(paso, ok, detalle, consejo) {
  resultados.push({ paso, ok, detalle, consejo })
  console.log(`${ok ? '✔' : '✘'} ${paso}${detalle ? ` · ${detalle}` : ''}`)
  if (!ok && consejo) console.log(`  → ${consejo}`)
}

async function medir(funcion) {
  const inicio = Date.now()
  const valor = await funcion()
  return { valor, ms: Date.now() - inicio }
}

// 1. La web publicada (entrada y acceso al panel)
for (const [nombre, ruta] of [
  ['Web publicada', ''],
  ['Acceso al panel', 'admin/entrar/'],
]) {
  try {
    const { valor: respuesta, ms } = await medir(() => fetch(WEB + ruta))
    const html = await respuesta.text()
    anotar(nombre, respuesta.ok && html.includes('id="root"'), `HTTP ${respuesta.status}, ${ms} ms`, 'Mira la última ejecución de GitHub Actions ("Publicar en GitHub Pages").')
  } catch (error) {
    anotar(nombre, false, error.message, 'Sin conexión o GitHub Pages caído. Usa las capturas del PDF (plan B).')
  }
}

// 2. Supabase activo: una sesión anónima como la de "Probar como cliente"
let sesion
try {
  const { valor, ms } = await medir(() => nuevaSesion())
  sesion = valor
  anotar('Supabase activo y demo abierta', true, `sesión anónima en ${ms} ms`)
} catch (error) {
  anotar(
    'Supabase activo y demo abierta',
    false,
    error.message,
    'Entra en supabase.com/dashboard: si el proyecto está pausado, pulsa "Restore" y espera un par de minutos.',
  )
}

if (sesion) {
  const { db } = sesion

  // 3. Lo que ve el visitante: sus webs de demostración y la base de conocimiento
  const { data: webs, error: errorWebs } = await db.from('webs').select('id, nombre')
  anotar('Negocio de demostración', !errorWebs && webs?.length > 0, errorWebs?.message ?? `${webs?.length ?? 0} webs`, 'El trigger que crea el negocio de demo no ha funcionado: revisa los logs de Postgres.')

  const { count: entradasFaq, error: errorFaq } = await db.from('faq').select('id', { count: 'exact', head: true })
  anotar('Base de conocimiento', !errorFaq && entradasFaq > 0, errorFaq?.message ?? `${entradasFaq} entradas activas`, 'La FAQ está vacía o inaccesible: el asistente responderá peor.')

  // 4. El asistente (Gemini) responde a una pregunta de la base de conocimiento
  const { valor: respuesta, ms } = await medir(() =>
    invocarAsistente(db, { mensaje: '¿Puedo cambiar yo mismo los textos de mi web?' }),
  )
  const okAsistente = respuesta.estado === 200 && respuesta.cuerpo?.ok === true
  anotar(
    'Asistente (IA)',
    okAsistente,
    okAsistente ? `${respuesta.cuerpo.accion}, ${ms} ms${respuesta.cuerpo.modelo ? `, ${respuesta.cuerpo.modelo}` : ''}` : `HTTP ${respuesta.estado} ${JSON.stringify(respuesta.cuerpo)}`,
    'Si es un 503 o un límite, Gemini está saturado: en la demo, enseña el plan B (formulario) o repite en un minuto.',
  )
  if (okAsistente && ms > LENTO_MS) console.log(`  ! Ha tardado más de ${LENTO_MS / 1000} s: avisa en la demo de que "está pensando".`)

  // 5. Tiempo real: el canal se conecta y, con --ticket, llega el aviso de la solicitud nueva
  const eventos = []
  const canal = db
    .channel('comprobar-demo')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tickets' }, ({ new: fila }) => eventos.push(fila))
  const estadoCanal = await new Promise((resolver) => {
    const plazo = setTimeout(() => resolver('TIMED_OUT'), 10_000)
    canal.subscribe((estado) => {
      if (estado === 'SUBSCRIBED' || estado === 'CHANNEL_ERROR' || estado === 'TIMED_OUT') {
        clearTimeout(plazo)
        resolver(estado)
      }
    })
  })
  anotar('Tiempo real', estadoCanal === 'SUBSCRIBED', estadoCanal, 'La bandeja no se actualizará sola: en la demo, recarga la página tras crear el ticket.')

  if (conTicket) {
    // Tras SUBSCRIBED, Realtime tarda un momento en empezar a enviar los cambios de la tabla (en el panel
    // real el canal lleva tiempo abierto). Sin este margen, la solicitud se crea antes y no llega.
    await new Promise((r) => setTimeout(r, 3000))
    const { data: ticket, error: errorTicket } = await db.rpc('abrir_solicitud', {
      p_titulo: 'Comprobación previa de la demo',
      p_descripcion: 'Solicitud de prueba creada por scripts/comprobar-demo.mjs.',
      p_categoria: 'otro',
      p_web_id: webs?.[0]?.id,
    })
    anotar('Abrir una solicitud', !errorTicket && Boolean(ticket), errorTicket?.message ?? `#${ticket?.numero}`, 'El formulario de la demo fallará igual: revisa la función abrir_solicitud.')

    if (ticket) {
      const inicio = Date.now()
      while (!eventos.some((fila) => fila.id === ticket.id) && Date.now() - inicio < 8000) await new Promise((r) => setTimeout(r, 200))
      const llegado = eventos.some((fila) => fila.id === ticket.id)
      anotar('La solicitud llega en directo', llegado, llegado ? `${Date.now() - inicio} ms` : 'no ha llegado en 8 s', 'Revisa que la tabla tickets siga en la publicación de Realtime.')
      console.log('  i Si ya guardaste el token del bot, en unos segundos te llegará el aviso a Telegram.')
      console.log('  i Después, renueva la demo: select privado.sembrar_demo();')
    }
  }

  await db.removeChannel(canal)
  await db.auth.signOut()
}

const fallos = resultados.filter((resultado) => !resultado.ok)
console.log('')
console.log(fallos.length === 0 ? '✔ Todo listo para la demo.' : `✘ ${fallos.length} cosa(s) por revisar antes de la demo.`)
console.log(`  (${entorno.VITE_SUPABASE_URL ? 'Supabase configurado' : 'falta .env.local'}; web: ${WEB})`)
process.exit(fallos.length === 0 ? 0 : 1)
