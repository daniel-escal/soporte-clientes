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
import {
  CATEGORIAS_CLIENTE,
  OPCION_SOLICITUD,
  erroresPorCampo,
  esquemaSolicitudManual,
  type CampoSolicitud,
  type CategoriaCliente,
} from '@/dominio/solicitud'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

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

/** Abrir una incidencia o una petición sin el asistente (plan B). Sin urgencia: no la decide el cliente. */
export function FormularioSolicitud({ webs, onCreada, textoBoton = 'Nueva solicitud', varianteBoton = 'marca', inicial }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [categoria, setCategoria] = useState<CategoriaCliente>('otro')
  const [web, setWeb] = useState(SIN_WEB)
  const [errores, setErrores] = useState<Partial<Record<CampoSolicitud, string>>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const opcion = OPCION_SOLICITUD[categoria]

  function cambiarApertura(abrir: boolean) {
    setAbierto(abrir)
    if (abrir) {
      setCategoria('otro')
      setWeb(webs[0]?.id ?? SIN_WEB)
      setErrores({})
      setErrorGeneral(null)
    }
  }

  // Al corregir un campo, su error desaparece (no hay que esperar a volver a enviar).
  function limpiarError(campo: CampoSolicitud) {
    setErrores(({ [campo]: _quitado, ...resto }) => resto)
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const elemento = evento.currentTarget
    const formulario = new FormData(elemento)
    const resultado = esquemaSolicitudManual.safeParse({
      categoria,
      titulo: formulario.get('titulo'),
      descripcion: formulario.get('descripcion'),
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
    const { data, error } = await supabase.rpc('abrir_solicitud', {
      p_titulo: resultado.data.titulo,
      p_descripcion: resultado.data.descripcion,
      p_categoria: resultado.data.categoria,
      p_web_id: resultado.data.webId ?? undefined,
    })
    setEnviando(false)

    if (error || !data) {
      setErrorGeneral('No hemos podido enviarla. Prueba de nuevo en unos segundos.')
      return
    }
    onCreada(data)
    setAbierto(false)
  }

  const describir = (campo: CampoSolicitud) => (errores[campo] ? `error-${campo}` : undefined)

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
          <DialogTitle>Nueva solicitud</DialogTitle>
          <DialogDescription>Daniel la recibe al momento y te responde aquí.</DialogDescription>
        </DialogHeader>

        <form
          noValidate
          onSubmit={enviar}
          onChange={(e) => {
            const campo = (e.target as Element).getAttribute('name')
            if (campo) limpiarError(campo as CampoSolicitud)
          }}
          className="grid gap-4"
        >
          <fieldset className="grid gap-2">
            <legend className="mb-1.5 text-sm font-medium">¿Qué necesitas?</legend>
            {CATEGORIAS_CLIENTE.map((valor) => (
              <label
                key={valor}
                className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-superficie-alta has-checked:border-violeta has-checked:bg-superficie-alta"
              >
                <input
                  type="radio"
                  name="categoria"
                  value={valor}
                  checked={categoria === valor}
                  onChange={() => setCategoria(valor)}
                  className="mt-0.5 size-4 shrink-0 accent-[var(--violeta)]"
                />
                <span>
                  <span className="block text-sm font-medium text-texto">{OPCION_SOLICITUD[valor].nombre}</span>
                  <span className="block text-xs text-texto-suave">{OPCION_SOLICITUD[valor].ayuda}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <div className="grid gap-1.5">
            <Label htmlFor="titulo">{opcion.etiquetaTitulo}</Label>
            <Input
              id="titulo"
              name="titulo"
              maxLength={140}
              defaultValue={inicial?.titulo}
              placeholder={opcion.ejemploTitulo}
              aria-invalid={Boolean(errores.titulo)}
              aria-describedby={describir('titulo')}
            />
            {errores.titulo && <MensajeError id="error-titulo">{errores.titulo}</MensajeError>}
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="web">Web</Label>
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
            <Label htmlFor="descripcion">Detalles</Label>
            <Textarea
              id="descripcion"
              name="descripcion"
              rows={5}
              maxLength={4000}
              defaultValue={inicial?.descripcion}
              placeholder={opcion.ejemploDetalles}
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
              {enviando ? 'Enviando…' : 'Enviar a Daniel'}
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
