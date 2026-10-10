import { SendHorizontal } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { Button } from '@/componentes/ui/button'
import { Label } from '@/componentes/ui/label'
import { Textarea } from '@/componentes/ui/textarea'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

type Mensaje = Pick<Tables<'mensajes'>, 'id' | 'autor' | 'contenido' | 'creado_en'>

type Props = {
  conversacionId: string
  /** 'admin' en el panel y 'cliente' en el detalle del cliente. RLS solo deja escribir el propio. */
  autor: 'admin' | 'cliente'
  etiqueta: string
  placeholder: string
  onEnviado: (mensaje: Mensaje) => void
}

/** Responder en la conversación de un ticket. El texto se guarda tal cual y se pinta como texto plano. */
export function CuadroRespuesta({ conversacionId, autor, etiqueta, placeholder, onEnviado }: Props) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function enviar() {
    const contenido = texto.trim()
    if (!contenido || enviando) return
    setEnviando(true)
    setError(null)
    const { data, error: errorEnvio } = await supabase
      .from('mensajes')
      .insert({ conversacion_id: conversacionId, autor, contenido })
      .select('id, autor, contenido, creado_en')
      .single()
    setEnviando(false)
    if (errorEnvio || !data) {
      setError('No se ha podido enviar. Prueba de nuevo.')
      return
    }
    setTexto('')
    onEnviado(data)
  }

  function alEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    enviar()
  }

  function alPulsarTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
    // Ctrl/Cmd + Intro envía: en una respuesta larga, Intro solo hace un salto de línea.
    if (evento.key === 'Enter' && (evento.ctrlKey || evento.metaKey)) {
      evento.preventDefault()
      enviar()
    }
  }

  return (
    <form onSubmit={alEnviar} className="grid gap-2">
      <Label htmlFor={`respuesta-${conversacionId}`}>{etiqueta}</Label>
      <Textarea
        id={`respuesta-${conversacionId}`}
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        onKeyDown={alPulsarTecla}
        rows={3}
        maxLength={4000}
        placeholder={placeholder}
        className="min-h-20 md:text-base"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p role="alert" className="text-sm text-coral">
          {error}
        </p>
        <Button type="submit" variant="marca" size="tactil" disabled={!texto.trim() || enviando} className="ml-auto">
          <SendHorizontal data-icon="inline-start" />
          {enviando ? 'Enviando…' : 'Enviar'}
        </Button>
      </div>
    </form>
  )
}
