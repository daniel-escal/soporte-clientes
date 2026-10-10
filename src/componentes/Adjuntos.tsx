import { ImagePlus } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { Button } from '@/componentes/ui/button'
import { MAXIMO_POR_SOLICITUD, TIPOS_IMAGEN, rutaAdjunto, validarAdjuntos } from '@/dominio/adjuntos'
import type { MensajeConversacion } from '@/dominio/mensajes'
import { supabase } from '@/lib/supabase'

type Adjunto = { ruta: string; url: string }
type TipoImagen = (typeof TIPOS_IMAGEN)[number]

type Props = {
  clienteId: string
  ticketId: string
  /** No se añaden fotos a un ticket cerrado (la política de Storage tampoco lo permite). */
  puedeSubir: boolean
  /** Al subir se deja constancia en la conversación: la otra pantalla se entera en directo. */
  conversacionId: string | null
  autor: 'cliente' | 'admin'
  /** Cambia al llegar mensajes nuevos: la otra parte puede haber subido fotos. */
  version?: number
  onMensaje?: (mensaje: MensajeConversacion) => void
}

const ERROR_CARGA = 'No se han podido cargar las fotos.'

/** Las fotos de una carpeta con URL firmadas de 1 h (el bucket es privado), o null si algo falla. */
async function leerAdjuntos(carpeta: string): Promise<Adjunto[] | null> {
  const almacen = supabase.storage.from('adjuntos')
  const { data, error } = await almacen.list(carpeta, { limit: 100, sortBy: { column: 'created_at', order: 'asc' } })
  if (error) return null
  const rutas = data.filter((objeto) => objeto.id).map((objeto) => `${carpeta}/${objeto.name}`)
  if (rutas.length === 0) return []
  const { data: firmadas, error: errorUrls } = await almacen.createSignedUrls(rutas, 3600)
  if (errorUrls || !firmadas) return null
  return firmadas.flatMap((firmada, i) => (firmada.signedUrl ? [{ ruta: rutas[i], url: firmada.signedUrl }] : []))
}

/** Fotos y capturas de una incidencia o petición. */
export function Adjuntos({ clienteId, ticketId, puedeSubir, conversacionId, autor, version = 0, onMensaje }: Props) {
  const [adjuntos, setAdjuntos] = useState<Adjunto[] | null>(null)
  const [subiendo, setSubiendo] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)
  const idTitulo = useId()
  const carpeta = `${clienteId}/${ticketId}`

  useEffect(() => {
    let vigente = true
    leerAdjuntos(carpeta).then((lista) => {
      if (!vigente) return
      if (lista) setAdjuntos(lista)
      else setError(ERROR_CARGA)
    })
    return () => {
      vigente = false
    }
  }, [carpeta, version])

  async function alElegir(evento: ChangeEvent<HTMLInputElement>) {
    const archivos = [...(evento.target.files ?? [])]
    evento.target.value = '' // para poder volver a elegir el mismo archivo
    const problema = validarAdjuntos(archivos, adjuntos?.length ?? 0)
    if (problema) return setError(problema)

    setError(null)
    setSubiendo(archivos.length)
    let subidos = 0
    for (const archivo of archivos) {
      const { error: errorSubida } = await supabase.storage
        .from('adjuntos')
        .upload(rutaAdjunto(clienteId, ticketId, archivo.type as TipoImagen), archivo, { contentType: archivo.type, upsert: false })
      if (errorSubida) {
        setError('No se ha podido subir alguna foto. Prueba de nuevo.')
        break
      }
      subidos++
    }
    setSubiendo(0)
    if (subidos === 0) return

    if (conversacionId) {
      const { data } = await supabase
        .from('mensajes')
        .insert({ conversacion_id: conversacionId, autor, contenido: subidos === 1 ? 'He añadido una foto.' : `He añadido ${subidos} fotos.` })
        .select('id, autor, contenido, creado_en')
        .single()
      if (data) onMensaje?.(data)
    }
    const lista = await leerAdjuntos(carpeta)
    if (lista) setAdjuntos(lista)
    else setError(ERROR_CARGA)
  }

  return (
    <section aria-labelledby={idTitulo} className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={idTitulo} className="text-base font-medium text-texto">
          Fotos y capturas{adjuntos && adjuntos.length > 0 && ` (${adjuntos.length})`}
        </h2>
        {puedeSubir && adjuntos && adjuntos.length < MAXIMO_POR_SOLICITUD && (
          <>
            {/* El botón abre el selector; el input queda fuera del orden de tabulación */}
            <input
              ref={entrada}
              type="file"
              accept={TIPOS_IMAGEN.join(',')}
              multiple
              tabIndex={-1}
              aria-hidden
              className="sr-only"
              onChange={alElegir}
            />
            <Button type="button" variant="outline" className="h-10" disabled={subiendo > 0} onClick={() => entrada.current?.click()}>
              <ImagePlus data-icon="inline-start" />
              {subiendo ? `Subiendo ${subiendo === 1 ? 'la foto' : `${subiendo} fotos`}…` : 'Añadir fotos'}
            </Button>
          </>
        )}
      </div>

      <p role="alert" className="text-sm text-coral empty:hidden">
        {error}
      </p>

      {adjuntos === null ? (
        !error && <div aria-busy="true" aria-label="Cargando las fotos" className="h-20 animate-pulse rounded-lg bg-superficie-alta" />
      ) : adjuntos.length === 0 ? (
        <p className="text-sm text-texto-suave">Aún no hay fotos.{puedeSubir && ' Una captura del problema o las fotos nuevas para la web ayudan mucho.'}</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {adjuntos.map((adjunto, i) => (
            <li key={adjunto.ruta}>
              <a
                href={adjunto.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block overflow-hidden rounded-lg border bg-superficie-alta transition-colors hover:border-borde-control"
              >
                <img src={adjunto.url} alt={`Foto ${i + 1} de ${adjuntos.length} (abrir en grande)`} loading="lazy" className="aspect-square w-full object-cover" />
              </a>
            </li>
          ))}
        </ul>
      )}
      {puedeSubir && <p className="text-xs text-texto-tenue">JPG, PNG o WebP · hasta 5 MB cada una · máximo {MAXIMO_POR_SOLICITUD}.</p>}
    </section>
  )
}
