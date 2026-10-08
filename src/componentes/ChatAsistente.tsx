import { Headset, SendHorizontal } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { BurbujaMensaje, type MensajeChat } from '@/componentes/BurbujaMensaje'
import { FormularioIncidencia } from '@/componentes/FormularioIncidencia'
import { OrbeAsistente } from '@/componentes/OrbeAsistente'
import { TarjetaTicketCreado } from '@/componentes/TarjetaTicketCreado'
import { Button } from '@/componentes/ui/button'
import { Label } from '@/componentes/ui/label'
import { Textarea } from '@/componentes/ui/textarea'
import { borradorIncidencia, loQueHaContado, mensajeDeFallo, type TicketCreado } from '@/dominio/asistente'
import { guardarConversacion, leerConversacion, preguntarAlAsistente } from '@/lib/asistente'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

type Entrada = ({ tipo: 'mensaje' } & MensajeChat) | { tipo: 'ticket'; id: string; ticket: TicketCreado }

// Primer mensaje fijo (no se guarda). Deja claro desde el principio que quien responde es una IA.
const SALUDO: MensajeChat = {
  id: 'saludo',
  autor: 'ia',
  contenido:
    'Hola, soy el asistente de soporte de Daniel (una IA). Cuéntame qué le pasa a tu web: si puedo, te ayudo al momento y, si no, le paso a Daniel todo lo que me cuentes.',
}

const SUGERENCIAS = ['El formulario de contacto no envía', 'Mi web no carga', 'Quiero cambiar el horario de mi web']

type Props = {
  usuarioId: string
  webs: Pick<Tables<'webs'>, 'id' | 'nombre'>[]
  /** Para que la incidencia aparezca en la lista del portal sin recargar. */
  onIncidenciaCreada: (ticket: TicketCreado) => void
}

