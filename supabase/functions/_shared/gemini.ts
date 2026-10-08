// Proveedor de IA: Gemini por su API REST (generateContent), sin SDK.
// Para cambiar a otro proveedor (Claude…) basta con otra implementación de ProveedorIA.
// La clave va en la cabecera x-goog-api-key, nunca en la URL ni en los logs.
//
// Cadena de modelos: el nivel gratuito de un modelo puede saturarse (HTTP 503 "high demand") o
// agotar su cuota (429). En ese caso, o si tarda demasiado, se prueba el siguiente modelo de la
// lista, siempre dentro de un presupuesto de tiempo total.
//
// Configuración para Gemini 3 (documentación de Google, octubre de 2026):
//   · thinkingLevel 'low': el nivel indicado para chat en tiempo real. Lo admiten todos los Flash y
//     Flash-Lite 3.x ('minimal' da error en 3.8 y 3.7 Flash). Por defecto razonan a nivel 'medium'.
//   · Sin temperature: en Gemini 3 está obsoleta y bajarla de 1.0 puede provocar bucles.
//   · maxOutputTokens incluye los tokens de razonamiento: con poco margen el JSON sale cortado.
import { ESQUEMA_JSON_RESPUESTA } from './esquema.ts'
import type { Contenido } from './prompt.ts'

export type CodigoErrorIA = 'timeout' | 'limite' | 'servicio' | 'modelo' | 'peticion' | 'vacia'

/** Un intento con un modelo de la cadena. Va a los logs: sin contenido del cliente. */
export type Intento = { modelo: string; ms: number; resultado: 'ok' | CodigoErrorIA }

export class ErrorIA extends Error {
  readonly codigo: CodigoErrorIA
  /** Todos los intentos de la cadena, para el log. */
  intentos: Intento[] = []

  constructor(codigo: CodigoErrorIA, mensaje: string) {
    super(mensaje)
    this.name = 'ErrorIA'
    this.codigo = codigo
  }
}

export type ResultadoIA = { texto: string; modelo: string; intentos: Intento[] }

export type ProveedorIA = {
  generar(args: { instrucciones: string; contenidos: Contenido[] }): Promise<ResultadoIA>
}

type OpcionesGemini = {
  apiKey: string
  modelos: string[]
  timeoutPorIntentoMs?: number
  presupuestoMs?: number
  fetchImpl?: typeof fetch
}

type RespuestaGemini = {
  candidates?: { finishReason?: string; content?: { parts?: { text?: string; thought?: boolean }[] } }[]
}

// Errores de ese modelo concreto (saturado, sin cuota, lento, retirado, respuesta inservible): otro
// modelo puede responder. 'peticion' (400) es un fallo nuestro y fallaría igual con todos.
const SE_PUEDE_REINTENTAR: CodigoErrorIA[] = ['servicio', 'limite', 'timeout', 'modelo', 'vacia']

export function crearGemini({
  apiKey,
  modelos,
  timeoutPorIntentoMs = 8_000,
  presupuestoMs = 20_000,
  fetchImpl = fetch,
}: OpcionesGemini): ProveedorIA {
  if (modelos.length === 0) throw new Error('Hace falta al menos un modelo')

  async function intentar(modelo: string, instrucciones: string, contenidos: Contenido[], timeoutMs: number): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`
    const control = new AbortController()
    const temporizador = setTimeout(() => control.abort(), timeoutMs)
    try {
      const respuesta = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: instrucciones }] },
          contents: contenidos,
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: ESQUEMA_JSON_RESPUESTA,
            thinkingConfig: { thinkingLevel: 'low' },
            maxOutputTokens: 4096,
          },
        }),
        signal: control.signal,
      })

      if (!respuesta.ok) {
        // El cuerpo de error de Gemini explica el motivo (modelo saturado, campo no admitido…).
        // No contiene la clave; se recorta para el log.
        const detalle = (await respuesta.text().catch(() => '')).slice(0, 300)
        if (respuesta.status === 429) throw new ErrorIA('limite', `${modelo}: cuota superada (HTTP 429): ${detalle}`)
        if (respuesta.status === 404) throw new ErrorIA('modelo', `${modelo}: modelo no disponible (HTTP 404): ${detalle}`)
        if (respuesta.status >= 500) throw new ErrorIA('servicio', `${modelo}: no disponible (HTTP ${respuesta.status}): ${detalle}`)
        throw new ErrorIA('peticion', `${modelo}: petición rechazada (HTTP ${respuesta.status}): ${detalle}`)
      }

      const datos = (await respuesta.json()) as RespuestaGemini
      const candidato = datos.candidates?.[0]
      // MAX_TOKENS, SAFETY…: lo que haya llegado no es una respuesta completa.
      if (candidato?.finishReason && candidato.finishReason !== 'STOP') {
        throw new ErrorIA('vacia', `${modelo}: respuesta incompleta (${candidato.finishReason})`)
      }
      const texto = (candidato?.content?.parts ?? [])
        .filter((parte) => !parte.thought)
        .map((parte) => parte.text ?? '')
        .join('')
      if (!texto.trim()) throw new ErrorIA('vacia', `${modelo}: respuesta sin texto`)
      return texto
    } catch (error) {
      if (error instanceof ErrorIA) throw error
      if (error instanceof Error && error.name === 'AbortError') throw new ErrorIA('timeout', `${modelo}: tardó más de ${timeoutMs} ms`)
      const causa = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      throw new ErrorIA('servicio', `${modelo}: no se pudo contactar (${causa.slice(0, 200)})`)
    } finally {
      clearTimeout(temporizador)
    }
  }

  return {
    async generar({ instrucciones, contenidos }) {
      const inicio = Date.now()
      const intentos: Intento[] = []
      let ultimoError: ErrorIA | undefined
      for (const modelo of modelos) {
        const restante = presupuestoMs - (Date.now() - inicio)
        if (restante <= 0) break
        const inicioIntento = Date.now()
        try {
          const texto = await intentar(modelo, instrucciones, contenidos, Math.min(timeoutPorIntentoMs, restante))
          intentos.push({ modelo, ms: Date.now() - inicioIntento, resultado: 'ok' })
          return { texto, modelo, intentos }
        } catch (error) {
          ultimoError = error instanceof ErrorIA ? error : new ErrorIA('servicio', String(error))
          intentos.push({ modelo, ms: Date.now() - inicioIntento, resultado: ultimoError.codigo })
          if (!SE_PUEDE_REINTENTAR.includes(ultimoError.codigo)) break
        }
      }
      const error = ultimoError ?? new ErrorIA('timeout', 'Sin tiempo para contactar con Gemini')
      error.intentos = intentos
      throw error
    },
  }
}
