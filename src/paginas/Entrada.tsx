import { ArrowRight, Globe, MessageSquareText, Sparkles, TicketCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { InsigniaEstado, InsigniaPrioridad } from '@/componentes/Insignias'
import { Marca } from '@/componentes/Marca'
import { OrbeAsistente } from '@/componentes/OrbeAsistente'
import { Button } from '@/componentes/ui/button'
import { useSesion } from '@/lib/sesion'
import { supabase } from '@/lib/supabase'

const PASOS = [
  { icono: MessageSquareText, titulo: 'Cuentas qué le pasa a tu web', texto: 'Con tus palabras, desde el móvil.' },
  { icono: Sparkles, titulo: 'El asistente responde al momento', texto: 'Con la base de conocimiento, o te pregunta lo que falta.' },
  { icono: TicketCheck, titulo: 'Si no puede, abre la incidencia', texto: 'Con todo el contexto. Daniel la recibe al instante.' },
]

export default function Entrada() {
  return (
    <div className="min-h-svh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Marca />
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14 lg:pt-14">
        <section aria-labelledby="titulo-entrada">
          <p className="text-xs font-semibold tracking-[0.14em] text-azul-texto uppercase">Soporte para tu web</p>
          <h1 id="titulo-entrada" className="mt-3 text-3xl leading-tight font-semibold text-balance text-texto sm:text-4xl lg:text-[2.75rem]">
            Cuéntale el problema al asistente. Si no puede resolverlo, abre la incidencia por ti.
          </h1>
          <p className="mt-4 max-w-xl text-base text-pretty text-texto-suave">
            Un asistente con IA para los clientes de daniel-escal.es: responde al momento con la base de conocimiento y, cuando hace falta una persona,
            prepara la incidencia con todo lo necesario.
          </p>
          <AccesoDemo />
        </section>

        <VistaPrevia />
      </main>
    </div>
  )
}

/** Demo pública: cada visitante entra con una sesión anónima y recibe su propio negocio ficticio (aislado por RLS). */
function AccesoDemo() {
  const navigate = useNavigate()
  const { sesion } = useSesion()
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function probar() {
    if (sesion) return navigate('/portal')
    setEntrando(true)
    setError(null)
    const { error } = await supabase.auth.signInAnonymously()
    setEntrando(false)
    if (error) {
      setError(
        error.code === 'anonymous_provider_disabled'
          ? 'La demo pública está desactivada en este momento.'
          : 'No hemos podido abrir la demo. Prueba de nuevo en unos segundos.',
      )
      return
    }
    navigate('/portal')
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
        <Button variant="marca" size="tactil" onClick={probar} disabled={entrando}>
          {sesion ? 'Volver a mi espacio' : entrando ? 'Preparando tu demo…' : 'Probar como cliente'}
          <ArrowRight data-icon="inline-end" />
        </Button>
        <p className="text-sm text-texto-tenue">Demo con datos ficticios y sin registro.</p>
      </div>
      <p role="alert" className="mt-3 min-h-5 text-sm text-[var(--prioridad-urgente)]">
        {error}
      </p>
    </div>
  )
}

/** Composición tipo bento (ESTETICA): la conversación manda, el ticket y los pasos la acompañan. */
function VistaPrevia() {
  return (
    <div aria-label="Vista previa del producto" role="group" className="grid gap-3 sm:grid-cols-2">
      <article className="relative overflow-hidden rounded-lg border bg-card shadow-tarjeta sm:col-span-2">
        <div aria-hidden className="degradado-marca h-1" />
        <div className="flex gap-4 p-5">
          <OrbeAsistente estado="pensando" className="size-16" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <p className="text-xs font-medium text-texto-tenue">Conversación de ejemplo</p>
            <p className="ml-auto w-fit max-w-[90%] rounded-lg rounded-br-sm bg-superficie-alta px-3 py-2 text-sm text-texto">
              El formulario de contacto de mi web no envía los mensajes.
            </p>
            <p className="w-fit max-w-[90%] rounded-lg rounded-bl-sm border border-violeta/40 px-3 py-2 text-sm text-texto">
              ¿Desde cuándo te pasa? ¿Ves algún error al pulsar «Enviar»? Con eso lo dejo listo para Daniel.
            </p>
          </div>
        </div>
      </article>

      <article className="rounded-lg border bg-card p-5 shadow-tarjeta">
        <p className="cifras text-xs text-texto-tenue">Incidencia #128 · hace 2 min</p>
        <h2 className="mt-1.5 text-sm font-semibold text-texto">El formulario de contacto no envía</h2>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-texto-suave">
          <Globe aria-hidden className="size-3.5" /> Brocha &amp; Latón
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <InsigniaPrioridad prioridad="alta" />
          <InsigniaEstado estado="en_curso" />
        </div>
        <div className="mt-4 border-t pt-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-violeta-texto">
            <Sparkles aria-hidden className="size-3.5" /> Resumen del asistente
          </p>
          <p className="mt-1 text-xs text-texto-suave">
            Desde el martes, el formulario de /contacto no envía. No aparece ningún error. Pasa en el móvil y en el ordenador.
          </p>
        </div>
      </article>

      <article className="rounded-lg border bg-card p-5 shadow-tarjeta">
        <h2 className="text-sm font-semibold text-texto">Cómo funciona</h2>
        <ol className="mt-3 space-y-3">
          {PASOS.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo} className="flex gap-2.5">
              <Icono aria-hidden className="mt-0.5 size-4 shrink-0 text-azul-texto" />
              <span>
                <span className="block text-xs font-medium text-texto">{titulo}</span>
                <span className="block text-xs text-texto-suave">{texto}</span>
              </span>
            </li>
          ))}
        </ol>
      </article>
    </div>
  )
}
