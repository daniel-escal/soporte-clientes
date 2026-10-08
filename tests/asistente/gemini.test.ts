import { describe, expect, test } from 'vitest'
import { ErrorIA, crearGemini } from '../../supabase/functions/_shared/gemini.ts'

const contenidos = [{ role: 'user' as const, parts: [{ text: 'Mi web no carga' }] }]
const URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/'

function respuestaJson(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), { status, headers: { 'Content-Type': 'application/json' } })
}

function candidato(...partes: { text?: string; thought?: boolean }[]) {
  return { candidates: [{ finishReason: 'STOP', content: { role: 'model', parts: partes } }] }
}

const saturado = () => respuestaJson({ error: { code: 503, message: 'high demand', status: 'UNAVAILABLE' } }, 503)

/** fetch que nunca responde: solo termina cuando se aborta la petición. */
function colgado(_url: unknown, init?: RequestInit): Promise<Response> {
  return new Promise((_resolver, rechazar) => {
    init!.signal!.addEventListener('abort', () => rechazar(new DOMException('abortado', 'AbortError')))
  })
}

describe('crearGemini', () => {
  test('llama a generateContent del modelo con la clave en cabecera y salida JSON con esquema', async () => {
    let peticion: { url: string; init: RequestInit } | undefined
    const ia = crearGemini({
      apiKey: 'clave-de-prueba',
      modelos: ['gemini-3.8-flash'],
      fetchImpl: async (url, init) => {
        peticion = { url: String(url), init: init! }
        return respuestaJson(candidato({ text: '{"respuesta":"ok"}' }))
      },
    })

    await ia.generar({ instrucciones: 'Eres el asistente', contenidos })

    expect(peticion!.url).toBe(`${URL_BASE}gemini-3.8-flash:generateContent`)
    expect(new Headers(peticion!.init.headers).get('x-goog-api-key')).toBe('clave-de-prueba')
    expect(peticion!.url).not.toContain('clave-de-prueba') // la clave nunca va en la URL
    const cuerpo = JSON.parse(String(peticion!.init.body))
    expect(cuerpo.systemInstruction.parts[0].text).toBe('Eres el asistente')
    expect(cuerpo.contents).toEqual(contenidos)
    expect(cuerpo.generationConfig.responseMimeType).toBe('application/json')
    expect(cuerpo.generationConfig.responseJsonSchema.required).toContain('accion')
  })

  test('configuración de Gemini 3: razonamiento bajo, sin temperature y margen para el razonamiento', async () => {
    let cuerpo: { generationConfig: Record<string, unknown> } | undefined
    const ia = crearGemini({
      apiKey: 'k',
      modelos: ['m'],
      fetchImpl: async (_url, init) => {
        cuerpo = JSON.parse(String(init!.body))
        return respuestaJson(candidato({ text: '{}' }))
      },
    })
    await ia.generar({ instrucciones: 'x', contenidos })

    expect(cuerpo!.generationConfig.thinkingConfig).toEqual({ thinkingLevel: 'low' }) // 'minimal' da error en 3.8/3.7 Flash
    expect(cuerpo!.generationConfig).not.toHaveProperty('temperature')
    expect(cuerpo!.generationConfig.maxOutputTokens).toBeGreaterThanOrEqual(2048)
  })

  test('devuelve el texto del primer candidato (sin las partes de "pensamiento"), el modelo y el intento', async () => {
    const ia = crearGemini({
      apiKey: 'k',
      modelos: ['m1'],
      fetchImpl: async () => respuestaJson(candidato({ text: 'razonando…', thought: true }, { text: '{"a":' }, { text: '1}' })),
    })
    const resultado = await ia.generar({ instrucciones: 'x', contenidos })
    expect(resultado).toMatchObject({ texto: '{"a":1}', modelo: 'm1', intentos: [{ modelo: 'm1', resultado: 'ok' }] })
    expect(resultado.intentos[0].ms).toBeGreaterThanOrEqual(0)
  })

  test('si el primer modelo está saturado (503), prueba el siguiente y lo deja anotado', async () => {
    const llamados: string[] = []
    const ia = crearGemini({
      apiKey: 'k',
      modelos: ['saturado', 'libre'],
      fetchImpl: async (url) => {
        llamados.push(String(url).replace(URL_BASE, '').replace(':generateContent', ''))
        return llamados.length === 1 ? saturado() : respuestaJson(candidato({ text: '{"ok":true}' }))
      },
    })
    const resultado = await ia.generar({ instrucciones: 'x', contenidos })
    expect(resultado).toMatchObject({ texto: '{"ok":true}', modelo: 'libre' })
    expect(resultado.intentos.map((i) => [i.modelo, i.resultado])).toEqual([
      ['saturado', 'servicio'],
      ['libre', 'ok'],
    ])
    expect(llamados).toEqual(['saturado', 'libre'])
  })

  test.each([
    ['se agota la cuota (429)', () => respuestaJson({}, 429)],
    ['el modelo ya no existe (404)', () => respuestaJson({ error: { code: 404 } }, 404)],
    ['la respuesta llega cortada (MAX_TOKENS)', () => respuestaJson({ candidates: [{ finishReason: 'MAX_TOKENS', content: { parts: [{ text: '{"resp' }] } }] })],
    ['la respuesta llega vacía', () => respuestaJson({ candidates: [] })],
  ])('también cambia de modelo si %s', async (_caso, primeraRespuesta) => {
    let intento = 0
    const ia = crearGemini({
      apiKey: 'k',
      modelos: ['a', 'b'],
      fetchImpl: async () => (++intento === 1 ? primeraRespuesta() : respuestaJson(candidato({ text: '{}' }))),
    })
    await expect(ia.generar({ instrucciones: 'x', contenidos })).resolves.toMatchObject({ modelo: 'b' })
  })

  test('una petición mal formada (400) no se reintenta con otro modelo', async () => {
    let llamadas = 0
    const ia = crearGemini({
      apiKey: 'k',
      modelos: ['a', 'b'],
      fetchImpl: async () => {
        llamadas++
        return respuestaJson({ error: { message: 'Invalid JSON schema' } }, 400)
      },
    })
    await expect(ia.generar({ instrucciones: 'x', contenidos })).rejects.toMatchObject({ codigo: 'peticion' })
    expect(llamadas).toBe(1)
  })

  test('si todos los modelos fallan, lanza el error del último con todos los intentos', async () => {
    const ia = crearGemini({ apiKey: 'k', modelos: ['a', 'b', 'c'], fetchImpl: async () => saturado() })
    const error = await ia.generar({ instrucciones: 'x', contenidos }).catch((e) => e)
    expect(error).toBeInstanceOf(ErrorIA)
    expect(error.codigo).toBe('servicio')
    expect(error.message).toContain('HTTP 503')
    expect(error.intentos.map((i: { modelo: string }) => i.modelo)).toEqual(['a', 'b', 'c'])
  })

  test.each([
    [500, 'servicio'],
    [404, 'modelo'],
    [429, 'limite'],
    [400, 'peticion'],
  ])('HTTP %i → ErrorIA "%s"', async (status, codigo) => {
    const ia = crearGemini({ apiKey: 'k', modelos: ['m'], fetchImpl: async () => respuestaJson({ error: {} }, status) })
    await expect(ia.generar({ instrucciones: 'x', contenidos })).rejects.toMatchObject({ codigo })
  })

  test('respuesta sin texto → ErrorIA "vacia"', async () => {
    const ia = crearGemini({ apiKey: 'k', modelos: ['m'], fetchImpl: async () => respuestaJson({ candidates: [] }) })
    await expect(ia.generar({ instrucciones: 'x', contenidos })).rejects.toMatchObject({ codigo: 'vacia' })
  })

  test('un modelo que tarda demasiado se abandona y se prueba el siguiente', async () => {
    let intento = 0
    const ia = crearGemini({
      apiKey: 'k',
      modelos: ['lento', 'rapido'],
      timeoutPorIntentoMs: 20,
      fetchImpl: (url, init) => (++intento === 2 ? Promise.resolve(respuestaJson(candidato({ text: '{}' }))) : colgado(url, init)),
    })
    const resultado = await ia.generar({ instrucciones: 'x', contenidos })
    expect(resultado.modelo).toBe('rapido')
    expect(resultado.intentos[0]).toMatchObject({ modelo: 'lento', resultado: 'timeout' })
  })

  test('respeta el presupuesto total: no empieza otro intento si ya no queda tiempo', async () => {
    let llamadas = 0
    const ia = crearGemini({
      apiKey: 'k',
      modelos: ['a', 'b', 'c'],
      timeoutPorIntentoMs: 30,
      presupuestoMs: 40,
      fetchImpl: (url, init) => {
        llamadas++
        return colgado(url, init)
      },
    })
    const error = await ia.generar({ instrucciones: 'x', contenidos }).catch((e) => e)
    expect(error.codigo).toBe('timeout')
    expect(llamadas).toBeLessThanOrEqual(2)
  })

  test('un fallo de red → ErrorIA "servicio" con la causa técnica', async () => {
    const ia = crearGemini({
      apiKey: 'k',
      modelos: ['m'],
      fetchImpl: async () => {
        throw new TypeError('fetch failed')
      },
    })
    const error = await ia.generar({ instrucciones: 'x', contenidos }).catch((e) => e)
    expect(error.codigo).toBe('servicio')
    expect(error.message).toContain('fetch failed')
  })
})