export function ChatAsistente({ usuarioId, webs, onIncidenciaCreada }: Props) {
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [conversacionId, setConversacionId] = useState<string | null>(null)
  const [texto, setTexto] = useState('')
  const [pensando, setPensando] = useState(false)
  const [fallo, setFallo] = useState<string | null>(null)
  const registro = useRef<HTMLDivElement>(null)

  function recordarConversacion(id: string | null) {
    setConversacionId(id)
    guardarConversacion(usuarioId, id)
  }

  // Al recargar la página se recupera la conversación en curso, si sigue activa.
  useEffect(() => {
    const guardada = leerConversacion(usuarioId)
    if (!guardada) return
    let vigente = true
    Promise.all([
      supabase.from('conversaciones').select('estado').eq('id', guardada).maybeSingle(),
      supabase.from('mensajes').select('id, autor, contenido, creado_en').eq('conversacion_id', guardada).order('creado_en'),
    ]).then(([conversacion, mensajes]) => {
      if (!vigente) return
      if (conversacion.data?.estado !== 'activa' || mensajes.error) {
        guardarConversacion(usuarioId, null)
        return
      }
      setConversacionId(guardada)
      setEntradas(mensajes.data.map((mensaje) => ({ tipo: 'mensaje' as const, ...mensaje })))
    })
    return () => {
      vigente = false
    }
  }, [usuarioId])

  // Lo último siempre a la vista (sin animación: respeta a quien prefiere menos movimiento).
  useEffect(() => {
    const nodo = registro.current
    if (nodo) nodo.scrollTop = nodo.scrollHeight
  }, [entradas, pensando, fallo])

  async function enviar(contenido: string) {
    const mensaje = contenido.trim()
    if (!mensaje || pensando) return
    setTexto('')
    setFallo(null)
    setEntradas((actuales) => [
      ...actuales,
      { tipo: 'mensaje', id: `local-${crypto.randomUUID()}`, autor: 'cliente', contenido: mensaje, creado_en: new Date().toISOString() },
    ])
    setPensando(true)
    const resultado = await preguntarAlAsistente(mensaje, conversacionId)
    setPensando(false)

    if (!resultado.ok) {
      // Si el mensaje llegó a guardarse, la conversación sigue; si ya no existe, la próxima empieza otra.
      if (resultado.conversacion_id) recordarConversacion(resultado.conversacion_id)
      else if (resultado.motivo === 'conversacion_no_encontrada') recordarConversacion(null)
      setFallo(mensajeDeFallo(resultado.motivo))
      return
    }

    const { ticket } = resultado
    setEntradas((actuales) => [
      ...actuales,
      { tipo: 'mensaje', id: resultado.mensaje.id, autor: 'ia', contenido: resultado.respuesta, creado_en: resultado.mensaje.creado_en },
      ...(ticket ? [{ tipo: 'ticket' as const, id: `ticket-${ticket.id}`, ticket }] : []),
    ])
    if (ticket) {
      onIncidenciaCreada(ticket)
      // La conversación queda escalada: lo siguiente que escriba empieza otra.
      recordarConversacion(null)
    } else {
      recordarConversacion(resultado.conversacion_id)
    }
  }

  // Plan B: la incidencia abierta a mano también se confirma en el chat.
  function alCrearAMano(ticket: Tables<'tickets'>) {
    setFallo(null)
    setEntradas((actuales) => [...actuales, { tipo: 'ticket', id: `ticket-${ticket.id}`, ticket }])
    onIncidenciaCreada(ticket)
    recordarConversacion(null)
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    enviar(texto)
  }

  function alPulsarTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
    // Intro envía y Mayús + Intro hace un salto de línea (sin cortar una composición de teclado IME).
    if (evento.key === 'Enter' && !evento.shiftKey && !evento.nativeEvent.isComposing) {
      evento.preventDefault()
      enviar(texto)
    }
  }

  const estadoOrbe = pensando ? 'pensando' : entradas.at(-1)?.tipo === 'ticket' ? 'listo' : 'reposo'

  return (
    <section aria-labelledby="titulo-asistente" className="overflow-hidden rounded-xl border bg-card shadow-tarjeta">
      <header className="flex items-center gap-4 border-b p-4 sm:p-5">
        <OrbeAsistente estado={estadoOrbe} className="size-14 sm:size-16" />
        <div className="min-w-0">
          <h2 id="titulo-asistente" className="text-lg font-semibold text-texto">
            Asistente de soporte
          </h2>
          <p className="text-sm text-texto-suave">Te responde al momento. Si no puede resolverlo, abre la incidencia por ti.</p>
        </div>
      </header>

      <div
        ref={registro}
        role="log"
        aria-label="Conversación con el asistente"
        tabIndex={0}
        className="max-h-[min(30rem,60svh)] overflow-y-auto p-4 focus-visible:-outline-offset-2 sm:p-5"
      >
        <ol className="grid gap-3">
          <BurbujaMensaje mensaje={SALUDO} />
          {entradas.map((entrada) =>
            entrada.tipo === 'ticket' ? (
              <TarjetaTicketCreado
                key={entrada.id}
                ticket={entrada.ticket}
                nombreWeb={webs.find((web) => web.id === entrada.ticket.web_id)?.nombre}
              />
            ) : (
              <BurbujaMensaje key={entrada.id} mensaje={entrada} />
            ),
          )}
          {pensando && (
            <li className="w-fit max-w-[85%] rounded-lg rounded-bl-sm border border-violeta/40 px-4 py-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-texto">
                <Headset aria-hidden className="size-3.5 text-texto-suave" />
                Asistente
              </p>
              <p className="mt-1.5 text-base text-texto-suave">Pensando…</p>
            </li>
          )}
        </ol>

        {entradas.length === 0 && !pensando && (
          <div className="mt-4 flex flex-wrap gap-2">
            {SUGERENCIAS.map((sugerencia) => (
              <button
                key={sugerencia}
                type="button"
                onClick={() => enviar(sugerencia)}
                className="min-h-11 rounded-full border border-borde-control px-4 text-sm text-texto-suave transition-colors hover:bg-superficie-alta hover:text-texto"
              >
                {sugerencia}
              </button>
            ))}
          </div>
        )}
      </div>

      {fallo && (
        <div
          role="alert"
          className="mx-4 mb-4 grid justify-items-start gap-3 rounded-lg border border-[color-mix(in_srgb,var(--prioridad-urgente)_45%,transparent)] p-4 sm:mx-5"
        >
          <p className="text-sm text-texto">{fallo}</p>
          <FormularioIncidencia
            webs={webs}
            onCreada={alCrearAMano}
            textoBoton="Abrir la incidencia a mano"
            varianteBoton="outline"
            inicial={borradorIncidencia(loQueHaContado(entradas))}
          />
        </div>
      )}

      <form onSubmit={alEnviar} className="flex items-end gap-2 border-t p-3 sm:p-4">
        <Label htmlFor="mensaje-asistente" className="sr-only">
          Tu mensaje para el asistente
        </Label>
        <Textarea
          id="mensaje-asistente"
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          onKeyDown={alPulsarTecla}
          rows={1}
          maxLength={2000}
          enterKeyHint="send"
          placeholder="Escribe qué le pasa a tu web…"
          // min-w-0: con field-sizing el ancho mínimo sería el del texto y desbordaría en el móvil
          className="max-h-40 min-h-11 min-w-0 resize-none md:text-base"
        />
        {/* En el móvil solo el icono, para dejar sitio al texto (el nombre accesible sigue siendo "Enviar") */}
        <Button type="submit" variant="marca" size="tactil" disabled={!texto.trim() || pensando} className="max-sm:px-3.5">
          <SendHorizontal data-icon="inline-start" />
          <span className="max-sm:sr-only">Enviar</span>
        </Button>
      </form>
    </section>
  )
}
