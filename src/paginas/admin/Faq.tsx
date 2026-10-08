import { Pencil, Plus } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Interruptor } from '@/componentes/Interruptor'
import { Button } from '@/componentes/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/componentes/ui/dialog'
import { Input } from '@/componentes/ui/input'
import { Label } from '@/componentes/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/componentes/ui/select'
import { Textarea } from '@/componentes/ui/textarea'
import { esquemaEntradaFaq, type CampoFaq, type EntradaFaq } from '@/dominio/faq'
import { erroresPorCampo } from '@/dominio/formularios'
import { CATEGORIAS, NOMBRE_CATEGORIA, type Categoria } from '@/dominio/tickets'
import { supabase } from '@/lib/supabase'
import type { Tables } from '@/lib/tipos-bd'

type FilaFaq = Pick<Tables<'faq'>, 'id' | 'pregunta' | 'respuesta' | 'categoria' | 'activa'>

/** Editor de la base de conocimiento. El asistente solo recibe las entradas activas (Edge Function). */
export default function Faq() {
  const [entradas, setEntradas] = useState<FilaFaq[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<FilaFaq | 'nueva' | null>(null)

  useEffect(() => {
    let vigente = true
    supabase
      .from('faq')
      .select('id, pregunta, respuesta, categoria, activa')
      .order('categoria')
      .order('pregunta')
      .then(({ data, error: errorCarga }) => {
        if (!vigente) return
        if (errorCarga) setError('No hemos podido cargar la base de conocimiento. Prueba a recargar la página.')
        else setEntradas(data)
      })
    return () => {
      vigente = false
    }
  }, [])

  async function cambiarActiva(entrada: FilaFaq, activa: boolean) {
    setEntradas((actuales) => actuales?.map((e) => (e.id === entrada.id ? { ...e, activa } : e)) ?? null)
    const { error: errorCambio } = await supabase.from('faq').update({ activa }).eq('id', entrada.id)
    if (errorCambio) {
      setEntradas((actuales) => actuales?.map((e) => (e.id === entrada.id ? { ...e, activa: !activa } : e)) ?? null)
      setError('No se ha podido guardar el cambio. Prueba de nuevo.')
    }
  }

  function alGuardar(fila: FilaFaq) {
    setEntradas((actuales) => {
      const sinEsta = (actuales ?? []).filter((e) => e.id !== fila.id)
      return [...sinEsta, fila].sort((a, b) => a.categoria.localeCompare(b.categoria) || a.pregunta.localeCompare(b.pregunta, 'es'))
    })
    setEditando(null)
  }

  const activas = entradas?.filter((e) => e.activa).length ?? 0

  return (
    <section aria-labelledby="titulo-faq" className="rounded-xl border bg-card shadow-tarjeta">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b p-4 sm:p-5">
        <div>
          <h1 id="titulo-faq" className="text-lg font-semibold text-texto">
            Base de conocimiento{' '}
            {entradas && (
              <span className="cifras ml-1 text-sm font-normal text-texto-suave">
                {activas} de {entradas.length} activas
              </span>
            )}
          </h1>
          <p className="mt-1 text-texto-suave">Lo que el asistente usa para responder. Las entradas inactivas no se le pasan.</p>
        </div>
        <Button variant="marca" className="h-10" onClick={() => setEditando('nueva')}>
          <Plus data-icon="inline-start" />
          Nueva entrada
        </Button>
      </header>

      {error && (
        <p role="alert" className="px-5 pt-4 text-[var(--prioridad-urgente)]">
          {error}
        </p>
      )}
      {!entradas && !error && <div aria-busy="true" aria-label="Cargando" className="m-5 h-40 animate-pulse rounded-lg bg-superficie-alta" />}

      {entradas && (
        <ul className="grid grid-cols-[minmax(0,1fr)] divide-y">
          {entradas.map((entrada) => (
            <li key={entrada.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 sm:px-5">
              <div className={entrada.activa ? undefined : 'opacity-60'}>
                <p className="text-xs text-texto-tenue">{NOMBRE_CATEGORIA[entrada.categoria]}</p>
                <p className="font-medium text-texto">{entrada.pregunta}</p>
                <p className="mt-0.5 line-clamp-2 text-texto-suave">{entrada.respuesta}</p>
              </div>
              <div className="flex items-center gap-1">
                <Interruptor activo={entrada.activa} onCambio={(activa) => cambiarActiva(entrada, activa)} etiqueta={`Entrada activa: ${entrada.pregunta}`} />
                <Button variant="ghost" className="h-10" onClick={() => setEditando(entrada)} aria-label={`Editar: ${entrada.pregunta}`}>
                  <Pencil />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DialogoEntrada entrada={editando} onCerrar={() => setEditando(null)} onGuardada={alGuardar} />
    </section>
  )
}

function DialogoEntrada({
  entrada,
  onCerrar,
  onGuardada,
}: {
  entrada: FilaFaq | 'nueva' | null
  onCerrar: () => void
  onGuardada: (fila: FilaFaq) => void
}) {
  const [categoria, setCategoria] = useState<Categoria>('otro')
  const [errores, setErrores] = useState<Partial<Record<CampoFaq, string>>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const existente = entrada && entrada !== 'nueva' ? entrada : null

  // Al abrir, la categoría parte de la de la entrada (o de "otro" si es nueva).
  const [abiertaPara, setAbiertaPara] = useState<typeof entrada>(null)
  if (entrada !== abiertaPara) {
    setAbiertaPara(entrada)
    setCategoria(existente?.categoria ?? 'otro')
    setErrores({})
    setErrorGeneral(null)
  }

  async function guardar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    const datos = new FormData(evento.currentTarget)
    const resultado = esquemaEntradaFaq.safeParse({ pregunta: datos.get('pregunta'), respuesta: datos.get('respuesta'), categoria })
    if (!resultado.success) {
      setErrores(erroresPorCampo<CampoFaq>(resultado.error))
      return
    }
    setGuardando(true)
    const valores: EntradaFaq = resultado.data
    const consulta = existente
      ? supabase.from('faq').update(valores).eq('id', existente.id)
      : supabase.from('faq').insert({ ...valores, activa: true })
    const { data, error } = await consulta.select('id, pregunta, respuesta, categoria, activa').single()
    setGuardando(false)
    if (error || !data) {
      setErrorGeneral('No se ha podido guardar. Prueba de nuevo.')
      return
    }
    onGuardada(data)
  }

  return (
    <Dialog open={entrada !== null} onOpenChange={(abierto) => !abierto && onCerrar()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{existente ? 'Editar entrada' : 'Nueva entrada'}</DialogTitle>
          <DialogDescription>El asistente la usará en cuanto la guardes (si está activa).</DialogDescription>
        </DialogHeader>
        <form noValidate onSubmit={guardar} className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="faq-pregunta">Pregunta del cliente</Label>
            <Input
              id="faq-pregunta"
              name="pregunta"
              maxLength={300}
              defaultValue={existente?.pregunta}
              aria-invalid={Boolean(errores.pregunta)}
              aria-describedby={errores.pregunta ? 'error-faq-pregunta' : undefined}
            />
            {errores.pregunta && <ErrorCampo id="error-faq-pregunta">{errores.pregunta}</ErrorCampo>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="faq-respuesta">Respuesta</Label>
            <Textarea
              id="faq-respuesta"
              name="respuesta"
              rows={5}
              maxLength={2000}
              defaultValue={existente?.respuesta}
              aria-invalid={Boolean(errores.respuesta)}
              aria-describedby={errores.respuesta ? 'error-faq-respuesta' : undefined}
            />
            {errores.respuesta && <ErrorCampo id="error-faq-respuesta">{errores.respuesta}</ErrorCampo>}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="faq-categoria">Categoría</Label>
            <Select value={categoria} onValueChange={(valor) => setCategoria(valor as Categoria)}>
              <SelectTrigger id="faq-categoria" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIAS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {NOMBRE_CATEGORIA[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p role="alert" className="min-h-5 text-sm text-[var(--prioridad-urgente)]">
            {errorGeneral}
          </p>
          <DialogFooter>
            <Button type="submit" variant="marca" size="tactil" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ErrorCampo({ id, children }: { id: string; children: string }) {
  return (
    <p id={id} className="text-sm text-[var(--prioridad-urgente)]">
      {children}
    </p>
  )
}
