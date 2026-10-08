import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Button } from '@/componentes/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/componentes/ui/dialog'
import { Input } from '@/componentes/ui/input'
import { Label } from '@/componentes/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/componentes/ui/select'
import { Textarea } from '@/componentes/ui/textarea'
import { erroresPorCampo, esquemaIncidenciaManual, type CampoIncidencia } from '@/dominio/incidencia'
import { NOMBRE_PRIORIDAD, PRIORIDADES, type Prioridad } from '@/dominio/tickets'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

const AYUDA_PRIORIDAD: Record<Prioridad, string> = {
  baja: 'Cuando puedas: un cambio o una mejora.',
  media: 'Algo no va bien, pero la web funciona.',
  alta: 'Afecta a tus clientes: un formulario, una página…',
  urgente: 'La web no funciona, o hay un problema de pagos o de seguridad.',
}

// Radix Select no admite el valor vacío: "ninguna" representa "otra / no lo sé" (web_id null).
const SIN_WEB = 'ninguna'

type Props = {
  webs: Pick<Tables<'webs'>, 'id' | 'nombre'>[]
  onCreada: (ticket: Tables<'tickets'>) => void
  textoBoton?: string
  /** 'outline' cuando no es la acción principal de la pantalla (ESTETICA: un solo botón con degradado). */
  varianteBoton?: 'marca' | 'outline'
  /** Lo que el cliente ya ha contado (p. ej. en el chat), para no hacérselo repetir. */
  inicial?: { titulo?: string; descripcion?: string }
}

export function FormularioIncidencia({ webs, onCreada, textoBoton = 'Abrir incidencia', varianteBoton = 'marca', inicial }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [prioridad, setPrioridad] = useState<Prioridad>('media')
  const [web, setWeb] = useState(SIN_WEB)
  const [errores, setErrores] = useState<Partial<Record<CampoIncidencia, string>>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  function cambiarApertura(abrir: boolean) {
    setAbierto(abrir)
    if (abrir) {
      setPrioridad('media')
      setWeb(webs[0]?.id ?? SIN_WEB)
      setErrores({})
      setErrorGeneral(null)
    }
  }

  // Al corregir un campo, su error desaparece (no hay que esperar a volver a enviar).
  function limpiarError(campo: CampoIncidencia) {
    setErrores(({ [campo]: _quitado, ...resto }) => resto)
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const elemento = evento.currentTarget
    const formulario = new FormData(elemento)
    const resultado = esquemaIncidenciaManual.safeParse({
      titulo: formulario.get('titulo'),
      descripcion: formulario.get('descripcion'),
      prioridad,
      webId: web === SIN_WEB ? null : web,
    })
    if (!resultado.success) {
      setErrores(erroresPorCampo(resultado.error))
      // Llevar el foco al primer campo con error, tras pintar los mensajes.
      requestAnimationFrame(() => elemento.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
      return
    }

    setErrores({})
    setErrorGeneral(null)
    setEnviando(true)
    const { data, error } = await supabase.rpc('abrir_incidencia', {
      p_titulo: resultado.data.titulo,
      p_descripcion: resultado.data.descripcion,
      p_prioridad: resultado.data.prioridad,
      p_web_id: resultado.data.webId ?? undefined,
    })
    setEnviando(false)

    if (error || !data) {
      setErrorGeneral('No hemos podido abrir la incidencia. Prueba de nuevo en unos segundos.')
      return
    }
    onCreada(data)
    setAbierto(false)
  }

  const describir = (campo: CampoIncidencia) => (errores[campo] ? `error-${campo}` : undefined)

  return (
    <Dialog open={abierto} onOpenChange={cambiarApertura}>
      <DialogTrigger asChild>
        <Button variant={varianteBoton} size="tactil">
          <Plus data-icon="inline-start" />
          {textoBoton}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Abrir una incidencia</DialogTitle>
          <DialogDescription>Cuéntanos qué pasa. Daniel la recibe al momento y te responde aquí.</DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={enviar}
          onChange={(e) => {
            const campo = (e.target as Element).getAttribute('name')
            if (campo) limpiarError(campo as CampoIncidencia)
          }}
          className="grid gap-4"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="titulo">Qué pasa, en pocas palabras</Label>
            <Input
              id="titulo"
              name="titulo"
              maxLength={140}
              defaultValue={inicial?.titulo}
              placeholder="El formulario de contacto no envía"
              aria-invalid={Boolean(errores.titulo)}
              aria-describedby={describir('titulo')}
            />
            {errores.titulo && <MensajeError id="error-titulo">{errores.titulo}</MensajeError>}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="web">Web afectada</Label>
              <Select
                value={web}
                onValueChange={(valor) => {
                  setWeb(valor)
                  limpiarError('webId')
                }}
              >
                <SelectTrigger id="web" className="w-full" aria-invalid={Boolean(errores.webId)} aria-describedby={describir('webId')}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {webs.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.nombre}
                    </SelectItem>
                  ))}
                  <SelectItem value={SIN_WEB}>Otra / no lo sé</SelectItem>
                </SelectContent>
              </Select>
              {errores.webId && <MensajeError id="error-webId">{errores.webId}</MensajeError>}
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="prioridad">Urgencia</Label>
              <Select value={prioridad} onValueChange={(valor) => setPrioridad(valor as Prioridad)}>
                <SelectTrigger id="prioridad" className="w-full" aria-describedby="ayuda-prioridad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {NOMBRE_PRIORIDAD[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p id="ayuda-prioridad" className="text-xs text-texto-suave">
                {AYUDA_PRIORIDAD[prioridad]}
              </p>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="descripcion">Detalles</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              rows={5}
              maxLength={4000}
              defaultValue={inicial?.descripcion}
              placeholder="Desde cuándo pasa, en qué página, si ves algún mensaje de error…"
              aria-invalid={Boolean(errores.descripcion)}
              aria-describedby={describir('descripcion')}
            />
            {errores.descripcion && <MensajeError id="error-descripcion">{errores.descripcion}</MensajeError>}
          </div>

          <p role="alert" className="min-h-5 text-sm text-[var(--prioridad-urgente)]">
            {errorGeneral}
          </p>

          <DialogFooter>
            <Button type="submit" variant="marca" size="tactil" disabled={enviando}>
              {enviando ? 'Enviando…' : 'Abrir incidencia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MensajeError({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="text-sm text-[var(--prioridad-urgente)]">
      {children}
    </p>
  )
}
